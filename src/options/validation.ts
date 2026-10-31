import type { Profile } from '../shared/storage/profile';

// Maps a field path, such as "workHistory.0.employer", to its error message.
export type ProfileErrors = Record<string, string>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{7,}$/;

function isWebUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Dates are YYYY-MM strings from month inputs, so they compare correctly as text.
function endsBeforeStart(startDate: string, endDate: string): boolean {
  return Boolean(startDate && endDate && endDate < startDate);
}

// Blank optional fields are fine, so a partly finished profile can still be saved.
export function validateProfile(profile: Profile): ProfileErrors {
  const errors: ProfileErrors = {};
  if (profile.email && !EMAIL.test(profile.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (profile.phone && !PHONE.test(profile.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }
  profile.links.forEach((link, index) => {
    if (!link.url.trim()) errors[`links.${index}.url`] = 'Enter a URL or remove this link.';
    else if (!isWebUrl(link.url.trim())) {
      errors[`links.${index}.url`] = 'Enter a full URL starting with https://.';
    }
  });
  profile.workHistory.forEach((entry, index) => {
    if (!entry.employer.trim()) errors[`workHistory.${index}.employer`] = 'Enter the employer.';
    if (!entry.title.trim()) errors[`workHistory.${index}.title`] = 'Enter your title.';
    if (!entry.current && endsBeforeStart(entry.startDate, entry.endDate)) {
      errors[`workHistory.${index}.endDate`] = 'The end date is before the start date.';
    }
  });
  profile.education.forEach((entry, index) => {
    if (!entry.school.trim()) errors[`education.${index}.school`] = 'Enter the school.';
    if (endsBeforeStart(entry.startDate, entry.endDate)) {
      errors[`education.${index}.endDate`] = 'The end date is before the start date.';
    }
  });
  return errors;
}

const RESUME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Returns the MIME type to store, or null if the file isn't a PDF or DOCX.
// Goes by extension because browsers can report an empty type for DOCX files.
export function resumeMimeType(filename: string): string | null {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  return RESUME_TYPES[extension] ?? null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
