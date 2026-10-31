import { ORIGINS, type Origin } from './applications';
import { asArray, asOneOf, asString, isRecord, read, remove, serialized, write } from './core';

const PAGE_STATES = [
  'unknown',
  'job_description',
  'application_form',
  'sign_in',
  'create_account',
  'verification',
  'captcha',
  'confirmation',
] as const;
export type PageState = (typeof PAGE_STATES)[number];

const FILL_STATUSES = [
  'filled',
  'prefilled',
  'missing_required',
  'enter_manual',
  'needs_answer',
  'site_differs',
  'failed',
] as const;
export type FillStatus = (typeof FILL_STATUSES)[number];

export interface FillResult {
  field: string;
  status: FillStatus;
  note: string;
  // Finds the field on the current page. Null once it can't be located.
  ref: string | null;
  profileKey: string;
}

export interface TabSession {
  origin: Origin;
  applicationId: string | null;
  currentStep: string | null;
  pageState: PageState;
  fillResults: FillResult[];
  pausedReason: string | null;
  pageUrl: string | null;
  // This tab came from HiringCafe, and the site and settings allow starting by itself.
  wouldAutoStart: boolean;
  // The engine has been started for this tab, so it comes back after each navigation.
  engineActive: boolean;
  // The extension can't read the current page until the user allows this site.
  accessNeeded: boolean;
  // The panel is asking "Is this the application form?"
  awaitingFormAnswer: boolean;
  evidence: string[];
}

export function sessionKey(tabId: number): string {
  return `tabSession:${tabId}`;
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function normalizeFillResult(raw: unknown): FillResult | null {
  if (!isRecord(raw)) return null;
  const status = asOneOf(raw.status, FILL_STATUSES);
  if (!status || typeof raw.field !== 'string') return null;
  return {
    field: raw.field,
    status,
    note: asString(raw.note),
    ref: nullableString(raw.ref),
    profileKey: asString(raw.profileKey),
  };
}

export function normalizeTabSession(raw: unknown): TabSession | null {
  if (!isRecord(raw)) return null;
  const origin = asOneOf(raw.origin, ORIGINS);
  if (!origin) return null;
  return {
    origin,
    applicationId: nullableString(raw.applicationId),
    currentStep: nullableString(raw.currentStep),
    pageState: asOneOf(raw.pageState, PAGE_STATES) ?? 'unknown',
    fillResults: asArray(raw.fillResults, normalizeFillResult),
    pausedReason: nullableString(raw.pausedReason),
    pageUrl: nullableString(raw.pageUrl),
    wouldAutoStart: raw.wouldAutoStart === true,
    engineActive: raw.engineActive === true,
    accessNeeded: raw.accessNeeded === true,
    awaitingFormAnswer: raw.awaitingFormAnswer === true,
    evidence: asArray(raw.evidence, (item) => (typeof item === 'string' ? item : null)),
  };
}

export async function getTabSession(tabId: number): Promise<TabSession | null> {
  return normalizeTabSession(await read('session', sessionKey(tabId)));
}

export function startTabSession(
  tabId: number,
  origin: Origin,
  initial: Partial<
    Pick<TabSession, 'applicationId' | 'pageUrl' | 'wouldAutoStart' | 'engineActive'>
  > = {},
): Promise<TabSession> {
  return serialized(sessionKey(tabId), async () => {
    const session: TabSession = {
      origin,
      applicationId: null,
      currentStep: null,
      pageState: 'unknown',
      fillResults: [],
      pausedReason: null,
      pageUrl: null,
      wouldAutoStart: false,
      engineActive: false,
      accessNeeded: false,
      awaitingFormAnswer: false,
      evidence: [],
      ...initial,
    };
    await write('session', sessionKey(tabId), session);
    return session;
  });
}

export function updateTabSession(
  tabId: number,
  patch: Partial<TabSession>,
): Promise<TabSession | null> {
  return serialized(sessionKey(tabId), async () => {
    const current = await getTabSession(tabId);
    if (!current) return null;
    const next = normalizeTabSession({ ...current, ...patch });
    if (next) await write('session', sessionKey(tabId), next);
    return next;
  });
}

export function clearTabSession(tabId: number): Promise<void> {
  return serialized(sessionKey(tabId), () => remove('session', sessionKey(tabId)));
}

// Call synchronously at service worker startup so the listener survives restarts.
export function registerTabSessionCleanup(): void {
  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearTabSession(tabId);
  });
}
