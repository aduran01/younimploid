import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmImport, describeSummary, prepareImport } from '../../src/options/importFlow';
import { BackupError, importBackup } from '../../src/shared/storage/backup';
import { CURRENT_SCHEMA_VERSION } from '../../src/shared/storage/migrations';
import { defaultProfile, getProfile, saveProfile } from '../../src/shared/storage/profile';
import { installFakeChrome, memoryResumeStore } from '../helpers/fakeChrome';

const BACKUP = JSON.stringify({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  exportedAt: 1,
  profile: { firstName: 'Imported' },
  applications: [],
});

describe('import flow', () => {
  beforeEach(async () => {
    installFakeChrome();
    await saveProfile({ ...defaultProfile(), firstName: 'Current' });
  });

  it('overwrites nothing until the user confirms', async () => {
    const state = prepareImport(BACKUP);
    expect(state.step).toBe('confirming');
    expect((await getProfile()).firstName).toBe('Current');

    const store = memoryResumeStore();
    const next = await confirmImport(state, (json) => importBackup(json, store));
    expect(next).toEqual({ step: 'done' });
    expect((await getProfile()).firstName).toBe('Imported');
  });

  it('lists only what the backup would replace', () => {
    const state = prepareImport(BACKUP);
    if (state.step !== 'confirming') throw new Error('expected confirmation');
    expect(describeSummary(state.summary)).toEqual([
      'Your profile',
      'Your tracker (0 applications in the backup)',
    ]);
  });

  it('never asks for confirmation on an invalid file', () => {
    expect(prepareImport('not json')).toEqual({
      step: 'error',
      message: 'This file is not a valid backup.',
    });
    expect(prepareImport(JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).step).toBe(
      'error',
    );
  });

  it('runs no import unless the state is awaiting confirmation', async () => {
    const runImport = vi.fn(async () => undefined);
    const state = { step: 'idle' } as const;
    expect(await confirmImport(state, runImport)).toBe(state);
    expect(runImport).not.toHaveBeenCalled();
  });

  it('reports a failed import', async () => {
    const next = await confirmImport(prepareImport(BACKUP), async () => {
      throw new BackupError('Nope.');
    });
    expect(next).toEqual({ step: 'error', message: 'Nope.' });
  });
});
