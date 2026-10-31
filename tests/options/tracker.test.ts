import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleFillReport } from '../../src/background/engine';
import { handleMessage } from '../../src/background/router';
import {
  describeAuditEntry,
  filterApplications,
  safeLink,
  sortApplications,
  toCsv,
} from '../../src/options/tracker';
import { canMarkSubmitted, statusAfterReport } from '../../src/shared/applicationStatus';
import { maskValue } from '../../src/shared/mask';
import {
  createApplication,
  getApplication,
  listApplications,
  mergeRecords,
  updateApplication,
  type Application,
  type NewApplication,
} from '../../src/shared/storage/applications';
import { appendAuditEntry, listAuditEntries } from '../../src/shared/storage/auditLog';
import { getTabSession, startTabSession } from '../../src/shared/storage/tabSession';
import { installFakeChrome } from '../helpers/fakeChrome';

vi.mock('../../src/background/injectEngine', () => ({
  injectEngine: vi.fn(async () => undefined),
}));
vi.mock('../../src/shared/storage/resumeFile', () => ({ getResumeFile: async () => null }));

const INPUT: NewApplication = {
  jobUrl: 'https://a.example/job',
  applyUrl: 'https://a.example/apply',
  origin: 'manual',
  detailsSource: 'application_page',
};

function entry(patch: Partial<Application>): Application {
  return {
    ...INPUT,
    id: 'a',
    status: 'in_progress',
    createdAt: 1,
    updatedAt: 1,
    notes: '',
    linkedTabIds: [],
    ...patch,
  };
}

describe('status transitions', () => {
  it('follows the flow up to needs_review', () => {
    expect(statusAfterReport('in_progress', { state: 'sign_in', phase: 'paused' })).toBe(
      'waiting_on_you',
    );
    expect(
      statusAfterReport('waiting_on_you', { state: 'application_form', phase: 'running' }),
    ).toBe('in_progress');
    expect(statusAfterReport('in_progress', { state: 'application_form', phase: 'filled' })).toBe(
      'needs_review',
    );
  });

  it('never submits from a confirmation page', () => {
    expect(statusAfterReport('needs_review', { state: 'confirmation', phase: 'filled' })).toBe(
      'needs_review',
    );
  });

  it.each(['submitted', 'interview', 'offer', 'rejected', 'withdrawn'] as const)(
    'leaves %s alone',
    (status) => {
      expect(statusAfterReport(status, { state: 'sign_in', phase: 'paused' })).toBe(status);
      expect(canMarkSubmitted(status)).toBe(false);
    },
  );
});

describe('masking', () => {
  it('keeps only the last 4 characters of a long value', () => {
    expect(maskValue('sam@example.com')).toBe('••••.com');
    expect(maskValue('555-010-1234')).toBe('••••1234');
  });

  it('fully masks a value short enough to recognize', () => {
    expect(maskValue('Sam')).toBe('••••');
    expect(maskValue('Yes')).toBe('••••');
    expect(maskValue('Smith')).toBe('••••');
  });
});

