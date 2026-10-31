import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSettings } from '../../src/shared/storage/settings';
import { subscribe } from '../../src/shared/storage/subscribe';
import { installFakeChrome } from '../helpers/fakeChrome';

describe('subscribe', () => {
  beforeEach(() => {
    installFakeChrome();
  });

  it('fires for the watched key and stops after unsubscribing', async () => {
    const onChange = vi.fn();
    const stop = subscribe('local', 'settings', onChange);
    await updateSettings({ autoAttachResume: false });
    expect(onChange).toHaveBeenCalledOnce();

    stop();
    await updateSettings({ autoAttachResume: true });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('ignores other keys and areas', async () => {
    const onChange = vi.fn();
    subscribe('session', 'settings', onChange);
    subscribe('local', 'profile', onChange);
    await updateSettings({ autoAttachResume: false });
    expect(onChange).not.toHaveBeenCalled();
  });
});
