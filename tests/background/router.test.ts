import { beforeEach, describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/background/router';
import { startTabSession, updateTabSession } from '../../src/shared/storage/tabSession';
import { installFakeChrome } from '../helpers/fakeChrome';

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
    });
  });

  it('starts a manual session', async () => {
    const { session } = await handleMessage({ type: 'START_MANUAL_SESSION', tabId: 1 });
    expect(session?.origin).toBe('manual');
    expect(session?.applicationId).toBeNull();
  });

  it('leaves an existing session alone when asked to start a manual one', async () => {
    await startTabSession(1, 'hiringcafe');
    await updateTabSession(1, { currentStep: 'keep me' });
    const { session } = await handleMessage({ type: 'START_MANUAL_SESSION', tabId: 1 });
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
