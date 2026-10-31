import type { TabState } from '../shared/messages';
import type { TabSession } from '../shared/storage/tabSession';
import { Button } from '../shared/ui/Button';

export type PanelStatus = 'idle' | 'running' | 'paused' | 'needs_answer' | 'done';

export function panelStatus(session: TabSession | null): PanelStatus {
  if (!session) return 'idle';
  if (session.pageState === 'confirmation') return 'done';
  if (session.pausedReason) return 'paused';
  const needsAnswer = session.fillResults.some(
    ({ status }) => status === 'missing' || status === 'flagged' || status === 'failed',
  );
  return needsAnswer ? 'needs_answer' : 'running';
}

const STATUS_LABELS: Record<PanelStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  paused: 'Paused',
  needs_answer: 'Needs your answer',
  done: 'Done',
};

interface PanelViewProps {
  state: TabState | null;
  onFill: () => void;
  onOpenSettings: () => void;
}

export function PanelView({ state, onFill, onOpenSettings }: PanelViewProps) {
  const session = state?.session ?? null;
  const application = state?.application ?? null;
  const status = panelStatus(session);
  const job = [application?.jobTitle, application?.company].filter(Boolean).join(' at ');

  return (
    <main className="flex min-h-screen flex-col gap-3 p-3 text-sm">
      <header className="flex items-center justify-between">
        <h1 className="font-bold">younimploid</h1>
        <button type="button" className="text-blue-700 underline" onClick={onOpenSettings}>
          Profile and settings
        </button>
      </header>

      <p className="font-semibold" data-status={status}>
        {STATUS_LABELS[status]}
      </p>

      {status === 'paused' && session?.pausedReason && <p>{session.pausedReason}</p>}
      {session?.origin === 'hiringcafe' && <p>Opened from HiringCafe</p>}
      {job && <p className="break-words">{job}</p>}
      {session?.wouldAutoStart && <p>Would start autofill on this site.</p>}
      {session && status === 'running' && (
        <p className="text-gray-600">Autofill arrives in Phase 2.</p>
      )}

      {!session && state && <Button onClick={onFill}>Fill this application</Button>}
    </main>
  );
}
