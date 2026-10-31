import { useCallback, useEffect, useMemo, useState } from 'react';
import { STATUS_LABELS } from '../shared/applicationStatus';
import { sendMessage, type TrackerEdit } from '../shared/messages';
import { STATUSES, type Application } from '../shared/storage/applications';
import type { AuditEntry } from '../shared/storage/auditLog';
import { KEYS } from '../shared/storage/core';
import { subscribe } from '../shared/storage/subscribe';
import { Button } from '../shared/ui/Button';
import {
  describeAuditEntry,
  filterApplications,
  safeLink,
  sortApplications,
  toCsv,
  type SortKey,
} from './tracker';

const COLUMNS: { key: SortKey; title: string }[] = [
  { key: 'company', title: 'Company' },
  { key: 'jobTitle', title: 'Title' },
  { key: 'atsSource', title: 'ATS' },
  { key: 'status', title: 'Status' },
  { key: 'createdAt', title: 'Created' },
  { key: 'updatedAt', title: 'Updated' },
];

const INPUT = 'w-full rounded border border-gray-300 px-1 py-0.5';

function download(csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `younimploid-tracker-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function label({ jobTitle, company, jobUrl }: Application): string {
  return [jobTitle, company].filter(Boolean).join(' at ') || jobUrl;
}

function AuditView({ applicationId, version }: { applicationId: string; version: number }) {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  useEffect(() => {
    void sendMessage({ type: 'LIST_AUDIT', applicationId }).then(setEntries);
  }, [applicationId, version]);
  if (!entries) return <p>Loading...</p>;
  if (entries.length === 0) return <p className="text-gray-600">Nothing recorded yet.</p>;
  return (
    <ol className="space-y-0.5">
      {entries.map((entry, index) => (
        <li key={`${entry.timestamp}-${index}`} className="break-words">
          <time className="text-gray-600">{new Date(entry.timestamp).toLocaleString()}</time>{' '}
          {describeAuditEntry(entry)}
        </li>
      ))}
    </ol>
  );
}

function TrackerRow(props: {
  application: Application;
  others: Application[];
  onEdit: (edit: TrackerEdit) => void;
  onMerge: (targetId: string) => void;
}) {
  const { application, others, onEdit, onMerge } = props;
  const { id, company, jobTitle, atsSource, status, createdAt, updatedAt } = application;
  const [showAudit, setShowAudit] = useState(false);
  const [mergeTarget, setMergeTarget] = useState('');
  const jobLink = safeLink(application.jobUrl);
  const applyLink = safeLink(application.applyUrl);
  const target = others.find((other) => other.id === mergeTarget);

  return (
    <>
      <tr className="border-t border-gray-200 align-top">
        <td className="p-1">
          <input
            key={company}
            aria-label="Company"
            className={INPUT}
            defaultValue={company ?? ''}
            onBlur={({ target: input }) => {
              if (input.value !== (company ?? '')) onEdit({ company: input.value });
            }}
          />
        </td>
        <td className="p-1">
          <input
            key={jobTitle}
            aria-label="Title"
            className={INPUT}
            defaultValue={jobTitle ?? ''}
            onBlur={({ target: input }) => {
              if (input.value !== (jobTitle ?? '')) onEdit({ jobTitle: input.value });
            }}
          />
        </td>
        <td className="p-1">{atsSource ?? ''}</td>
        <td className="p-1">
          <select
            aria-label="Status"
            className={INPUT}
            value={status}
            onChange={({ target: select }) => {
              const next = STATUSES.find((item) => item === select.value);
              if (next) onEdit({ status: next });
            }}
          >
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {STATUS_LABELS[item]}
              </option>
            ))}
          </select>
        </td>
        <td className="whitespace-nowrap p-1">{new Date(createdAt).toLocaleDateString()}</td>
        <td className="whitespace-nowrap p-1">{new Date(updatedAt).toLocaleDateString()}</td>
        <td className="whitespace-nowrap p-1">
          {jobLink && (
            <a className="text-blue-700 underline" href={jobLink} target="_blank" rel="noreferrer">
              Job
            </a>
          )}{' '}
          {applyLink && (
            <a
              className="text-blue-700 underline"
              href={applyLink}
              target="_blank"
              rel="noreferrer"
            >
              Apply
            </a>
          )}
        </td>
        <td className="p-1">
          <textarea
            key={application.notes}
            aria-label="Notes"
            rows={1}
            className={INPUT}
            defaultValue={application.notes}
            onBlur={({ target: input }) => {
              if (input.value !== application.notes) onEdit({ notes: input.value });
            }}
          />
        </td>
        <td className="space-y-1 p-1">
          <button
            type="button"
            className="text-blue-700 underline"
            onClick={() => setShowAudit(!showAudit)}
          >
            {showAudit ? 'Hide log' : 'Log'}
          </button>
          {others.length > 0 && (
            <select
              aria-label="Link this entry into another"
              className={INPUT}
              value={mergeTarget}
              onChange={({ target: select }) => setMergeTarget(select.value)}
            >
              <option value="">Link into...</option>
              {others.map((other) => (
                <option key={other.id} value={other.id}>
                  {label(other)}
                </option>
              ))}
            </select>
          )}
        </td>
      </tr>
      {target && (
        <tr>
          <td colSpan={9} className="bg-amber-50 p-2">
            <p>
              Merge this entry into "{label(target)}"? This entry goes away, and its log and tabs
              move over.
            </p>
            <div className="mt-1 flex gap-2">
              <Button onClick={() => onMerge(target.id)}>Link these</Button>
              <Button variant="secondary" onClick={() => setMergeTarget('')}>
                Cancel
              </Button>
            </div>
          </td>
        </tr>
      )}
      {showAudit && (
        <tr>
          <td colSpan={9} className="bg-gray-50 p-2 text-xs">
            <AuditView applicationId={id} version={updatedAt} />
          </td>
        </tr>
      )}
    </>
  );
}

export function TrackerTab() {
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({
    key: 'updatedAt',
    descending: true,
  });
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');

  const refresh = useCallback(() => {
    void sendMessage({ type: 'LIST_APPLICATIONS' }).then(setApplications);
  }, []);
  useEffect(() => {
    refresh();
    return subscribe('local', KEYS.applications, refresh);
  }, [refresh]);

  const shown = useMemo(
    () =>
      sortApplications(
        filterApplications(applications ?? [], text, status),
        sort.key,
        sort.descending,
      ),
    [applications, text, status, sort],
  );

  if (!applications) return <p>Loading...</p>;

  return (
    <section className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Filter"
          placeholder="Filter"
          className="rounded border border-gray-400 px-2 py-1"
          value={text}
          onChange={({ target }) => setText(target.value)}
        />
        <select
          aria-label="Filter by status"
          className="rounded border border-gray-400 px-2 py-1"
          value={status}
          onChange={({ target }) => setStatus(target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={() => download(toCsv(shown))}>
          Export CSV
        </Button>
      </div>

      {applications.length === 0 ? (
        <p className="text-gray-600">No applications yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {COLUMNS.map(({ key, title }) => (
                  <th
                    key={key}
                    className="p-1"
                    aria-sort={
                      sort.key === key ? (sort.descending ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <button
                      type="button"
                      className="font-semibold"
                      onClick={() =>
                        setSort({
                          key,
                          descending: sort.key === key ? !sort.descending : false,
                        })
                      }
                    >
                      {title}
                      {sort.key === key && (sort.descending ? ' ▼' : ' ▲')}
                    </button>
                  </th>
                ))}
                <th className="p-1">Links</th>
                <th className="p-1">Notes</th>
                <th className="p-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((application) => (
                <TrackerRow
                  key={application.id}
                  application={application}
                  others={applications.filter(({ id }) => id !== application.id)}
                  onEdit={(edit) => {
                    void sendMessage({
                      type: 'UPDATE_APPLICATION',
                      applicationId: application.id,
                      edit,
                    });
                  }}
                  onMerge={(targetId) => {
                    void sendMessage({
                      type: 'MERGE_APPLICATIONS',
                      sourceId: application.id,
                      targetId,
                    });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
