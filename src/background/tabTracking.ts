import { findAtsSource, isSupportedSite } from '../shared/atsSites';
import { isHiringCafeUrl } from '../shared/hiringCafe';
import { createApplication, linkTab } from '../shared/storage/applications';
import { serialized } from '../shared/storage/core';
import {
  clearJobContext,
  clearOpenedFromHiringCafe,
  getOpenedFromHiringCafe,
  markOpenedFromHiringCafe,
  takeJobContext,
} from '../shared/storage/hiringCafeTabs';
import { getSettings } from '../shared/storage/settings';
import { startEngine } from './engine';
import {
  clearTabSession,
  getTabSession,
  startTabSession,
  updateTabSession,
} from '../shared/storage/tabSession';

// The user went somewhere themselves, so whatever this tab was doing is over.
const USER_TRANSITIONS = new Set([
  'typed',
  'auto_bookmark',
  'generated',
  'keyword',
  'keyword_generated',
  'start_page',
]);

interface NavigationTarget {
  tabId: number;
  sourceTabId: number;
  sourceFrameId: number;
}

interface Commit {
  tabId: number;
  frameId: number;
  url: string;
  transitionType: string;
}

// Events for one tab run in order, so a commit always sees the marker written before it.
function inTabOrder(tabId: number, task: () => Promise<void>): Promise<void> {
  return serialized(`tabTracking:${tabId}`, task);
}

async function wouldAutoStart(url: string): Promise<boolean> {
  const { autoStartOnHiringCafeTabs } = await getSettings();
  return autoStartOnHiringCafeTabs && isSupportedSite(url);
}

export function handleNavigationTarget(target: NavigationTarget): Promise<void> {
  return inTabOrder(target.tabId, async () => {
    // Asking for the source frame means an ad iframe on hiring.cafe doesn't count.
    const frame = await chrome.webNavigation
      .getFrame({ tabId: target.sourceTabId, frameId: target.sourceFrameId })
      .catch(() => null);
    if (isHiringCafeUrl(frame?.url)) {
      await markOpenedFromHiringCafe(target.tabId, target.sourceTabId);
    }
  });
}

async function startFromHiringCafe(tabId: number, sourceTabId: number, url: string): Promise<void> {
  const context = await takeJobContext(sourceTabId);
  const atsSource = findAtsSource(url);
  const application = await createApplication({
    jobUrl: context?.url || url,
    applyUrl: url,
    origin: 'hiringcafe',
    // Without job context, the application page fills in the details later.
    detailsSource: context ? 'hiringcafe' : 'application_page',
    ...(context?.title && { jobTitle: context.title }),
    ...(context?.company && { company: context.company }),
    ...(atsSource && { atsSource }),
  });
  await linkTab(application.id, tabId);
  await startTabSession(tabId, 'hiringcafe', {
    applicationId: application.id,
    pageUrl: url,
    wouldAutoStart: await wouldAutoStart(url),
  });
  await clearOpenedFromHiringCafe(tabId);
  if (await wouldAutoStart(url)) await startEngine(tabId);
}

export function handleCommit({ tabId, frameId, url, transitionType }: Commit): Promise<void> {
  if (frameId !== 0 || !/^https?:/.test(url)) return Promise.resolve();
  return inTabOrder(tabId, async () => {
    const userNavigated = USER_TRANSITIONS.has(transitionType);
    const session = await getTabSession(tabId);
    if (session) {
      if (userNavigated || isHiringCafeUrl(url)) {
        await clearTabSession(tabId);
        await clearOpenedFromHiringCafe(tabId);
      } else {
        const autoStart = session.origin === 'hiringcafe' && (await wouldAutoStart(url));
        await updateTabSession(tabId, { pageUrl: url, wouldAutoStart: autoStart });
        // Each new page gets the engine again, which is how filling resumes after a redirect.
        if (session.engineActive || autoStart) await startEngine(tabId);
      }
      return;
    }
    const opened = await getOpenedFromHiringCafe(tabId);
    if (!opened) return;
    if (userNavigated) {
      await clearOpenedFromHiringCafe(tabId);
    } else if (!isHiringCafeUrl(url)) {
      await startFromHiringCafe(tabId, opened.sourceTabId, url);
    }
  });
}

// Call synchronously at service worker startup so the listeners survive restarts.
export function registerTabTracking(): void {
  chrome.webNavigation.onCreatedNavigationTarget.addListener((details) => {
    void handleNavigationTarget(details);
  });
  chrome.webNavigation.onCommitted.addListener((details) => {
    void handleCommit(details);
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearOpenedFromHiringCafe(tabId);
    void clearJobContext(tabId);
  });
}
