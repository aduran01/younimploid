import { STATUS_LABELS as APPLICATION_LABELS, canMarkSubmitted } from '../shared/applicationStatus';
import type { TabState } from '../shared/messages';
import type { Application } from '../shared/storage/applications';
import type { FillResult, FillStatus, TabSession } from '../shared/storage/tabSession';
import { Button } from '../shared/ui/Button';

export type PanelStatus = 'idle' | 'running' | 'paused' | 'needs_answer' | 'done';

const NEEDS_YOU: FillStatus[] = [
  'missing_required',
  'enter_manual',
  'needs_answer',
  'site_differs',
  'failed',
];

export function panelStatus(session: TabSession | null): PanelStatus {
  if (!session) return 'idle';
  if (session.pageState === 'confirmation') return 'done';
  if (session.pausedReason || session.awaitingFormAnswer) return 'paused';
  const needsYou = session.fillResults.some(({ status }) => NEEDS_YOU.includes(status));
  return needsYou ? 'needs_answer' : 'running';
}

const STATUS_LABELS: Record<PanelStatus, string> = {
  idle: 'Idle',
  running: 'Running',
  paused: 'Paused',
  needs_answer: 'Needs your answer',
  done: 'Done',
};

const GROUPS: { title: string; statuses: FillStatus[] }[] = [
  { title: 'Missing required', statuses: ['missing_required'] },
  { title: 'Enter manually', statuses: ['enter_manual'] },
  { title: 'Needs your answer', statuses: ['needs_answer', 'failed'] },
  { title: 'Site value differs', statuses: ['site_differs'] },
  { title: 'Filled', statuses: ['filled', 'prefilled'] },
];

const WALL_STATES = ['sign_in', 'create_account', 'verification', 'captcha'];

export interface PanelActions {
  onFill: () => void;
  onContinue: () => void;
  onAnswerFormQuestion: (isForm: boolean) => void;
  onHighlight: (ref: string) => void;
  onLink: (applicationId: string) => void;
  onMarkSubmitted: (applicationId: string) => void;
  onOpenSettings: () => void;
}

interface PanelViewProps extends PanelActions {
  state: TabState | null;
  openApplications: Application[];
  error: string;
}

function ResultItem({
  item,
  onHighlight,
}: {
  item: FillResult;
  onHighlight: (ref: string) => void;
}) {
  const { ref } = item;
  return (
    <li>
      <button
        type="button"
        className="w-full break-words text-left underline-offset-2 hover:underline"
        disabled={ref === null}
        onClick={() => {
          if (ref !== null) onHighlight(ref);
        }}
      >
        {item.field}
        {item.note && <span className="block text-gray-600">{item.note}</span>}
      </button>
    </li>
  );
}

function applicationLabel({ jobTitle, company, jobUrl }: Application): string {
  return [jobTitle, company].filter(Boolean).join(' at ') || jobUrl;
}

export function PanelView(props: PanelViewProps) {
  const { state, openApplications, error, onFill, onContinue, onAnswerFormQuestion } = props;
  const { onHighlight, onLink, onMarkSubmitted, onOpenSettings } = props;
  const session = state?.session ?? null;
  const application = state?.application ?? null;
  const status = panelStatus(session);
  const job = application
    ? [application.jobTitle, application.company].filter(Boolean).join(' at ')
    : '';
  const showFill = state !== null && (!session || !session.engineActive || session.accessNeeded);
  const atWall = session !== null && WALL_STATES.includes(session.pageState);
  const canMark = application !== null && canMarkSubmitted(application.status);
  const looksSubmitted = canMark && session?.pageState === 'confirmation';
  const waiting = openApplications.filter((entry) => entry.status === 'waiting_on_you').length;

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

      {session?.origin === 'hiringcafe' && <p>Opened from HiringCafe</p>}
      {job && <p className="break-words">{job}</p>}
      {application && <p>Tracker: {APPLICATION_LABELS[application.status]}</p>}
      {waiting > 0 && <p>Waiting on you: {waiting}</p>}
      {session?.wouldAutoStart && !session.engineActive && (
        <p>Would start autofill on this site.</p>
      )}
      {session?.pausedReason && <p role="status">{session.pausedReason}</p>}

      {session?.awaitingFormAnswer && (
        <div className="space-y-2 rounded border border-amber-600 p-2">
          <p className="font-semibold">Is this the application form?</p>
          <div className="flex gap-2">
            <Button onClick={() => onAnswerFormQuestion(true)}>Yes</Button>
            <Button variant="secondary" onClick={() => onAnswerFormQuestion(false)}>
              No
            </Button>
          </div>
        </div>
      )}

      {looksSubmitted && <p className="font-semibold">Looks submitted. Mark as submitted?</p>}
      {canMark && (
        <Button
          variant={looksSubmitted ? 'primary' : 'secondary'}
          onClick={() => onMarkSubmitted(application.id)}
        >
          Mark as submitted
        </Button>
      )}

      {atWall && session?.engineActive && (
        <Button variant="secondary" onClick={onContinue}>
          I'm signed in, continue
        </Button>
      )}
      {showFill && <Button onClick={onFill}>Fill this application</Button>}
      {error && <p className="text-red-700">{error}</p>}

      {!session && openApplications.length > 0 && (
        <label className="block">
          Link to an existing tracker entry
          <select
            className="mt-1 w-full rounded border border-gray-400 px-2 py-1"
            value=""
            onChange={(event) => {
              if (event.target.value) onLink(event.target.value);
            }}
          >
            <option value="">Choose an application</option>
            {openApplications.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {applicationLabel(entry)}
              </option>
            ))}
          </select>
        </label>
      )}

      {session &&
        GROUPS.map(({ title, statuses }) => {
          const items = session.fillResults.filter((item) => statuses.includes(item.status));
          if (items.length === 0) return null;
          return (
            <section key={title}>
              <h2 className="font-semibold">
                {title} ({items.length})
              </h2>
              <ul className="mt-1 space-y-1">
                {items.map((item, index) => (
                  <ResultItem key={`${item.ref}-${index}`} item={item} onHighlight={onHighlight} />
                ))}
              </ul>
            </section>
          );
        })}

      {status === 'needs_answer' || session?.fillResults.length ? (
        <p className="text-gray-600">Review everything, then submit it yourself.</p>
      ) : null}
    </main>
  );
}
