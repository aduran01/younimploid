import { beforeEach, describe, expect, it } from 'vitest';
import { createApplication, listApplications } from '../../src/shared/storage/applications';
import { BackupError, exportBackup, importBackup } from '../../src/shared/storage/backup';
import { CURRENT_SCHEMA_VERSION } from '../../src/shared/storage/migrations';
import { getProfile, saveProfile, defaultProfile } from '../../src/shared/storage/profile';
import { getResumeFile, saveResumeFile } from '../../src/shared/storage/resumeFile';
import { getSettings, updateSettings } from '../../src/shared/storage/settings';
import { startTabSession } from '../../src/shared/storage/tabSession';
import { installFakeChrome, memoryResumeStore } from '../helpers/fakeChrome';

const KEY = 'sk-test-secret';

describe('backup', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(async () => {
    chromeFake = installFakeChrome();
    await updateSettings({ aiApiKey: KEY });
  });

  it('excludes the AI key and resume by default', async () => {
    const store = memoryResumeStore();
    await saveResumeFile(new Blob(['resume-body']), 'resume.pdf', store);
    const json = await exportBackup({}, store);
    expect(json).not.toContain(KEY);
    expect(JSON.parse(json)).not.toHaveProperty('resume');
    expect(JSON.parse(json).settings).not.toHaveProperty('aiApiKey');
  });

  it('includes them only when opted in', async () => {
    const store = memoryResumeStore();
    await saveResumeFile(new Blob(['resume-body'], { type: 'application/pdf' }), 'r.pdf', store);
    const json = await exportBackup({ includeAiKey: true, includeResume: true }, store);
    expect(json).toContain(KEY);

    const restored = memoryResumeStore();
    await importBackup(json, restored);
    const file = await getResumeFile(restored);
    expect(file?.filename).toBe('r.pdf');
    expect(await file?.blob.text()).toBe('resume-body');
  });

  it('never exports per-tab state', async () => {
    await startTabSession(1, 'manual');
    expect(await exportBackup({}, memoryResumeStore())).not.toContain('tabSession');
  });

  it('restores data and keeps the stored key when the backup has none', async () => {
    const profile = defaultProfile();
    profile.firstName = 'Test';
    await saveProfile(profile);
    await createApplication({
      jobUrl: 'https://example.com/job',
      applyUrl: 'https://example.com/apply',
      origin: 'manual',
      detailsSource: 'manual',
    });
    const store = memoryResumeStore();
    const json = await exportBackup({}, store);

    chromeFake.local.delete('profile');
    chromeFake.local.delete('applications');
    await importBackup(json, store);

    expect((await getProfile()).firstName).toBe('Test');
    expect(await listApplications()).toHaveLength(1);
    expect((await getSettings()).aiApiKey).toBe(KEY);
  });

  it('keeps stored data for sections a backup leaves out', async () => {
    const profile = defaultProfile();
    profile.firstName = 'Keep';
    await saveProfile(profile);
    await importBackup(
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, settings: {} }),
      memoryResumeStore(),
    );
    expect((await getProfile()).firstName).toBe('Keep');
  });

  it('cannot turn on autoSubmit through import', async () => {
    const backup = JSON.stringify({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      settings: { autoSubmit: true },
    });
    await importBackup(backup, memoryResumeStore());
    expect((await getSettings()).autoSubmit).toBe(false);
    expect(chromeFake.local.get('settings')).toMatchObject({ autoSubmit: false });
  });

  it.each([
    ['invalid JSON', 'not json'],
    ['the wrong shape', '[]'],
    ['no version', '{}'],
    ['a newer version', JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })],
  ])('rejects %s and changes nothing', async (_name, json) => {
    const before = await getSettings();
    await expect(importBackup(json, memoryResumeStore())).rejects.toBeInstanceOf(BackupError);
    expect(await getSettings()).toEqual(before);
  });
});
