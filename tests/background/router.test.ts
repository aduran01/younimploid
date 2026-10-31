import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMessage } from '../../src/background/router';
import type { FillReport } from '../../src/shared/messages';
import {
  createApplication,
  getApplication,
  listApplications,
} from '../../src/shared/storage/applications';
import {
  getTabSession,
  startTabSession,
  updateTabSession,
} from '../../src/shared/storage/tabSession';
import { installFakeChrome } from '../helpers/fakeChrome';

vi.mock('../../src/background/injectEngine', () => ({
  injectEngine: vi.fn(async () => undefined),
}));

const CONTEXT = { title: 'Engineer', company: 'Acme', url: 'https://hiringcafe.com/job/a' };

describe('handleMessage', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
  });

  it('answers PING with PONG', async () => {
    expect(await handleMessage({ type: 'PING' })).toEqual({ type: 'PONG' });
  });

  it('reports no session for an untracked tab', async () => {
    expect(await handleMessage({ type: 'GET_TAB_STATE', tabId: 1 })).toEqual({
      session: null,
      application: null,
      pageUrl: null,
    });
  });

  it('starts a manual session with its own application', async () => {
    chromeFake.setFrameUrl(1, 0, 'https://careers.example.com/apply');
    const { session, application } = await handleMessage({ type: 'START_FILL', tabId: 1 });
    expect(session).toMatchObject({ origin: 'manual', engineActive: true });
    expect(application?.applyUrl).toBe('https://careers.example.com/apply');
    expect(application?.linkedTabIds).toEqual([1]);
  });

  it('links a tab to an existing tracker entry', async () => {
    const entry = await createApplication({
      jobUrl: 'https://a.example',
      applyUrl: 'https://a.example',
      origin: 'hiringcafe',
      detailsSource: 'application_page',
    });
    expect(await handleMessage({ type: 'LIST_APPLICATIONS' })).toHaveLength(1);
    const { session } = await handleMessage({
      type: 'LINK_APPLICATION',
      tabId: 9,
      applicationId: entry.id,
    });
    expect(session).toMatchObject({ applicationId: entry.id, origin: 'hiringcafe' });
    expect((await getApplication(entry.id))?.linkedTabIds).toEqual([9]);
    expect(await listApplications()).toHaveLength(1);

    await startTabSession(10, 'manual');
    await handleMessage({ type: 'LINK_APPLICATION', tabId: 10, applicationId: entry.id });
    expect((await getTabSession(10))?.applicationId).toBe(entry.id);
  });

  it('ignores a link to an entry that no longer exists', async () => {
    const { session } = await handleMessage({
      type: 'LINK_APPLICATION',
      tabId: 9,
      applicationId: 'gone',
    });
    expect(session).toBeNull();
  });

  it('relays commands to the engine and says when none is there', async () => {
    const answer = { type: 'ANSWER_FORM_QUESTION', tabId: 1, isForm: true } as const;
    expect(await handleMessage(answer)).toEqual({ ok: false });
    expect(await handleMessage({ type: 'HIGHLIGHT_FIELD', tabId: 1, ref: 'field-0' })).toEqual({
      ok: false,
    });
    expect(await handleMessage({ type: 'ENGINE_COMMAND', command: { kind: 'continue' } })).toEqual({
      ok: false,
    });
  });

  it('needs a sender tab for engine messages', async () => {
    expect(await handleMessage({ type: 'ENGINE_READY' })).toBeNull();
    const report: FillReport = {
      state: 'unknown',
      ambiguous: true,
      evidence: [],
      phase: 'asking',
      pausedReason: null,
      results: [],
    };
    expect(await handleMessage({ type: 'FILL_REPORT', report })).toEqual({ ok: false });
  });

  it('leaves an existing session alone when asked to fill', async () => {
    await startTabSession(1, 'hiringcafe');
    await updateTabSession(1, { currentStep: 'keep me' });
    const { session } = await handleMessage({ type: 'START_FILL', tabId: 1 });
    expect(session?.origin).toBe('hiringcafe');
    expect(session?.currentStep).toBe('keep me');
  });

  it('accepts job context only from a hiring.cafe tab', async () => {
    const message = { type: 'JOB_CONTEXT', context: CONTEXT } as const;
    const accepted = await handleMessage(message, {
      tab: { id: 5 } as chrome.tabs.Tab,
      url: 'https://hiringcafe.com/job/a',
    });
    expect(accepted).toEqual({ ok: true });
    expect(chromeFake.session.has('jobContext:5')).toBe(true);

    const rejected = await handleMessage(message, {
      tab: { id: 6 } as chrome.tabs.Tab,
      url: 'https://evil.example/',
    });
    expect(rejected).toEqual({ ok: false });
    expect(chromeFake.session.has('jobContext:6')).toBe(false);
  });
});
