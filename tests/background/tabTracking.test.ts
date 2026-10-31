import { beforeEach, describe, expect, it, vi } from 'vitest';
import { injectEngine } from '../../src/background/injectEngine';
import { handleCommit, handleNavigationTarget } from '../../src/background/tabTracking';
import { listApplications } from '../../src/shared/storage/applications';
import { saveJobContext } from '../../src/shared/storage/hiringCafeTabs';
import { updateSettings } from '../../src/shared/storage/settings';
import { getTabSession, startTabSession } from '../../src/shared/storage/tabSession';
import { installFakeChrome } from '../helpers/fakeChrome';

vi.mock('../../src/background/injectEngine', () => ({
  injectEngine: vi.fn(async () => undefined),
}));
// Every real site is still planned, so Lever stands in for a site with a finished adapter.
vi.mock('../../src/shared/atsSites', async (original) => ({
  ...(await original<typeof import('../../src/shared/atsSites')>()),
  isSupportedSite: (url: string) => url.startsWith('https://jobs.lever.co/'),
}));

const HC_TAB = 1;
const NEW_TAB = 2;
const HC_URL = 'https://hiringcafe.com/job/engineer-abc';
const ATS_URL = 'https://jobs.lever.co/acme/123';

function commit(url: string, transitionType = 'link', tabId = NEW_TAB, frameId = 0) {
  return handleCommit({ tabId, frameId, url, transitionType });
}

function openFrom(sourceTabId = HC_TAB, sourceFrameId = 0) {
  return handleNavigationTarget({ tabId: NEW_TAB, sourceTabId, sourceFrameId });
}

