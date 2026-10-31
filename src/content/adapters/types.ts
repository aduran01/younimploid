import type { PageClassification } from '../engine/classifier';
import type { FillResult } from '../../shared/storage/tabSession';

export type FieldKind = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'file';

export interface FieldCandidate {
  ref: string;
  kind: FieldKind;
  // The input itself, or every option of a radio group.
  elements: HTMLElement[];
  label: string;
  // Label-like text, strongest evidence first.
  signals: { text: string; weight: number }[];
  autocomplete: string;
  required: boolean;
}

export interface FillValue {
  field: FieldCandidate;
  value: string;
  profileKey: string;
}

export type NavResult = 'navigated' | 'not_found';

export interface JobDetails {
  title: string;
  company: string;
}

export interface ResumeUpload {
  file: File;
}

// There is deliberately no submit method: the user always submits (D-014).
export interface AtsAdapter {
  id: string;
  matches(url: URL): boolean;
  classifyPage?(doc: Document): PageClassification;
  goToApplicationForm?(doc: Document): Promise<NavResult>;
  collectFields(doc: Document): FieldCandidate[];
  fill(input: FillValue): Promise<FillResult>;
  attachResume?(doc: Document, upload: ResumeUpload): Promise<FillResult | null>;
  nextStep?(doc: Document): Promise<boolean>;
  // The application page's own title and company, for tracker entries without HiringCafe context.
  readJobDetails?(doc: Document): JobDetails | null;
}
