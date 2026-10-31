import type { AtsAdapter } from '../adapters/types';
import type { FillData, FillReport } from '../../shared/messages';
import { classifyPage, isWall, type PageClassification } from './classifier';
import { fillPage } from './fillPage';

export const HANDOFF_MESSAGE = "Sign in or create your account, then I'll continue.";
const OPEN_FORM_MESSAGE = "Open the application form and I'll continue.";
const STILL_WALL_MESSAGE = "This still looks like a sign-in page. Finish there and I'll continue.";

export interface ControllerDeps {
  doc: Document;
  adapter: AtsAdapter;
  data: FillData;
  resume: File | null;
  report: (report: FillReport) => void;
  settle: () => Promise<void>;
}

export interface Controller {
  // Re-checks the page. Called on start, on DOM changes while waiting, and on "continue".
  check: (userAsked?: boolean) => Promise<void>;
  confirmForm: (isForm: boolean) => Promise<void>;
  isWaiting: () => boolean;
}

export function createController(deps: ControllerDeps): Controller {
  const { doc, adapter, data, resume, settle } = deps;
  const report = (next: FillReport) => {
    const jobDetails = adapter.readJobDetails?.(doc);
    deps.report(jobDetails ? { ...next, jobDetails } : next);
  };
  const classify = (): PageClassification => (adapter.classifyPage ?? classifyPage)(doc);
  let phase: 'waiting' | 'filling' | 'finished' = 'waiting';
  let declined = false;
  let triedForm = false;

  const fill = async (classification: PageClassification, confirmed: boolean) => {
    phase = 'filling';
    report({ ...classification, phase: 'running', pausedReason: null, results: [] });
    const { results, stopped } = await fillPage({
      doc,
      adapter,
      profile: data.profile,
      resume: data.autoAttachResume ? resume : null,
      delayMs: data.fieldDelayMs,
      settle,
      // A confirmed form may have an account password box, which stays untouched regardless.
      shouldStop: () => {
        const now = classify();
        return isWall(now.state) && !(confirmed && now.ambiguous);
      },
    });
    if (stopped) {
      phase = 'waiting';
      report({
        ...classify(),
        phase: 'paused',
        pausedReason: HANDOFF_MESSAGE,
        results,
      });
      return;
    }
    phase = 'finished';
    report({ ...classification, phase: 'filled', pausedReason: null, results });
  };

  return {
    isWaiting: () => phase === 'waiting',
    check: async (userAsked = false) => {
      if (phase !== 'waiting') return;
      const classification = classify();
      const { state, ambiguous } = classification;
      if (ambiguous) {
        // "No" means keep waiting without asking again, until the user presses continue.
        if (declined && !userAsked) return;
        report({ ...classification, phase: 'asking', pausedReason: null, results: [] });
      } else if (isWall(state)) {
        const pausedReason = userAsked ? STILL_WALL_MESSAGE : HANDOFF_MESSAGE;
        report({ ...classification, phase: 'paused', pausedReason, results: [] });
      } else if (state === 'application_form') {
        await fill(classification, false);
      } else if (state === 'confirmation') {
        phase = 'finished';
        report({ ...classification, phase: 'filled', pausedReason: null, results: [] });
      } else {
        // Once per page. A real navigation brings a fresh engine, a same-page one a DOM change.
        if (state === 'job_description' && adapter.goToApplicationForm && !triedForm) {
          triedForm = true;
          if ((await adapter.goToApplicationForm(doc)) === 'navigated') {
            report({ ...classification, phase: 'running', pausedReason: null, results: [] });
            return;
          }
        }
        report({
          ...classification,
          phase: 'paused',
          pausedReason: OPEN_FORM_MESSAGE,
          results: [],
        });
      }
    },
    confirmForm: async (isForm) => {
      if (phase !== 'waiting') return;
      const classification = classify();
      if (!isForm) {
        declined = true;
        report({
          ...classification,
          phase: 'paused',
          pausedReason: 'Waiting. Tell me when the application form is showing.',
          results: [],
        });
        return;
      }
      // "Yes" answers the ambiguous question only. It never overrides a clear wall.
      if (isWall(classification.state) && !classification.ambiguous) {
        report({ ...classification, phase: 'paused', pausedReason: HANDOFF_MESSAGE, results: [] });
        return;
      }
      await fill({ ...classification, state: 'application_form' }, true);
    },
  };
}
