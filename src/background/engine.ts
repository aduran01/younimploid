import type { EngineCommand, FillData, FillReport } from '../shared/messages';
import { statusAfterReport } from '../shared/applicationStatus';
import {
  getApplication,
  updateApplication,
  type Application,
  type ApplicationPatch,
} from '../shared/storage/applications';
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

const MAX_DETAIL_LENGTH = 200;

// Page text is only ever a stand-in. HiringCafe context or the user's own edit stays.
function detailsPatch(application: Application, report: FillReport): ApplicationPatch {
  if (application.detailsSource !== 'application_page' || !report.jobDetails) return {};
  const { title, company } = report.jobDetails;
  return {
    ...(!application.jobTitle && title && { jobTitle: title.slice(0, MAX_DETAIL_LENGTH) }),
    ...(!application.company && company && { company: company.slice(0, MAX_DETAIL_LENGTH) }),
  };
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
  const application = await getApplication(applicationId);
  if (!application) return;
  const status = statusAfterReport(application.status, report);
  await updateApplication(applicationId, { status, ...detailsPatch(application, report) });
  if (report.state !== session.pageState) {
    await appendAuditEntry(applicationId, 'page_state', {
      page: report.state,
      flag: report.pausedReason,
    });
  }
  if (status !== application.status) {
    await appendAuditEntry(applicationId, 'status_change', {
      from: application.status,
      to: status,
    });
  }
  for (const { field, status: fillStatus, profileKey, maskedValue } of report.results) {
    await appendAuditEntry(applicationId, 'fill_result', {
      field,
      status: fillStatus,
      mappedTo: profileKey,
      page: report.state,
      ...(maskedValue && { value: maskedValue }),
    });
  }
}
