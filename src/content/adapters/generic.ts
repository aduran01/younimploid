import { classifyPage } from '../engine/classifier';
import { collectFields } from '../engine/fields';
import { attachFile, fillField, readValue, result } from '../engine/fill';
import { isResumeInput } from '../engine/matcher';
import { isSensitiveField } from '../engine/sensitive';
import type { AtsAdapter } from './types';

// Used on every site until a site's own adapter overrides part of it.
export const genericAdapter: AtsAdapter = {
  id: 'generic',
  matches: () => true,
  classifyPage,
  collectFields,
  fill: ({ field, value, profileKey }) => fillField(field, value, profileKey),
  attachResume: async (doc, { file }) => {
    const inputs = collectFields(doc).filter(
      (field) => field.kind === 'file' && !isSensitiveField(field),
    );
    // Only a labeled resume input, or the page's only file input. Never a guess between several.
    const target = inputs.find(isResumeInput) ?? (inputs.length === 1 ? inputs[0] : undefined);
    if (!target) return null;
    if (readValue(target)) return result(target, 'prefilled', 'The site already has a file.');
    const attached = attachFile(target.elements[0] as HTMLInputElement, file);
    return attached
      ? result(target, 'filled', file.name, 'resume')
      : result(target, 'failed', 'The site did not accept the file.', 'resume');
  },
};
