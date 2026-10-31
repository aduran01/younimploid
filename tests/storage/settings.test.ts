import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_FIELD_DELAY_MS,
  defaultSettings,
  getSettings,
  updateSettings,
  type SettingsPatch,
} from '../../src/shared/storage/settings';
import { installFakeChrome } from '../helpers/fakeChrome';

describe('settings', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
  });

  it('has the expected defaults', () => {
    expect(defaultSettings()).toEqual({
      autoStartOnHiringCafeTabs: true,
      autoAttachResume: true,
      fieldDelayMs: DEFAULT_FIELD_DELAY_MS,
      autoSubmit: false,
      aiProvider: null,
      aiApiKey: '',
      prompts: { tone: '', length: '', instructions: '' },
    });
  });

  it('replaces invalid stored values with defaults', async () => {
    chromeFake.local.set('settings', {
      autoAttachResume: 'yes',
      aiProvider: 'someone-else',
      fieldDelayMs: 'fast',
    });
    const settings = await getSettings();
    expect(settings.autoAttachResume).toBe(true);
    expect(settings.aiProvider).toBeNull();
    expect(settings.fieldDelayMs).toBe(DEFAULT_FIELD_DELAY_MS);
  });

  it('clamps the field delay', async () => {
    expect((await updateSettings({ fieldDelayMs: -5 })).fieldDelayMs).toBe(0);
    expect((await updateSettings({ fieldDelayMs: 99999 })).fieldDelayMs).toBe(2000);
  });

  it('keeps autoSubmit false when stored data says true', async () => {
    chromeFake.local.set('settings', { autoSubmit: true });
    expect((await getSettings()).autoSubmit).toBe(false);
  });

  it('keeps autoSubmit false when an update tries to set it', async () => {
    const forced = { autoSubmit: true } as unknown as SettingsPatch;
    expect((await updateSettings(forced)).autoSubmit).toBe(false);
    expect(chromeFake.local.get('settings')).toMatchObject({ autoSubmit: false });
  });
});
