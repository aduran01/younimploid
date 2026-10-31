import { isHiringCafeUrl } from '../shared/hiringCafe';
import type { Message, ResponseFor, TabState } from '../shared/messages';
import { getApplication } from '../shared/storage/applications';
import { saveJobContext } from '../shared/storage/hiringCafeTabs';
import { getTabSession, startTabSession } from '../shared/storage/tabSession';

async function getTabState(tabId: number): Promise<TabState> {
  const session = await getTabSession(tabId);
  const application = session?.applicationId ? await getApplication(session.applicationId) : null;
  return { session, application };
}

export function handleMessage<M extends Message>(
  message: M,
  sender?: chrome.runtime.MessageSender,
): Promise<ResponseFor<M>>;
export async function handleMessage(
  message: Message,
  sender?: chrome.runtime.MessageSender,
): Promise<ResponseFor<Message>> {
  switch (message.type) {
    case 'PING':
      return { type: 'PONG' };
    case 'GET_TAB_STATE':
      return getTabState(message.tabId);
    case 'START_MANUAL_SESSION':
      // A tab already being tracked keeps its session.
      if (!(await getTabSession(message.tabId))) {
        await startTabSession(message.tabId, 'manual');
      }
      return getTabState(message.tabId);
    case 'OPEN_SETTINGS':
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    case 'JOB_CONTEXT': {
      const tabId = sender?.tab?.id;
      if (tabId === undefined || !isHiringCafeUrl(sender?.url)) return { ok: false };
      await saveJobContext(tabId, message.context);
      return { ok: true };
    }
  }
}
