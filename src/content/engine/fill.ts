import type { FieldCandidate } from '../adapters/types';
import type { FillResult, FillStatus } from '../../shared/storage/tabSession';
import { matchOption } from './matcher';
import { normalizeText, textOf } from './signals';

export function result(
  field: FieldCandidate,
  status: FillStatus,
  note = '',
  profileKey = '',
): FillResult {
  return { field: field.label || 'Unlabeled field', status, note, ref: field.ref, profileKey };
}

function fireEvents(element: HTMLElement): void {
  for (const type of ['input', 'change', 'focusout', 'blur']) {
    element.dispatchEvent(new Event(type, { bubbles: type !== 'blur' }));
  }
}

// Going through the prototype's setter is what makes React-controlled inputs notice the change.
function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
}

function radioLabel(radio: HTMLInputElement): string {
  const labels = radio.labels ? Array.from(radio.labels) : [];
  return textOf(labels[0]) || radio.getAttribute('aria-label') || radio.value;
}

// A select's first option with no value is its placeholder, not an answer.
function selectedOption(select: HTMLSelectElement): HTMLOptionElement | null {
  const option = select.options[select.selectedIndex];
  if (!option || option.value === '') return null;
  return /^(select|choose|please|--)/i.test(textOf(option)) ? null : option;
}

// What the field holds now, as text. Never call this on a sensitive field.
export function readValue(field: FieldCandidate): string {
  const element = field.elements[0];
  if (field.kind === 'radio') {
    const checked = (field.elements as HTMLInputElement[]).find((radio) => radio.checked);
    return checked ? radioLabel(checked) : '';
  }
  if (element instanceof HTMLSelectElement) return textOf(selectedOption(element));
  if (element instanceof HTMLInputElement && field.kind === 'file') {
    return element.files?.[0]?.name ?? '';
  }
  return (element as HTMLInputElement | HTMLTextAreaElement).value;
}

// Compares ignoring case, punctuation and spacing, so "(555) 010" equals "555-010".
export function sameValue(a: string, b: string): boolean {
  return normalizeText(a).replace(/ /g, '') === normalizeText(b).replace(/ /g, '');
}

function fitDateFormat(field: FieldCandidate, value: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const element = field.elements[0];
  if (!parts || !(element instanceof HTMLInputElement) || element.type === 'date') return value;
  return /^(mm|m)\W/i.test(element.placeholder) ? `${parts[2]}/${parts[3]}/${parts[1]}` : value;
}

export function canFillChoice(field: FieldCandidate, value: string): boolean {
  return choiceIndex(field, value) !== null;
}

function choiceIndex(field: FieldCandidate, value: string): number | null {
  const element = field.elements[0];
  if (element instanceof HTMLSelectElement) {
    const options = Array.from(element.options).map((option) =>
      option.value === '' ? '' : textOf(option),
    );
    return matchOption(options, value);
  }
  return matchOption((field.elements as HTMLInputElement[]).map(radioLabel), value);
}

// Never touches a submit control: only value setters, and clicks on radios.
export async function fillField(
  field: FieldCandidate,
  value: string,
  profileKey: string,
): Promise<FillResult> {
  const element = field.elements[0];
  if (!element || !element.isConnected) return result(field, 'failed', 'The field went away.');

  if (field.kind === 'text' || field.kind === 'textarea') {
    const text = fitDateFormat(field, value);
    setNativeValue(element as HTMLInputElement, text);
    fireEvents(element);
    return sameValue(readValue(field), text)
      ? result(field, 'filled', '', profileKey)
      : result(field, 'failed', 'The site rejected this value.', profileKey);
  }

  const index = choiceIndex(field, value);
  if (index === null) return result(field, 'needs_answer', 'No option matches your profile.');
  if (element instanceof HTMLSelectElement) {
    element.selectedIndex = index;
    fireEvents(element);
  } else {
    const radio = field.elements[index] as HTMLInputElement | undefined;
    if (radio?.type !== 'radio') return result(field, 'failed', 'Could not choose an option.');
    radio.click();
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return result(field, 'filled', '', profileKey);
}

// DataTransfer is the only way to give a file input a file from script.
export function attachFile(input: HTMLInputElement, file: File): boolean {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  fireEvents(input);
  return input.files?.[0]?.name === file.name;
}
