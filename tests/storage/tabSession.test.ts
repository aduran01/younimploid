import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTabSession,
  getTabSession,
  registerTabSessionCleanup,
  startTabSession,
  updateTabSession,
} from '../../src/shared/storage/tabSession';
import { installFakeChrome } from '../helpers/fakeChrome';

describe('tabSession', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
  });

  it('lives in session storage, not local storage', async () => {
    await startTabSession(1, 'hiringcafe');
    expect(chromeFake.session.has('tabSession:1')).toBe(true);
    expect(chromeFake.local.size).toBe(0);
  });

  it('keeps state across updates, as across redirects in a tab', async () => {
    await startTabSession(1, 'manual');
    await updateTabSession(1, { pageState: 'sign_in', pausedReason: 'sign_in' });
    await updateTabSession(1, { pageState: 'application_form', pausedReason: null });
    expect(await getTabSession(1)).toMatchObject({
      origin: 'manual',
      pageState: 'application_form',
      pausedReason: null,
    });
  });

  it('returns null for a missing or invalid session', async () => {
    expect(await getTabSession(9)).toBeNull();
    chromeFake.session.set('tabSession:9', { origin: 'elsewhere' });
    expect(await getTabSession(9)).toBeNull();
    expect(await updateTabSession(9, { pageState: 'sign_in' })).toBeNull();
  });

  it('drops invalid fill results', async () => {
    await startTabSession(1, 'manual');
    chromeFake.session.set('tabSession:1', {
      origin: 'manual',
      fillResults: [
        { field: 'email', status: 'filled' },
        { field: 'x', status: 'guessed' },
      ],
    });
    expect((await getTabSession(1))?.fillResults).toEqual([
      { field: 'email', status: 'filled', note: '', ref: null, profileKey: '' },
    ]);
  });

  it('is cleared when the tab closes, leaving other tabs alone', async () => {
    registerTabSessionCleanup();
    await startTabSession(1, 'hiringcafe');
    await startTabSession(2, 'hiringcafe');
    chromeFake.closeTab(1);
    await vi.waitFor(() => expect(chromeFake.session.has('tabSession:1')).toBe(false));
    expect(chromeFake.session.has('tabSession:2')).toBe(true);
  });

  it('clears on request', async () => {
    await startTabSession(1, 'manual');
    await clearTabSession(1);
    expect(await getTabSession(1)).toBeNull();
  });
});
