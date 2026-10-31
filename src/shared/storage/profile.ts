import { KEYS, asArray, asBoolean, asString, isRecord, read, write } from './core';

export const DECLINE_TO_ANSWER = 'Decline to answer';

// A chosen answer, DECLINE_TO_ANSWER, or null if the user hasn't answered yet.
export type Answer = string | null;

export interface Address {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export interface ProfileLink {
  label: string;
  url: string;
}

export interface WorkHistoryEntry {
  employer: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
}

export interface EducationEntry {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
}

export interface WorkAuthorizationAnswers {
  authorizedToWork: Answer;
  requiresSponsorship: Answer;
}

export interface EeoAnswers {
  gender: Answer;
  ethnicity: Answer;
  veteranStatus: Answer;
  disabilityStatus: Answer;
}

// Deliberately has no SSN, government ID, payment or password fields.
export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  // YYYY-MM-DD, or empty. Stored and filled by the user's choice (D-032).
  dateOfBirth: string;
  address: Address;
  links: ProfileLink[];
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  workAuthorization: WorkAuthorizationAnswers;
  eeo: EeoAnswers;
}

function asAnswer(value: unknown): Answer {
  return typeof value === 'string' ? value : null;
}

function normalizeLink(raw: unknown): ProfileLink | null {
  if (!isRecord(raw)) return null;
  return { label: asString(raw.label), url: asString(raw.url) };
}

function normalizeWork(raw: unknown): WorkHistoryEntry | null {
  if (!isRecord(raw)) return null;
  return {
    employer: asString(raw.employer),
    title: asString(raw.title),
    location: asString(raw.location),
    startDate: asString(raw.startDate),
    endDate: asString(raw.endDate),
    current: asBoolean(raw.current, false),
    description: asString(raw.description),
  };
}

function normalizeEducation(raw: unknown): EducationEntry | null {
  if (!isRecord(raw)) return null;
  return {
    school: asString(raw.school),
    degree: asString(raw.degree),
    fieldOfStudy: asString(raw.fieldOfStudy),
    startDate: asString(raw.startDate),
    endDate: asString(raw.endDate),
  };
}

// Copies known fields only, so unknown or sensitive fields can never enter the profile.
export function normalizeProfile(raw: unknown): Profile {
  const source = isRecord(raw) ? raw : {};
  const address = isRecord(source.address) ? source.address : {};
  const authorization = isRecord(source.workAuthorization) ? source.workAuthorization : {};
  const eeo = isRecord(source.eeo) ? source.eeo : {};
  return {
    firstName: asString(source.firstName),
    lastName: asString(source.lastName),
    email: asString(source.email),
    phone: asString(source.phone),
    dateOfBirth: asString(source.dateOfBirth),
    address: {
      line1: asString(address.line1),
      line2: asString(address.line2),
      city: asString(address.city),
      region: asString(address.region),
      postalCode: asString(address.postalCode),
      country: asString(address.country),
    },
    links: asArray(source.links, normalizeLink),
    workHistory: asArray(source.workHistory, normalizeWork),
    education: asArray(source.education, normalizeEducation),
    workAuthorization: {
      authorizedToWork: asAnswer(authorization.authorizedToWork),
      requiresSponsorship: asAnswer(authorization.requiresSponsorship),
    },
    eeo: {
      gender: asAnswer(eeo.gender),
      ethnicity: asAnswer(eeo.ethnicity),
      veteranStatus: asAnswer(eeo.veteranStatus),
      disabilityStatus: asAnswer(eeo.disabilityStatus),
    },
  };
}

export function defaultProfile(): Profile {
  return normalizeProfile(undefined);
}

export async function getProfile(): Promise<Profile> {
  return normalizeProfile(await read('local', KEYS.profile));
}

export async function saveProfile(profile: Profile): Promise<void> {
  await write('local', KEYS.profile, normalizeProfile(profile));
}