describe('tracker background', () => {
  beforeEach(() => {
    installFakeChrome();
  });

  it('marks submitted only when the user says so, and only once', async () => {
    const { id } = await createApplication(INPUT);
    expect(await handleMessage({ type: 'MARK_SUBMITTED', applicationId: id })).toEqual({
      ok: true,
    });
    expect((await getApplication(id))?.status).toBe('submitted');
    expect(await handleMessage({ type: 'MARK_SUBMITTED', applicationId: id })).toEqual({
      ok: false,
    });
  });

  it('applies an edit, logs a status change, and rejects an invalid status', async () => {
    const { id } = await createApplication(INPUT);
    await handleMessage({
      type: 'UPDATE_APPLICATION',
      applicationId: id,
      edit: { status: 'interview', company: 'Acme' },
    });
    const updated = await getApplication(id);
    expect(updated).toMatchObject({
      status: 'interview',
      company: 'Acme',
      detailsSource: 'manual',
    });
    expect((await listAuditEntries(id))[0]).toMatchObject({ action: 'status_change' });
    const bad = await handleMessage({
      type: 'UPDATE_APPLICATION',
      applicationId: id,
      edit: { status: 'hired' as unknown as 'offer' },
    });
    expect(bad).toEqual({ ok: false });
    expect((await getApplication(id))?.status).toBe('interview');
  });

  it('links two entries: fields, log and tabs move to the target', async () => {
    const orphan = await createApplication({ ...INPUT, status: 'needs_review', notes: 'orphan' });
    const target = await createApplication({ ...INPUT, company: 'Acme', notes: 'main' });
    await updateApplication(orphan.id, { linkedTabIds: [7], jobTitle: 'Engineer' });
    await startTabSession(7, 'manual', { applicationId: orphan.id });
    await appendAuditEntry(orphan.id, 'fill_result', { field: 'Email' });

    const merged = await handleMessage({
      type: 'MERGE_APPLICATIONS',
      sourceId: orphan.id,
      targetId: target.id,
    });
    expect(merged).toEqual({ ok: true });

    expect(await listApplications()).toHaveLength(1);
    expect(await getApplication(target.id)).toMatchObject({
      company: 'Acme',
      jobTitle: 'Engineer',
      status: 'needs_review',
      notes: 'main\norphan',
      linkedTabIds: [7],
    });
    expect((await getTabSession(7))?.applicationId).toBe(target.id);
    expect(await listAuditEntries(target.id)).toHaveLength(1);
    expect(await listAuditEntries(orphan.id)).toHaveLength(0);
  });

  it('refuses to merge an entry into itself', async () => {
    const { id } = await createApplication(INPUT);
    expect(await handleMessage({ type: 'MERGE_APPLICATIONS', sourceId: id, targetId: id })).toEqual(
      { ok: false },
    );
    expect(await listApplications()).toHaveLength(1);
  });

  it('keeps no personal value in the audit log after a full run', async () => {
    const { id } = await createApplication(INPUT);
    await startTabSession(1, 'manual', { applicationId: id, engineActive: true });
    await handleFillReport(1, {
      state: 'application_form',
      ambiguous: false,
      evidence: [],
      phase: 'filled',
      pausedReason: null,
      jobDetails: { title: 'Engineer', company: 'Acme' },
      results: [
        {
          field: 'Email',
          status: 'filled',
          note: '',
          ref: 'field-0',
          profileKey: 'email',
          maskedValue: maskValue('sam@example.com'),
        },
      ],
    });
    await handleFillReport(1, {
      state: 'confirmation',
      ambiguous: false,
      evidence: [],
      phase: 'filled',
      pausedReason: null,
      results: [],
    });
    const log = await listAuditEntries(id);
    expect(JSON.stringify(log)).not.toContain('sam@example');
    expect(log.map((item) => describeAuditEntry(item))).toContain(
      'Email -> email (••••.com): filled',
    );
    expect(log.map(({ action }) => action)).toContain('page_state');
    expect(await getApplication(id)).toMatchObject({
      status: 'needs_review',
      jobTitle: 'Engineer',
      company: 'Acme',
    });
    await handleMessage({ type: 'MARK_SUBMITTED', applicationId: id });
    expect((await getApplication(id))?.status).toBe('submitted');
  });

  it('does not let page text replace HiringCafe details', async () => {
    const { id } = await createApplication({
      ...INPUT,
      detailsSource: 'hiringcafe',
      jobTitle: 'From HC',
    });
    await startTabSession(1, 'hiringcafe', { applicationId: id, engineActive: true });
    await handleFillReport(1, {
      state: 'application_form',
      ambiguous: false,
      evidence: [],
      phase: 'running',
      pausedReason: null,
      jobDetails: { title: 'From page', company: 'Page Co' },
      results: [],
    });
    const after = await getApplication(id);
    expect(after?.jobTitle).toBe('From HC');
    expect(after?.company).toBeUndefined();
  });
});

describe('tracker table logic', () => {
  const rows = [
    entry({ id: '1', company: 'Beta', status: 'submitted', createdAt: 5 }),
    entry({ id: '2', company: 'alpha', status: 'needs_review', createdAt: 9, notes: 'referral' }),
  ];

  it('sorts by text and by date in both directions', () => {
    expect(sortApplications(rows, 'company', false).map(({ id }) => id)).toEqual(['2', '1']);
    expect(sortApplications(rows, 'createdAt', true).map(({ id }) => id)).toEqual(['2', '1']);
    expect(sortApplications(rows, 'createdAt', false).map(({ id }) => id)).toEqual(['1', '2']);
  });

  it('filters by text and status', () => {
    expect(filterApplications(rows, 'REFERRAL', '').map(({ id }) => id)).toEqual(['2']);
    expect(filterApplications(rows, '', 'submitted').map(({ id }) => id)).toEqual(['1']);
    expect(filterApplications(rows, 'beta', 'needs_review')).toEqual([]);
  });

  it('exports escaped CSV and defuses spreadsheet formulas', () => {
    const csv = toCsv([entry({ company: 'Acme, "Inc"', jobTitle: '=HYPERLINK("x")' })]);
    const [header, row] = csv.split('\r\n');
    expect(header).toBe('Company,Title,ATS,Status,Created,Updated,Job,Apply,Notes');
    expect(row).toContain('"Acme, ""Inc"""');
    expect(row).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('only links to web addresses', () => {
    expect(safeLink('https://a.example')).toBe('https://a.example');
    expect(safeLink('javascript:alert(1)')).toBeNull();
  });

  it('merge keeps the furthest status and target values', () => {
    const patch = mergeRecords(
      entry({ status: 'offer', company: 'Old', linkedTabIds: [1] }),
      entry({ id: 'b', status: 'submitted', company: 'Kept', linkedTabIds: [1, 2] }),
    );
    expect(patch).toMatchObject({ status: 'offer', company: 'Kept', linkedTabIds: [1, 2] });
  });
});
