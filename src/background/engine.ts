import type { EngineCommand, FillData, FillReport } from '../shared/messages';
import { updateApplication, type ApplicationStatus } from '../shared/storage/applications';
import { appendAuditEntry } from '../shared/storage/auditLog';
import { blobToBase64 } from '../shared/storage/backup';
import { getProfile } from '../shared/storage/profile';
import { getResumeFile } from '../shared/storage/resumeFile';
import { getSettings } from '../shared/storage/settings';
import { getTabSession, updateTabSession } from '../shared/storage/tabSession';
import { injectEngine } from './injectEngine';

const ACCESS_NEEDED = 'Allow this site so I can read the page.';

export async function tabPageUrl(tabId: number): Promise<string | null> {
  const frame = await chrome.webNavigation.getFrame({ tabId, frameId: 0 }).catch(() => null);
  return frame?.url ?? null;
}

// Injection fails on sites the user hasn't allowed, which is a normal state and not an error.
export async function startEngine(tabId: number): Promise<void> {
  await updateTabSession(tabId, { engineActive: true, accessNeeded: false, pausedReason: null });
  try {
    await injectEngine(tabId);
  } catch {
    await updateTabSession(tabId, { accessNeeded: true, pausedReason: ACCESS_NEEDED });
  }
}

export async function sendEngineCommand(tabId: number, command: EngineCommand): Promise<boolean> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'ENGINE_COMMAND', command });
    return true;
  } catch {
    return false;
  }
}

// Asks a running engine to re-check, or starts one if this page doesn't have one yet.
export async function continueEngine(tabId: number): Promise<void> {
  if (!(await sendEngineCommand(tabId, { kind: 'continue' }))) await startEngine(tabId);
}

export async function getFillData(tabId: number): Promise<FillData | null> {
  const session = await getTabSession(tabId);
  if (!session?.engineActive) return null;
  const [profile, settings, resume] = await Promise.all([
    getProfile(),
    getSettings(),
    getResumeFile().catch(() => null),
  ]);
  return {
    profile,
    autoAttachResume: settings.autoAttachResume,
    fieldDelayMs: settings.fieldDelayMs,
    resume: resume && {
      filename: resume.filename,
      mime: resume.mime,
      base64: await blobToBase64(resume.blob),
    },
  };
}

function applicationStatus(report: FillReport): ApplicationStatus {
  if (report.state === 'confirmation') return 'submitted';
  if (report.phase === 'paused' || report.phase === 'asking') return 'waiting_on_you';
  return report.phase === 'filled' ? 'needs_review' : 'in_progress';
}

export async function handleFillReport(tabId: number, report: FillReport): Promise<void> {
  const session = await getTabSession(tabId);
  if (!session?.engineActive) return;
  const hasNewResults = report.results.length > 0 || report.phase === 'running';
  await updateTabSession(tabId, {
    pageState: report.state,
    evidence: report.evidence,
    pausedReason: report.pausedReason,
    awaitingFormAnswer: report.phase === 'asking',
    ...(hasNewResults && { fillResults: report.results }),
  });

  const { applicationId } = session;
  if (!applicationId) return;
  await updateApplication(applicationId, { status: applicationStatus(report) });
  for (const { field, status, profileKey } of report.results) {
    await appendAuditEntry(applicationId, 'fill_result', {
      field,
      status,
      mappedTo: profileKey,
      page: report.state,
    });
  }
}
