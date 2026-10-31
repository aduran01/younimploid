import type { Application } from '../shared/storage/applications';
import type { AuditEntry } from '../shared/storage/auditLog';

export type SortKey = 'company' | 'jobTitle' | 'atsSource' | 'status' | 'createdAt' | 'updatedAt';

export function sortApplications(
  applications: Application[],
  key: SortKey,
  descending: boolean,
): Application[] {
  const direction = descending ? -1 : 1;
  return [...applications].sort((a, b) => {
    const left = a[key] ?? '';
    const right = b[key] ?? '';
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right));
    return order * direction;
  });
}

export function filterApplications(
  applications: Application[],
  text: string,
  status: string,
): Application[] {
  const wanted = text.trim().toLowerCase();
  return applications.filter((application) => {
    if (status && application.status !== status) return false;
    if (!wanted) return true;
    const { company, jobTitle, atsSource, notes } = application;
    return [company, jobTitle, atsSource, notes].join(' ').toLowerCase().includes(wanted);
  });
}

// Titles come from web pages, so a leading formula character must not run in a spreadsheet.
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const CSV_HEADER = ['Company', 'Title', 'ATS', 'Status', 'Created', 'Updated', 'Job', 'Apply'];

export function toCsv(applications: Application[]): string {
  const rows = applications.map((application) => [
    application.company ?? '',
    application.jobTitle ?? '',
    application.atsSource ?? '',
    application.status,
    new Date(application.createdAt).toISOString(),
    new Date(application.updatedAt).toISOString(),
    application.jobUrl,
    application.applyUrl,
    application.notes,
  ]);
  return [[...CSV_HEADER, 'Notes'], ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function safeLink(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}

export function describeAuditEntry({ action, details }: AuditEntry): string {
  if (action === 'fill_result') {
    const mapped = details.mappedTo ? ` -> ${details.mappedTo}` : '';
    const value = details.value ? ` (${details.value})` : '';
    return `${details.field}${mapped}${value}: ${details.status}`;
  }
  if (action === 'page_state') {
    return `Page: ${details.page}${details.flag ? `. ${details.flag}` : ''}`;
  }
  if (action === 'status_change') return `Status: ${details.from} -> ${details.to}`;
  return action;
}
