import { beforeEach, describe, expect, it } from 'vitest';
import {
  createApplication,
  getApplication,
  linkTab,
  listApplications,
  updateApplication,
  type NewApplication,
} from '../../src/shared/storage/applications';
import { installFakeChrome } from '../helpers/fakeChrome';

const input: NewApplication = {
  jobUrl: 'https://example.com/job',
  applyUrl: 'https://example.com/apply',
  origin: 'hiringcafe',
  detailsSource: 'application_page',
};

describe('applications', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
  });

  it('starts empty and creates with defaults', async () => {
    expect(await listApplications()).toEqual([]);
    const created = await createApplication(input);
    expect(created.status).toBe('in_progress');
    expect(created.notes).toBe('');
    expect(await getApplication(created.id)).toEqual(created);
  });

  it('keeps every record when created concurrently', async () => {
    await Promise.all([createApplication(input), createApplication(input)]);
    expect(await listApplications()).toHaveLength(2);
  });

  it('drops invalid records on read', async () => {
    const valid = await createApplication(input);
    const stored = chromeFake.local.get('applications') as unknown[];
    chromeFake.local.set('applications', [...stored, { id: 'x', status: 'nonsense' }, 'bad']);
    expect((await listApplications()).map((application) => application.id)).toEqual([valid.id]);
  });

  it('rejects an invalid status update and leaves the record alone', async () => {
    const created = await createApplication(input);
    const bad = await updateApplication(created.id, {
      status: 'hired' as unknown as 'submitted',
    });
    expect(bad).toBeNull();
    expect((await getApplication(created.id))?.status).toBe('in_progress');
  });

  it('keeps every link when tabs are linked concurrently', async () => {
    const created = await createApplication(input);
    await Promise.all([linkTab(created.id, 1), linkTab(created.id, 2)]);
    expect((await getApplication(created.id))?.linkedTabIds).toEqual([1, 2]);
  });

  it('links a tab only once', async () => {
    const created = await createApplication(input);
    await linkTab(created.id, 7);
    const linked = await linkTab(created.id, 7);
    expect(linked?.linkedTabIds).toEqual([7]);
  });
});
