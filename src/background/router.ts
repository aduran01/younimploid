import { canMarkSubmitted } from '../shared/applicationStatus';
import { isHiringCafeUrl } from '../shared/hiringCafe';
import type { Message, ResponseFor, TabState, TrackerEdit } from '../shared/messages';
import {
  createApplication,
  getApplication,
  linkTab,
  listApplications,
  mergeApplications,
  updateApplication,
} from '../shared/storage/applications';
import {
  appendAuditEntry,
  listAuditEntries,
  reassignAuditEntries,
} from '../shared/storage/auditLog';
import { saveJobContext } from '../shared/storage/hiringCafeTabs';
import { getTabSession, startTabSession, updateTabSession } from '../shared/storage/tabSession';
import {
  continueEngine,
  getFillData,
  handleFillReport,
  sendEngineCommand,
  tabPageUrl,
} from './engine';

async function getTabState(tabId: number): Promise<TabState> {
  const session = await getTabSession(tabId);
  const application = session?.applicationId ? await getApplication(session.applicationId) : null;
  return { session, application, pageUrl: await tabPageUrl(tabId) };
}

// A tab already being tracked keeps its session and application.
async function startFill(tabId: number): Promise<TabState> {
  const pageUrl = (await tabPageUrl(tabId)) ?? '';
  if (!(await getTabSession(tabId))) {
    const application = await createApplication({
      jobUrl: pageUrl,
      applyUrl: pageUrl,
      origin: 'manual',
      detailsSource: 'application_page',
    });
    await linkTab(application.id, tabId);
    await startTabSession(tabId, 'manual', { applicationId: application.id, pageUrl });
  }
  await updateTabSession(tabId, { engineActive: true });
  await continueEngine(tabId);
  return getTabState(tabId);
}

// For a tab reached from a verification link, where the job already has a tracker entry.
async function linkApplication(tabId: number, applicationId: string): Promise<TabState> {
  const application = await linkTab(applicationId, tabId);
  if (!application) return getTabState(tabId);
  if (await getTabSession(tabId)) {
    await updateTabSession(tabId, { applicationId });
  } else {
    await startTabSession(tabId, application.origin, {
      applicationId,
      pageUrl: await tabPageUrl(tabId),
    });
  }
  return getTabState(tabId);
}

// Submitting stays the user's act. This only records that they say it happened.
async function markSubmitted(applicationId: string): Promise<boolean> {
  const application = await getApplication(applicationId);
  if (!application || !canMarkSubmitted(application.status)) return false;
  await updateApplication(applicationId, { status: 'submitted' });
  await appendAuditEntry(applicationId, 'status_change', {
    from: application.status,
    to: 'submitted',
  });
  return true;
}

async function editApplication(applicationId: string, edit: TrackerEdit): Promise<boolean> {
  const before = await getApplication(applicationId);
  if (!before) return false;
  const { status, jobTitle, company, notes } = edit;
  const typedDetails = jobTitle !== undefined || company !== undefined;
  const updated = await updateApplication(applicationId, {
    ...(status !== undefined && { status }),
    ...(jobTitle !== undefined && { jobTitle }),
    ...(company !== undefined && { company }),
    ...(notes !== undefined && { notes }),
    ...(typedDetails && { detailsSource: 'manual' as const }),
  });
  if (!updated) return false;
  if (updated.status !== before.status) {
    await appendAuditEntry(applicationId, 'status_change', {
      from: before.status,
      to: updated.status,
    });
  }
  return true;
}

// Tabs still working on the merged entry move over with it.
async function mergeEntries(sourceId: string, targetId: string): Promise<boolean> {
  const source = await getApplication(sourceId);
  const merged = await mergeApplications(sourceId, targetId);
  if (!source || !merged) return false;
  await reassignAuditEntries(sourceId, targetId);
  for (const tabId of source.linkedTabIds) {
    const session = await getTabSession(tabId);
    if (session?.applicationId === sourceId) {
      await updateTabSession(tabId, { applicationId: targetId });
    }
  }
  return true;
}

export function handleMessage<M extends Message>(
  message: M,
  sender?: chrome.runtime.MessageSender,
): Promise<ResponseFor<M>>;
export async function handleMessage(
  message: Message,
  sender?: chrome.runtime.MessageSender,
): Promise<ResponseFor<Message>> {
  const senderTabId = sender?.tab?.id;
  switch (message.type) {
    case 'PING':
      return { type: 'PONG' };
    case 'GET_TAB_STATE':
      return getTabState(message.tabId);
    case 'START_FILL':
      return startFill(message.tabId);
    case 'CONTINUE_FILL':
      await continueEngine(message.tabId);
      return { ok: true };
    case 'ANSWER_FORM_QUESTION':
      return {
        ok: await sendEngineCommand(message.tabId, {
          kind: 'answer_form_question',
          isForm: message.isForm,
        }),
      };
    case 'HIGHLIGHT_FIELD':
      return {
        ok: await sendEngineCommand(message.tabId, { kind: 'highlight', ref: message.ref }),
      };
    case 'LIST_APPLICATIONS':
      return listApplications();
    case 'LINK_APPLICATION':
      return linkApplication(message.tabId, message.applicationId);
    case 'MARK_SUBMITTED':
      return { ok: await markSubmitted(message.applicationId) };
    case 'UPDATE_APPLICATION':
      return { ok: await editApplication(message.applicationId, message.edit) };
    case 'MERGE_APPLICATIONS':
      return { ok: await mergeEntries(message.sourceId, message.targetId) };
    case 'LIST_AUDIT':
      return listAuditEntries(message.applicationId);
    case 'OPEN_SETTINGS':
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    case 'JOB_CONTEXT':
      if (senderTabId === undefined || !isHiringCafeUrl(sender?.url)) return { ok: false };
      await saveJobContext(senderTabId, message.context);
      return { ok: true };
    case 'ENGINE_READY':
      return senderTabId === undefined ? null : getFillData(senderTabId);
    case 'FILL_REPORT':
      if (senderTabId === undefined) return { ok: false };
      await handleFillReport(senderTabId, message.report);
      return { ok: true };
    case 'ENGINE_COMMAND':
      // Only ever sent to content scripts.
      return { ok: false };
  }
}