describe('tab tracking', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
    chromeFake.setFrameUrl(HC_TAB, 0, HC_URL);
    vi.mocked(injectEngine).mockClear();
  });

  it('starts a session and an application once the blank tab reaches the ATS', async () => {
    await openFrom();
    await commit('about:blank');
    expect(await getTabSession(NEW_TAB)).toBeNull();

    await commit(ATS_URL);
    const session = await getTabSession(NEW_TAB);
    const [application] = await listApplications();
    expect(session?.origin).toBe('hiringcafe');
    expect(session?.pageUrl).toBe(ATS_URL);
    expect(session?.applicationId).toBe(application?.id);
    expect(application).toMatchObject({
      status: 'in_progress',
      origin: 'hiringcafe',
      applyUrl: ATS_URL,
      atsSource: 'lever',
      detailsSource: 'application_page',
      linkedTabIds: [NEW_TAB],
    });
  });

  it('handles a commit fired before the marker write has finished', async () => {
    const opening = openFrom();
    const committing = commit(ATS_URL);
    await Promise.all([opening, committing]);
    expect((await getTabSession(NEW_TAB))?.origin).toBe('hiringcafe');
  });

  it('accepts hiring.cafe as well as hiringcafe.com as the source', async () => {
    chromeFake.setFrameUrl(HC_TAB, 0, 'https://hiring.cafe/');
    await openFrom();
    await commit(ATS_URL);
    expect((await getTabSession(NEW_TAB))?.origin).toBe('hiringcafe');
  });

  it('ignores a new tab opened from another site', async () => {
    chromeFake.setFrameUrl(HC_TAB, 0, 'https://example.com/');
    await openFrom();
    await commit(ATS_URL);
    expect(await getTabSession(NEW_TAB)).toBeNull();
    expect(await listApplications()).toEqual([]);
  });

  it('ignores a new tab opened by a third-party iframe on hiring.cafe', async () => {
    chromeFake.setFrameUrl(HC_TAB, 7, 'https://ads.example/frame');
    await openFrom(HC_TAB, 7);
    await commit(ATS_URL);
    expect(await getTabSession(NEW_TAB)).toBeNull();
  });

  it('never treats a tab the user opened as a HiringCafe tab', async () => {
    await commit(ATS_URL, 'typed');
    await commit(ATS_URL, 'link');
    expect(await getTabSession(NEW_TAB)).toBeNull();
    expect(await listApplications()).toEqual([]);
  });

  it('drops the marker if the user types a URL before the tab reaches the ATS', async () => {
    await openFrom();
    await commit('https://example.com/', 'typed');
    await commit(ATS_URL);
    expect(await getTabSession(NEW_TAB)).toBeNull();
  });

  it('does not start a session for a job page opened on hiring.cafe itself', async () => {
    await openFrom();
    await commit(HC_URL);
    expect(await getTabSession(NEW_TAB)).toBeNull();
    expect(await listApplications()).toEqual([]);
  });

  it('keeps the session and application through redirects', async () => {
    await openFrom();
    await commit(ATS_URL);
    const before = await getTabSession(NEW_TAB);

    await commit('https://auth.example.com/login', 'link');
    await commit('https://acme.myworkdayjobs.com/apply', 'link');

    const after = await getTabSession(NEW_TAB);
    expect(after?.applicationId).toBe(before?.applicationId);
    expect(after?.pageUrl).toBe('https://acme.myworkdayjobs.com/apply');
    expect(await listApplications()).toHaveLength(1);
  });

  it('ignores subframe commits', async () => {
    await openFrom();
    await commit(ATS_URL);
    await commit('https://frame.example/', 'auto_subframe', NEW_TAB, 3);
    expect((await getTabSession(NEW_TAB))?.pageUrl).toBe(ATS_URL);
  });

  it('ends the session when the user navigates away, keeping the application', async () => {
    await openFrom();
    await commit(ATS_URL);
    await commit('https://example.com/', 'typed');
    expect(await getTabSession(NEW_TAB)).toBeNull();
    expect(await listApplications()).toHaveLength(1);
  });

  it('ends the session when the tab returns to hiring.cafe', async () => {
    await openFrom();
    await commit(ATS_URL);
    await commit(HC_URL);
    expect(await getTabSession(NEW_TAB)).toBeNull();
  });

  it('flags auto-start only on supported sites with the setting on', async () => {
    await openFrom();
    await commit(ATS_URL);
    expect((await getTabSession(NEW_TAB))?.wouldAutoStart).toBe(true);

    await commit('https://careers.example.com/apply');
    expect((await getTabSession(NEW_TAB))?.wouldAutoStart).toBe(false);

    await updateSettings({ autoStartOnHiringCafeTabs: false });
    await commit(ATS_URL);
    expect((await getTabSession(NEW_TAB))?.wouldAutoStart).toBe(false);
  });

  it('starts the engine only on a supported site with auto-start on', async () => {
    await updateSettings({ autoStartOnHiringCafeTabs: false });
    await openFrom();
    await commit(ATS_URL);
    expect(injectEngine).not.toHaveBeenCalled();

    await updateSettings({ autoStartOnHiringCafeTabs: true });
    await commit(ATS_URL);
    expect(injectEngine).toHaveBeenCalledWith(NEW_TAB);
    expect((await getTabSession(NEW_TAB))?.engineActive).toBe(true);
  });

  it('does not auto-start on an unsupported site', async () => {
    await openFrom();
    await commit('https://careers.example.com/apply');
    expect(injectEngine).not.toHaveBeenCalled();
  });

  it('brings the engine back on each navigation once started', async () => {
    await startTabSession(NEW_TAB, 'manual', { engineActive: true });
    await commit('https://careers.example.com/step2');
    expect(injectEngine).toHaveBeenCalledWith(NEW_TAB);
  });

  it('never starts the engine on a manual session by itself', async () => {
    await startTabSession(NEW_TAB, 'manual');
    await commit(ATS_URL);
    expect(injectEngine).not.toHaveBeenCalled();
  });

  it('never flags auto-start on a manual session', async () => {
    await startTabSession(NEW_TAB, 'manual');
    await commit(ATS_URL);
    expect((await getTabSession(NEW_TAB))?.wouldAutoStart).toBe(false);
  });

  it('uses job context from the Apply click and consumes it', async () => {
    await saveJobContext(HC_TAB, { title: 'Engineer', company: 'Acme', url: HC_URL });
    await openFrom();
    await commit(ATS_URL);
    const [application] = await listApplications();
    expect(application).toMatchObject({
      jobTitle: 'Engineer',
      company: 'Acme',
      jobUrl: HC_URL,
      detailsSource: 'hiringcafe',
    });
    expect(chromeFake.session.has(`jobContext:${HC_TAB}`)).toBe(false);
  });
});
