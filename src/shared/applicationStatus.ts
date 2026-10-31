import type { ApplicationStatus } from './storage/applications';
import type { PageState } from './storage/tabSession';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  in_progress: 'In progress',
  waiting_on_you: 'Waiting on you',
  needs_review: 'Needs review',
  submitted: 'Submitted',
  rejected: 'Rejected',
  interview: 'Interview',
  offer: 'Offer',
  withdrawn: 'Withdrawn',
};

// The only statuses the engine may move between. Everything after these is the user's to set.
const BEFORE_SUBMIT: ApplicationStatus[] = ['in_progress', 'waiting_on_you', 'needs_review'];

export function canMarkSubmitted(status: ApplicationStatus): boolean {
  return BEFORE_SUBMIT.includes(status);
}

// A confirmation page changes nothing: the panel asks, and the user confirms.
export function statusAfterReport(
  current: ApplicationStatus,
  report: { state: PageState; phase: 'running' | 'paused' | 'asking' | 'filled' },
): ApplicationStatus {
  if (!BEFORE_SUBMIT.includes(current) || report.state === 'confirmation') return current;
  if (report.phase === 'paused' || report.phase === 'asking') return 'waiting_on_you';
  return report.phase === 'filled' ? 'needs_review' : 'in_progress';
}
