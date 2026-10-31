import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getFillData, handleFillReport, startEngine } from '../../src/background/engine';
import { injectEngine } from '../../src/background/injectEngine';
import type { FillReport } from '../../src/shared/messages';
import { createApplication, getApplication } from '../../src/shared/storage/applications';
import { listAuditEntries } from '../../src/shared/storage/auditLog';
import { updateSettings } from '../../src/shared/storage/settings';
import {
  getTabSession,
  startTabSession,
  updateTabSession,
} from '../../src/shared/storage/tabSession';
import { installFakeChrome } from '../helpers/fakeChrome';

vi.mock('../../src/background/injectEngine', () => ({
  injectEngine: vi.fn(async () => undefined),
}));
// The fake chrome has no IndexedDB, and resume handling has its own tests.
vi.mock('../../src/shared/storage/resumeFile', () => ({ getResumeFile: async () => null }));

const REPORT: FillReport = {
  state: 'application_form',
  ambiguous: false,
  evidence: ['e'],
  phase: 'filled',
  pausedReason: null,
  results: [{ field: 'Email', status: 'filled', note: '', ref: 'field-0', profileKey: 'email' }],
};

async function activeSession(tabId = 1) {
  const application = await createApplication({
    jobUrl: 'https://a.example',
    applyUrl: 'https://a.example',
    origin: 'manual',
    detailsSource: 'application_page',
  });
  await startTabSession(tabId, 'manual', { applicationId: application.id, engineActive: true });
  return application;
}

describe('engine background', () => {
  beforeEach(() => {
    installFakeChrome();
    vi.mocked(injectEngine).mockReset();
    vi.mocked(injectEngine).mockResolvedValue(undefined);
  });

  it('gives fill data only to an active session, and never the AI key', async () => {
    await updateSettings({ aiApiKey: 'sk-test-secret' });
    expect(await getFillData(1)).toBeNull();
    await startTabSession(1, 'manual');
    expect(await getFillData(1)).toBeNull();
    await updateTabSession(1, { engineActive: true });
    const data = await getFillData(1);
    expect(data?.profile).toBeDefined();
    expect(JSON.stringify(data)).not.toContain('sk-test-secret');
  });

  it('records results, status and the audit log', async () => {
    const application = await activeSession();
    await handleFillReport(1, REPORT);
    const session = await getTabSession(1);
    expect(session?.fillResults).toHaveLength(1);
    expect(session?.pageState).toBe('application_form');
    expect((await getApplication(application.id))?.status).toBe('needs_review');
    const entry = (await listAuditEntries(application.id)).find(
      ({ action }) => action === 'fill_result',
    );
    expect(entry).toMatchObject({
      action: 'fill_result',
      details: { field: 'Email', status: 'filled', mappedTo: 'email' },
    });
  });

  it('marks the application as waiting on a wall, and keeps earlier results', async () => {
    const application = await activeSession();
    await handleFillReport(1, REPORT);
    await handleFillReport(1, {
      ...REPORT,
      state: 'sign_in',
      phase: 'paused',
      pausedReason: 'Sign in',
      results: [],
    });
    const session = await getTabSession(1);
    expect(session?.pausedReason).toBe('Sign in');
    expect(session?.fillResults).toHaveLength(1);
    expect((await getApplication(application.id))?.status).toBe('waiting_on_you');
  });

  it('marks asking in the session, and never marks a confirmation page submitted', async () => {
    const application = await activeSession();
    await handleFillReport(1, { ...REPORT, phase: 'asking', results: [] });
    expect((await getTabSession(1))?.awaitingFormAnswer).toBe(true);
    await handleFillReport(1, { ...REPORT, state: 'confirmation', results: [] });
    expect((await getApplication(application.id))?.status).toBe('waiting_on_you');
    expect((await getTabSession(1))?.pageState).toBe('confirmation');
  });

  it('ignores reports for a tab whose engine was never started', async () => {
    await startTabSession(1, 'hiringcafe');
    await handleFillReport(1, REPORT);
    expect((await getTabSession(1))?.fillResults).toEqual([]);
  });

  it('asks for access when injection is refused', async () => {
    await startTabSession(1, 'manual');
    vi.mocked(injectEngine).mockRejectedValue(new Error('Cannot access contents'));
    await startEngine(1);
    const session = await getTabSession(1);
    expect(session?.accessNeeded).toBe(true);
    expect(session?.pausedReason).toContain('Allow this site');
  });
});
