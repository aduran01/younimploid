import { normalizeApplications, listApplications } from './applications';
import { listAuditEntries, normalizeAuditLog } from './auditLog';
import { KEYS, asFiniteNumber, isRecord, write } from './core';
import { CURRENT_SCHEMA_VERSION } from './migrations';
import { getProfile, normalizeProfile } from './profile';
import {
  indexedDbResumeStore,
  normalizeResumeFile,
  getResumeFile,
  type ResumeStore,
} from './resumeFile';
import { getSettings, normalizeSettings } from './settings';

export interface ExportOptions {
  includeAiKey?: boolean;
  includeResume?: boolean;
}

export class BackupError extends Error {}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBlob(data: string, mime: string): Blob {
  const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

// The AI key and resume are left out unless the user opts in. Per-tab state is never exported.
export async function exportBackup(
  options: ExportOptions = {},
  store: ResumeStore = indexedDbResumeStore,
): Promise<string> {
  const { aiApiKey, ...settings } = await getSettings();
  const resume = options.includeResume ? await getResumeFile(store) : null;
  return JSON.stringify({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: Date.now(),
    profile: await getProfile(),
    settings: options.includeAiKey ? { ...settings, aiApiKey } : settings,
    applications: await listApplications(),
    auditLog: await listAuditEntries(),
    ...(resume && {
      resume: {
        filename: resume.filename,
        mime: resume.mime,
        updatedAt: resume.updatedAt,
        data: await blobToBase64(resume.blob),
      },
    }),
  });
}

function parseResume(raw: unknown) {
  if (!isRecord(raw) || typeof raw.data !== 'string' || typeof raw.mime !== 'string') return null;
  try {
    return normalizeResumeFile({ ...raw, blob: base64ToBlob(raw.data, raw.mime) });
  } catch {
    return null;
  }
}

function parseBackup(json: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new BackupError('This file is not a valid backup.');
  }
  if (!isRecord(parsed)) throw new BackupError('This file is not a valid backup.');

  const version = asFiniteNumber(parsed.schemaVersion);
  if (version === null) throw new BackupError('This file is not a valid backup.');
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new BackupError('This backup is from a newer version of younimploid.');
  }
  return parsed;
}

export interface BackupSummary {
  exportedAt: number | null;
  hasProfile: boolean;
  hasSettings: boolean;
  applicationCount: number | null;
  auditEntryCount: number | null;
  hasResume: boolean;
}

// Says what an import would replace, and writes nothing.
export function summarizeBackup(json: string): BackupSummary {
  const parsed = parseBackup(json);
  return {
    exportedAt: asFiniteNumber(parsed.exportedAt),
    hasProfile: isRecord(parsed.profile),
    hasSettings: isRecord(parsed.settings),
    applicationCount: Array.isArray(parsed.applications) ? parsed.applications.length : null,
    auditEntryCount: Array.isArray(parsed.auditLog) ? parsed.auditLog.length : null,
    hasResume: parseResume(parsed.resume) !== null,
  };
}

// Everything is validated first, so a rejected backup changes nothing.
export async function importBackup(
  json: string,
  store: ResumeStore = indexedDbResumeStore,
): Promise<void> {
  const parsed = parseBackup(json);
  const resume = parseResume(parsed.resume);

  // Sections missing from the file keep what's stored, so a partial backup can't erase data.
  if (isRecord(parsed.profile)) {
    await write('local', KEYS.profile, normalizeProfile(parsed.profile));
  }
  if (isRecord(parsed.settings)) {
    // A backup without a key keeps the key already stored.
    const settings = normalizeSettings({
      aiApiKey: (await getSettings()).aiApiKey,
      ...parsed.settings,
    });
    await write('local', KEYS.settings, settings);
  }
  if (Array.isArray(parsed.applications)) {
    await write('local', KEYS.applications, normalizeApplications(parsed.applications));
  }
  if (Array.isArray(parsed.auditLog)) {
    await write('local', KEYS.auditLog, normalizeAuditLog(parsed.auditLog));
  }
  if (resume) await store.put(resume);
}
