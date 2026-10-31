import type { AtsAdapter, FieldCandidate } from '../adapters/types';
import type { FillResult } from '../../shared/storage/tabSession';
import { maskValue } from '../../shared/mask';
import type { Profile } from '../../shared/storage/profile';
import { canFillChoice, readValue, result, sameValue } from './fill';
import { isConsentField, isResumeInput, matchField, profileValue } from './matcher';
import { isSensitiveField } from './sensitive';

export type FieldPlan =
  | { action: 'report'; report: FillResult }
  | { action: 'skip' }
  | { action: 'fill'; value: string; profileKey: string };

const ENTER_MANUALLY = 'Enter this one yourself.';
const SITE_DIFFERS = 'Site value differs from your profile.';

function isQuestion(field: FieldCandidate): boolean {
  return field.kind === 'textarea' || field.label.trim().endsWith('?');
}

// Sensitive and consent checks come first, before any value is read or matched.
export function planField(field: FieldCandidate, profile: Profile): FieldPlan {
  if (isSensitiveField(field)) {
    return { action: 'report', report: result(field, 'enter_manual', ENTER_MANUALLY) };
  }
  if (field.kind === 'checkbox') {
    // No checkbox is ever ticked, since many of them are attestations in disguise.
    return field.required || isConsentField(field)
      ? { action: 'report', report: result(field, 'needs_answer', 'Check this yourself.') }
      : { action: 'skip' };
  }
  if (field.kind === 'file') {
    return field.required && !readValue(field) && !isResumeInput(field)
      ? { action: 'report', report: result(field, 'needs_answer', 'Upload this yourself.') }
      : { action: 'skip' };
  }

  const key = matchField(field);
  const current = readValue(field);
  const value = key && profileValue(key, profile);

  if (current.trim()) {
    if (!value) return { action: 'skip' };
    return sameValue(current, value)
      ? { action: 'report', report: result(field, 'prefilled', '', key ?? '') }
      : { action: 'report', report: result(field, 'site_differs', SITE_DIFFERS, key ?? '') };
  }
  if (!key) {
    return field.required || isQuestion(field)
      ? { action: 'report', report: result(field, 'needs_answer', 'This needs your answer.') }
      : { action: 'skip' };
  }
  if (!value) {
    return field.required
      ? { action: 'report', report: result(field, 'missing_required', 'Not in your profile.', key) }
      : { action: 'skip' };
  }
  if ((field.kind === 'select' || field.kind === 'radio') && !canFillChoice(field, value)) {
    return {
      action: 'report',
      report: result(field, 'needs_answer', 'No option matches your profile.', key),
    };
  }
  return { action: 'fill', value, profileKey: key };
}

export interface FillPageInput {
  doc: Document;
  adapter: AtsAdapter;
  profile: Profile;
  resume: File | null;
  delayMs: number;
  // Waits until the page stops changing.
  settle: () => Promise<void>;
  // Checked before each field, so a wall stops filling within one field.
  shouldStop: () => boolean;
}

export interface FillPageOutput {
  results: FillResult[];
  stopped: boolean;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Order: resume, settle, fields, settle, then re-read everything written. Never submits.
export async function fillPage(input: FillPageInput): Promise<FillPageOutput> {
  const { doc, adapter, profile, resume, delayMs, settle, shouldStop } = input;
  const results: FillResult[] = [];
  if (shouldStop()) return { results, stopped: true };

  if (resume && adapter.attachResume) {
    const attached = await adapter.attachResume(doc, { file: resume });
    if (attached) results.push(attached);
    await settle();
    if (shouldStop()) return { results, stopped: true };
  }

  const written: { field: FieldCandidate; value: string; index: number }[] = [];
  for (const field of adapter.collectFields(doc)) {
    if (shouldStop()) return { results, stopped: true };
    const plan = planField(field, profile);
    if (plan.action === 'report') results.push(plan.report);
    if (plan.action !== 'fill') continue;

    const filled = await adapter.fill({ field, value: plan.value, profileKey: plan.profileKey });
    // Only the masked form leaves this page, so the audit log can't hold a personal value.
    results.push(
      filled.status === 'filled' ? { ...filled, maskedValue: maskValue(plan.value) } : filled,
    );
    if (filled.status === 'filled') {
      written.push({ field, value: readValue(field), index: results.length - 1 });
    }
    if (delayMs > 0) await wait(delayMs);
  }

  await settle();
  for (const { field, value, index } of written) {
    if (!sameValue(readValue(field), value)) {
      results[index] = result(
        field,
        'site_differs',
        'The site changed this after it was filled.',
        results[index]?.profileKey ?? '',
      );
    }
  }
  return { results, stopped: false };
}
