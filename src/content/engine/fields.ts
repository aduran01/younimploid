import type { FieldCandidate, FieldKind } from '../adapters/types';
import { collectSignals, isVisible, textOf } from './signals';

const SKIPPED_TYPES = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'image',
  'search',
  'color',
  'range',
]);

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function kindOf(control: FormControl): FieldKind {
  if (control instanceof HTMLSelectElement) return 'select';
  if (control instanceof HTMLTextAreaElement) return 'textarea';
  if (control.type === 'radio') return 'radio';
  if (control.type === 'checkbox') return 'checkbox';
  if (control.type === 'file') return 'file';
  return 'text';
}

function isFillable(control: FormControl): boolean {
  if (control.disabled) return false;
  if (control instanceof HTMLInputElement && SKIPPED_TYPES.has(control.type)) return false;
  if ('readOnly' in control && control.readOnly) return false;
  // Styled file inputs are often hidden behind a button, but still accept files.
  if (control instanceof HTMLInputElement && control.type === 'file') return true;
  return isVisible(control);
}

function isRequired(control: FormControl): boolean {
  if (control.required || control.getAttribute('aria-required') === 'true') return true;
  return /\*\s*$/.test(collectSignals(control)[0]?.text ?? '');
}

function bestLabel(signals: { text: string }[]): string {
  return (signals[0]?.text ?? '').replace(/\s*\*\s*$/, '').slice(0, 120);
}

function radioGroupSignals(first: HTMLInputElement): { text: string; weight: number }[] {
  const group = first.closest('fieldset, [role="radiogroup"], [role="group"]');
  const legend = group?.querySelector('legend');
  const labelledById = group?.getAttribute('aria-labelledby');
  const signals = [
    { text: textOf(legend), weight: 3 },
    { text: group?.getAttribute('aria-label') ?? '', weight: 3 },
    {
      text: labelledById ? textOf(first.ownerDocument.getElementById(labelledById)) : '',
      weight: 3,
    },
    { text: first.name, weight: 1 },
  ];
  return signals.filter(({ text }) => text.trim() !== '');
}

// Refs are positions in this page's list, and are never written into the page.
export function collectFields(doc: Document): FieldCandidate[] {
  const controls = Array.from(doc.querySelectorAll<FormControl>('input, select, textarea')).filter(
    isFillable,
  );
  const fields: FieldCandidate[] = [];
  const seenGroups = new Set<string>();

  for (const control of controls) {
    const kind = kindOf(control);
    const ref = `field-${fields.length}`;
    const autocomplete = (control.getAttribute('autocomplete') ?? '').toLowerCase();

    if (control instanceof HTMLInputElement && kind === 'radio') {
      if (seenGroups.has(control.name)) continue;
      seenGroups.add(control.name);
      const elements = controls.filter(
        (other) =>
          other instanceof HTMLInputElement &&
          other.type === 'radio' &&
          other.name === control.name,
      );
      const signals = radioGroupSignals(control);
      fields.push({
        ref,
        kind,
        elements,
        signals,
        label: bestLabel(signals),
        autocomplete,
        required: elements.some(isRequired),
      });
      continue;
    }

    const signals = collectSignals(control);
    fields.push({
      ref,
      kind,
      elements: [control],
      signals,
      label: bestLabel(signals),
      autocomplete,
      required: isRequired(control),
    });
  }
  return fields;
}
