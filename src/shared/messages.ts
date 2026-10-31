// Every message between extension contexts is declared here.

import type { Application } from './storage/applications';
import type { JobContext } from './storage/hiringCafeTabs';
import type { TabSession } from './storage/tabSession';

export interface TabState {
  session: TabSession | null;
  application: Application | null;
}

export type Message =
  | { type: 'PING' }
  | { type: 'GET_TAB_STATE'; tabId: number }
  | { type: 'START_MANUAL_SESSION'; tabId: number }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'JOB_CONTEXT'; context: JobContext };

export type ResponseFor<M extends Message> = M extends { type: 'PING' }
  ? { type: 'PONG' }
  : M extends { type: 'GET_TAB_STATE' | 'START_MANUAL_SESSION' }
    ? TabState
    : M extends { type: 'OPEN_SETTINGS' | 'JOB_CONTEXT' }
      ? { ok: boolean }
      : never;

export function sendMessage<M extends Message>(message: M): Promise<ResponseFor<M>> {
  return chrome.runtime.sendMessage(message);
}
