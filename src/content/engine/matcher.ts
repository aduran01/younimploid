import type { FieldCandidate } from '../adapters/types';
import type { Profile } from '../../shared/storage/profile';
import { containsPhrase, normalizeText } from './signals';

export type ProfileKey =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'dateOfBirth'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'region'
  | 'postalCode'
  | 'country'
  | 'linkedin'
  | 'github'
  | 'website'
  | 'currentEmployer'
  | 'currentTitle'
  | 'school'
  | 'degree'
  | 'fieldOfStudy'
  | 'authorizedToWork'
  | 'requiresSponsorship'
  | 'gender'
  | 'ethnicity'
  | 'veteranStatus'
  | 'disabilityStatus';

// "exact" phrases must be the whole label, because words like "name" appear everywhere.
const SYNONYMS: Record<ProfileKey, { contains?: string[]; exact?: string[] }> = {
  firstName: { contains: ['first name', 'given name', 'fname'] },
  lastName: { contains: ['last name', 'family name', 'surname', 'lname'] },
  fullName: { contains: ['full name', 'legal name', 'your name'], exact: ['name'] },
  email: { contains: ['email', 'e mail'] },
  phone: { contains: ['phone', 'mobile', 'telephone', 'cell'] },
  dateOfBirth: { contains: ['date of birth', 'birth date', 'birthdate', 'dob', 'birthday'] },
  addressLine1: { contains: ['address line 1', 'street address', 'address 1'], exact: ['address'] },
  addressLine2: { contains: ['address line 2', 'address 2', 'apartment', 'suite'] },
  city: { contains: ['city', 'town'] },
  region: { contains: ['province'], exact: ['state', 'region', 'state or region'] },
  postalCode: { contains: ['zip', 'postal code', 'postcode'] },
  country: { exact: ['country', 'country of residence'] },
  // Normalizing splits the capitals in LinkedIn and GitHub.
  linkedin: { contains: ['linkedin', 'linked in'] },
  github: { contains: ['github', 'git hub'] },
  website: { contains: ['website', 'portfolio', 'personal site'] },
  currentEmployer: {
    contains: ['current company', 'current employer'],
    exact: ['company', 'employer'],
  },
  currentTitle: { contains: ['current title', 'job title'], exact: ['title'] },
  school: { contains: ['school', 'university', 'college', 'institution'] },
  degree: { exact: ['degree', 'degree type', 'highest degree'] },
  fieldOfStudy: { contains: ['field of study', 'major', 'discipline'] },
  authorizedToWork: {
    contains: ['authorized to work', 'authorised to work', 'eligible to work', 'right to work'],
  },
  requiresSponsorship: { contains: ['sponsorship', 'sponsor'] },
  gender: { contains: ['gender'] },
  ethnicity: { contains: ['ethnicity', 'race', 'hispanic'] },
  veteranStatus: { contains: ['veteran'] },
  disabilityStatus: { contains: ['disability', 'disabled'] },
};

// These keys are usually asked as whole sentences, so long labels may still match them.
const QUESTION_KEYS = new Set<ProfileKey>([
  'authorizedToWork',
  'requiresSponsorship',
  'gender',
  'ethnicity',
  'veteranStatus',
  'disabilityStatus',
]);

const AUTOCOMPLETE: Record<string, ProfileKey> = {
  'given-name': 'firstName',
  'family-name': 'lastName',
  name: 'fullName',
  email: 'email',
  tel: 'phone',
  bday: 'dateOfBirth',
  'street-address': 'addressLine1',
  'address-line1': 'addressLine1',
  'address-line2': 'addressLine2',
  'address-level2': 'city',
  'address-level1': 'region',
  'postal-code': 'postalCode',
  country: 'country',
  'country-name': 'country',
  organization: 'currentEmployer',
  'organization-title': 'currentTitle',
  url: 'website',
};

// Someone else's details, even though the label says "name" or "email".
const OTHER_PERSON = [
  'reference',
  'referral',
  'referred',
  'referrer',
  'emergency',
  'manager',
  'supervisor',
  'spouse',
  'parent',
  'guardian',
  'recruiter',
];

const MAX_STATEMENT_WORDS = 8;

