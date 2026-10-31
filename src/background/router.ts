import { isHiringCafeUrl } from '../shared/hiringCafe';
import type { Message, ResponseFor, TabState } from '../shared/messages';
import {
  createApplication,
  getApplication,
  linkTab,
  listApplications,
} from '../shared/storage/applications';
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
