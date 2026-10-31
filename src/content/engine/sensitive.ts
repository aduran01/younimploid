import type { FieldCandidate } from '../adapters/types';
import { containsPhrase, normalizeText } from './signals';

// Date of birth is deliberately absent: the user chose to store and fill it (D-032).
const SENSITIVE_PHRASES = [
  'ssn',
  'social security',
  'social insurance',
  'tax id',
  'taxpayer',
  'tin',
  'itin',
  'ein',
  'passport',
  'driver license',
  'drivers license',
  'driver s license',
  'driving licence',
  'driving license',
  'driver licence',
  'dl number',
  'national id',
  'government id',
  'card number',
  'credit card',
  'debit card',
  'cc number',
  'cvv',
  'cvc',
  'security code',
  'routing',
  'account number',
  'iban',
  'password',
  'passcode',
  'pin number',
];

const SENSITIVE_AUTOCOMPLETE = /^(cc-|current-password|new-password|one-time-code)/;

// Runs before matching. Reads only the field's descriptions, never its value.
export function isSensitiveField(field: FieldCandidate): boolean {
  if (field.elements.some((element) => element.getAttribute('type') === 'password')) return true;
  if (SENSITIVE_AUTOCOMPLETE.test(field.autocomplete)) return true;
  return field.signals.some(({ text }) => {
    const normalized = normalizeText(text);
    return SENSITIVE_PHRASES.some((phrase) => containsPhrase(normalized, phrase));
  });
}