export function matchField(field: FieldCandidate): ProfileKey | null {
  const direct = AUTOCOMPLETE[field.autocomplete.split(/\s+/).pop() ?? ''];
  if (direct) return direct;

  let best: { key: ProfileKey; score: number } | null = null;
  for (const { text, weight } of field.signals) {
    const normalized = normalizeText(text);
    if (OTHER_PERSON.some((word) => containsPhrase(normalized, word))) return null;
    const isLong = normalized.split(' ').length > MAX_STATEMENT_WORDS;

    for (const [key, { contains = [], exact = [] }] of Object.entries(SYNONYMS) as [
      ProfileKey,
      { contains?: string[]; exact?: string[] },
    ][]) {
      if (isLong && !QUESTION_KEYS.has(key)) continue;
      for (const phrase of contains) {
        if (containsPhrase(normalized, phrase)) {
          const score = weight * 10 + phrase.length;
          if (!best || score > best.score) best = { key, score };
        }
      }
      if (exact.includes(normalized)) {
        const score = weight * 10 + normalized.length + 5;
        if (!best || score > best.score) best = { key, score };
      }
    }
  }
  return best?.key ?? null;
}

function linkMatching(profile: Profile, pattern: RegExp): string | null {
  const link = profile.links.find(({ label, url }) => pattern.test(label) || pattern.test(url));
  return link?.url ?? null;
}

// Returns null when the profile has nothing to offer for this key.
export function profileValue(key: ProfileKey, profile: Profile): string | null {
  const job = profile.workHistory.find(({ current }) => current);
  const school = profile.education[0];
  const values: Record<ProfileKey, string | null | undefined> = {
    firstName: profile.firstName,
    lastName: profile.lastName,
    fullName: `${profile.firstName} ${profile.lastName}`.trim(),
    email: profile.email,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    addressLine1: profile.address.line1,
    addressLine2: profile.address.line2,
    city: profile.address.city,
    region: profile.address.region,
    postalCode: profile.address.postalCode,
    country: profile.address.country,
    linkedin: linkMatching(profile, /linkedin/i),
    github: linkMatching(profile, /github/i),
    website: linkMatching(profile, /portfolio|website|personal/i),
    currentEmployer: job?.employer,
    currentTitle: job?.title,
    school: school?.school,
    degree: school?.degree,
    fieldOfStudy: school?.fieldOfStudy,
    authorizedToWork: profile.workAuthorization.authorizedToWork,
    requiresSponsorship: profile.workAuthorization.requiresSponsorship,
    gender: profile.eeo.gender,
    ethnicity: profile.eeo.ethnicity,
    veteranStatus: profile.eeo.veteranStatus,
    disabilityStatus: profile.eeo.disabilityStatus,
  };
  return values[key]?.trim() || null;
}

const DECLINE = /decline|prefer not|do not wish|don t wish|choose not|not to (say|answer|disclose)/;

// Finds the one option meaning this answer. Several candidates means asking the user instead.
export function matchOption(options: string[], value: string): number | null {
  const wanted = normalizeText(value);
  const normalized = options.map(normalizeText);
  const exact = normalized.indexOf(wanted);
  if (exact !== -1) return exact;

  if (DECLINE.test(wanted)) {
    const declines = normalized.flatMap((text, index) => (DECLINE.test(text) ? [index] : []));
    return declines.length === 1 ? (declines[0] ?? null) : null;
  }
  // "Yes" and "No" must not match by containment, since option text often repeats them.
  if (wanted === 'yes' || wanted === 'no') {
    const starts = normalized.flatMap((text, index) =>
      text.split(' ')[0] === wanted ? [index] : [],
    );
    return starts.length === 1 ? (starts[0] ?? null) : null;
  }
  const partial = normalized.flatMap((text, index) =>
    text && (containsPhrase(text, wanted) || containsPhrase(wanted, text)) ? [index] : [],
  );
  return partial.length === 1 ? (partial[0] ?? null) : null;
}

const CONSENT =
  /consent|agree|attest|certif|acknowledg|authori[sz]e|terms|privacy|understand|accept/;

export function isConsentField(field: FieldCandidate): boolean {
  return field.signals.some(({ text }) => CONSENT.test(normalizeText(text)));
}

const RESUME = /\b(resume|cv|curriculum vitae)\b/;
const NOT_RESUME = /\b(cover letter|transcript|portfolio|photo|writing sample)\b/;

export function isResumeInput(field: FieldCandidate): boolean {
  if (field.kind !== 'file') return false;
  const text = field.signals.map((signal) => normalizeText(signal.text)).join(' ');
  return RESUME.test(text) && !NOT_RESUME.test(text);
}
