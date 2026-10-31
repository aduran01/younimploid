// Every message between extension contexts is declared here.

import type { JobDetails } from '../content/adapters/types';
import type { Application, ApplicationStatus } from './storage/applications';
import type { AuditEntry } from './storage/auditLog';
import type { JobContext } from './storage/hiringCafeTabs';
import type { Profile } from './storage/profile';
import type { FillResult, PageState, TabSession } from './storage/tabSession';

export interface TabState {
  session: TabSession | null;
  application: Application | null;
  // The tab's current page, for asking permission on the fill button (D-026).
  pageUrl: string | null;
}

export interface ResumePayload {
  filename: string;
  mime: string;
  base64: string;
}

// Only what the engine needs. Settings are not passed whole, so the AI key can't reach a page.
export interface FillData {
  profile: Profile;
  resume: ResumePayload | null;
  autoAttachResume: boolean;
  fieldDelayMs: number;
}

export interface FillReport {
  state: PageState;
  ambiguous: boolean;
  evidence: string[];
  phase: 'running' | 'paused' | 'asking' | 'filled';
  pausedReason: string | null;
  results: FillResult[];
  jobDetails?: JobDetails;
}

// What the tracker may edit. Everything else about an entry belongs to the background.
export interface TrackerEdit {
  status?: ApplicationStatus;
  jobTitle?: string;
  company?: string;
  notes?: string;
}

export type EngineCommand =
  | { kind: 'continue' }
  | { kind: 'answer_form_question'; isForm: boolean }
  | { kind: 'highlight'; ref: string };

export type Message =
  | { type: 'PING' }
  | { type: 'GET_TAB_STATE'; tabId: number }
  | { type: 'START_FILL'; tabId: number }
  | { type: 'CONTINUE_FILL'; tabId: number }
  | { type: 'ANSWER_FORM_QUESTION'; tabId: number; isForm: boolean }
  | { type: 'HIGHLIGHT_FIELD'; tabId: number; ref: string }
  | { type: 'LIST_APPLICATIONS' }
  | { type: 'LINK_APPLICATION'; tabId: number; applicationId: string }
  | { type: 'MARK_SUBMITTED'; applicationId: string }
  | { type: 'UPDATE_APPLICATION'; applicationId: string; edit: TrackerEdit }
  | { type: 'MERGE_APPLICATIONS'; sourceId: string; targetId: string }
  | { type: 'LIST_AUDIT'; applicationId: string }
  | { type: 'OPEN_SETTINGS' }
  | { type: 'JOB_CONTEXT'; context: JobContext }
  | { type: 'ENGINE_READY' }
  | { type: 'FILL_REPORT'; report: FillReport }
  // Background to content script, through chrome.tabs.sendMessage.
  | { type: 'ENGINE_COMMAND'; command: EngineCommand };

export type ResponseFor<M extends Message> = M extends { type: 'PING' }
  ? { type: 'PONG' }
  : M extends { type: 'GET_TAB_STATE' | 'START_FILL' | 'LINK_APPLICATION' }
    ? TabState
    : M extends { type: 'LIST_APPLICATIONS' }
      ? Application[]
      : M extends { type: 'LIST_AUDIT' }
        ? AuditEntry[]
        : M extends { type: 'ENGINE_READY' }
          ? FillData | null
          : { ok: boolean };

export function sendMessage<M extends Message>(message: M): Promise<ResponseFor<M>> {
  return chrome.runtime.sendMessage(message);
}
