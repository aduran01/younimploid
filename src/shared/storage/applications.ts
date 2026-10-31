import {
  KEYS,
  asArray,
  asFiniteNumber,
  asOneOf,
  asString,
  isRecord,
  read,
  serialized,
  write,
} from './core';

export const ORIGINS = ['hiringcafe', 'manual'] as const;
export type Origin = (typeof ORIGINS)[number];

export const STATUSES = [
  'in_progress',
  'waiting_on_you',
  'needs_review',
  'submitted',
  'rejected',
  'interview',
  'offer',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof STATUSES)[number];

const DETAILS_SOURCES = ['hiringcafe', 'application_page', 'manual'] as const;
export type DetailsSource = (typeof DETAILS_SOURCES)[number];

export interface Application {
  id: string;
  jobTitle?: string;
  company?: string;
  jobUrl: string;
  applyUrl: string;
  atsSource?: string;
  origin: Origin;
  status: ApplicationStatus;
  detailsSource: DetailsSource;
  createdAt: number;
  updatedAt: number;
  notes: string;
  linkedTabIds: number[];
}

export type NewApplication = Pick<Application, 'jobUrl' | 'applyUrl' | 'origin' | 'detailsSource'> &
  Partial<Pick<Application, 'jobTitle' | 'company' | 'atsSource' | 'status' | 'notes'>>;

export type ApplicationPatch = Partial<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>;

function optionalString(value: unknown): { value: string } | null {
  return typeof value === 'string' ? { value } : null;
}

// Returns null when a required field is missing or invalid, so bad records are dropped on read.
export function normalizeApplication(raw: unknown): Application | null {
  if (!isRecord(raw)) return null;
  const origin = asOneOf(raw.origin, ORIGINS);
  const status = asOneOf(raw.status, STATUSES);
  const detailsSource = asOneOf(raw.detailsSource, DETAILS_SOURCES);
  const createdAt = asFiniteNumber(raw.createdAt);
  const updatedAt = asFiniteNumber(raw.updatedAt);
  const id = asString(raw.id);
  if (!id || !origin || !status || !detailsSource || createdAt === null || updatedAt === null) {
    return null;
  }
  if (typeof raw.jobUrl !== 'string' || typeof raw.applyUrl !== 'string') return null;

  const jobTitle = optionalString(raw.jobTitle);
  const company = optionalString(raw.company);
  const atsSource = optionalString(raw.atsSource);
  return {
    id,
    ...(jobTitle && { jobTitle: jobTitle.value }),
    ...(company && { company: company.value }),
    jobUrl: raw.jobUrl,
    applyUrl: raw.applyUrl,
    ...(atsSource && { atsSource: atsSource.value }),
    origin,
    status,
    detailsSource,
    createdAt,
    updatedAt,
    notes: asString(raw.notes),
    linkedTabIds: asArray(raw.linkedTabIds, asFiniteNumber),
  };
}

export function normalizeApplications(raw: unknown): Application[] {
  return asArray(raw, normalizeApplication);
}

export async function listApplications(): Promise<Application[]> {
  return normalizeApplications(await read('local', KEYS.applications));
}

export async function getApplication(id: string): Promise<Application | null> {
  return (await listApplications()).find((application) => application.id === id) ?? null;
}

export function createApplication(input: NewApplication): Promise<Application> {
  return serialized(KEYS.applications, async () => {
    const now = Date.now();
    const application: Application = {
      status: 'in_progress',
      notes: '',
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      linkedTabIds: [],
    };
    await write('local', KEYS.applications, [...(await listApplications()), application]);
    return application;
  });
}

// The patch is built inside the queue so it always sees the latest record.
function applyUpdate(
  id: string,
  buildPatch: (current: Application) => ApplicationPatch,
): Promise<Application | null> {
  return serialized(KEYS.applications, async () => {
    const applications = await listApplications();
    const current = applications.find((application) => application.id === id);
    if (!current) return null;
    const updated = normalizeApplication({
      ...current,
      ...buildPatch(current),
      updatedAt: Date.now(),
    });
    if (!updated) return null;
    const next = applications.map((application) => (application.id === id ? updated : application));
    await write('local', KEYS.applications, next);
    return updated;
  });
}

export function updateApplication(
  id: string,
  patch: ApplicationPatch,
): Promise<Application | null> {
  return applyUpdate(id, () => patch);
}

export function linkTab(id: string, tabId: number): Promise<Application | null> {
  return applyUpdate(id, ({ linkedTabIds }) => ({
    linkedTabIds: linkedTabIds.includes(tabId) ? linkedTabIds : [...linkedTabIds, tabId],
  }));
}

const STATUS_ORDER: ApplicationStatus[] = [
  'in_progress',
  'waiting_on_you',
  'needs_review',
  'submitted',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

// The target stays. Anything it lacks comes from the source, and the furthest status wins.
export function mergeRecords(source: Application, target: Application): ApplicationPatch {
  const notes = [target.notes, source.notes].filter(Boolean).join('\n');
  const status =
    STATUS_ORDER.indexOf(source.status) > STATUS_ORDER.indexOf(target.status)
      ? source.status
      : target.status;
  const jobTitle = target.jobTitle || source.jobTitle;
  const company = target.company || source.company;
  const atsSource = target.atsSource || source.atsSource;
  return {
    status,
    notes,
    linkedTabIds: [...new Set([...target.linkedTabIds, ...source.linkedTabIds])],
    ...(jobTitle && { jobTitle }),
    ...(company && { company }),
    ...(atsSource && { atsSource }),
  };
}

export function mergeApplications(sourceId: string, targetId: string): Promise<Application | null> {
  return serialized(KEYS.applications, async () => {
    const applications = await listApplications();
    const source = applications.find(({ id }) => id === sourceId);
    const target = applications.find(({ id }) => id === targetId);
    if (!source || !target || sourceId === targetId) return null;
    const merged = normalizeApplication({
      ...target,
      ...mergeRecords(source, target),
      updatedAt: Date.now(),
    });
    if (!merged) return null;
    const next = applications.flatMap((application) => {
      if (application.id === sourceId) return [];
      return [application.id === targetId ? merged : application];
    });
    await write('local', KEYS.applications, next);
    return merged;
  });
}
