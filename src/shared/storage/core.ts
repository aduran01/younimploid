export type StorageAreaName = 'local' | 'session';

export const KEYS = {
  schemaVersion: 'schemaVersion',
  profile: 'profile',
  settings: 'settings',
  applications: 'applications',
  auditLog: 'auditLog',
} as const;

export async function read(area: StorageAreaName, key: string): Promise<unknown> {
  const result: Record<string, unknown> = await chrome.storage[area].get(key);
  return result[key];
}

export async function write(area: StorageAreaName, key: string, value: unknown): Promise<void> {
  await chrome.storage[area].set({ [key]: value });
}

export async function remove(area: StorageAreaName, key: string): Promise<void> {
  await chrome.storage[area].remove(key);
}

const queues = new Map<string, Promise<unknown>>();

// Runs read-modify-write tasks for one key in order, so concurrent updates don't lose data.
export function serialized<T>(key: string, task: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).then(task, task);
  queues.set(key, run);
  return run;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function asOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.find((option) => option === value) ?? null;
}

// Maps each array item through a normalizer and drops the items it rejects.
export function asArray<T>(value: unknown, normalize: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalize).filter((item): item is T => item !== null);
}
