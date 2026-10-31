import { KEYS, asArray, asFiniteNumber, asString, isRecord, read, serialized, write } from './core';

export const MAX_AUDIT_ENTRIES = 1000;

const SENSITIVE_KEY = /key|password|secret|token|ssn/i;

export type AuditDetails = Record<string, string | number | boolean | null>;

export interface AuditEntry {
  applicationId: string;
  timestamp: number;
  action: string;
  details: AuditDetails;
}

// Secrets must never reach the audit log, so sensitive-looking detail names are redacted.
function normalizeDetails(raw: unknown): AuditDetails {
  if (!isRecord(raw)) return {};
  const details: AuditDetails = {};
  for (const [key, value] of Object.entries(raw)) {
    if (SENSITIVE_KEY.test(key)) {
      details[key] = '[redacted]';
    } else if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      details[key] = value;
    }
  }
  return details;
}

function normalizeEntry(raw: unknown): AuditEntry | null {
  if (!isRecord(raw)) return null;
  const timestamp = asFiniteNumber(raw.timestamp);
  const applicationId = asString(raw.applicationId);
  const action = asString(raw.action);
  if (timestamp === null || !applicationId || !action) return null;
  return { applicationId, timestamp, action, details: normalizeDetails(raw.details) };
}

export function normalizeAuditLog(raw: unknown): AuditEntry[] {
  return asArray(raw, normalizeEntry).slice(-MAX_AUDIT_ENTRIES);
}

export async function listAuditEntries(applicationId?: string): Promise<AuditEntry[]> {
  const entries = normalizeAuditLog(await read('local', KEYS.auditLog));
  return applicationId ? entries.filter((entry) => entry.applicationId === applicationId) : entries;
}

export function appendAuditEntry(
  applicationId: string,
  action: string,
  details: AuditDetails = {},
): Promise<void> {
  return serialized(KEYS.auditLog, async () => {
    const entry = { applicationId, timestamp: Date.now(), action, details };
    const next = normalizeAuditLog([...(await listAuditEntries()), entry]);
    await write('local', KEYS.auditLog, next);
  });
}
