import { asFiniteNumber, asString, isRecord, read, remove, write } from './core';

// Only these fields are ever kept from a hiring.cafe page.
export interface JobContext {
  title: string;
  company: string;
  url: string;
}

interface StoredJobContext extends JobContext {
  capturedAt: number;
}

// A click older than this belongs to some other tab.
const JOB_CONTEXT_MAX_AGE_MS = 60_000;

function openedKey(tabId: number): string {
  return `openedFromHiringCafe:${tabId}`;
}

function contextKey(tabId: number): string {
  return `jobContext:${tabId}`;
}

// The marker waits here until the new tab commits a page that isn't on hiring.cafe.
export function markOpenedFromHiringCafe(tabId: number, sourceTabId: number): Promise<void> {
  return write('session', openedKey(tabId), { sourceTabId });
}

export async function getOpenedFromHiringCafe(
  tabId: number,
): Promise<{ sourceTabId: number } | null> {
  const raw = await read('session', openedKey(tabId));
  const sourceTabId = isRecord(raw) ? asFiniteNumber(raw.sourceTabId) : null;
  return sourceTabId === null ? null : { sourceTabId };
}

export function clearOpenedFromHiringCafe(tabId: number): Promise<void> {
  return remove('session', openedKey(tabId));
}

export function saveJobContext(sourceTabId: number, context: JobContext): Promise<void> {
  const stored: StoredJobContext = {
    title: context.title,
    company: context.company,
    url: context.url,
    capturedAt: Date.now(),
  };
  return write('session', contextKey(sourceTabId), stored);
}

// Reading consumes the context, so it can't label a later application.
export async function takeJobContext(sourceTabId: number): Promise<JobContext | null> {
  const raw = await read('session', contextKey(sourceTabId));
  await clearJobContext(sourceTabId);
  if (!isRecord(raw)) return null;
  const capturedAt = asFiniteNumber(raw.capturedAt);
  if (capturedAt === null || Date.now() - capturedAt > JOB_CONTEXT_MAX_AGE_MS) return null;
  return { title: asString(raw.title), company: asString(raw.company), url: asString(raw.url) };
}

export function clearJobContext(tabId: number): Promise<void> {
  return remove('session', contextKey(tabId));
}
