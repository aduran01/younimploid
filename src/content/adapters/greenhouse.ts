import { result } from '../engine/fill';
import { genericAdapter } from './generic';
import type { AtsAdapter } from './types';

const HOSTS = ['boards.greenhouse.io', 'job-boards.greenhouse.io'];

// The form sits on the same page as the description, so there is nothing to navigate to.
export const greenhouseAdapter: AtsAdapter = {
  ...genericAdapter,
  id: 'greenhouse',
  matches: (url) => HOSTS.includes(url.hostname),
  // Dropdowns are React-Select. Text typed into one isn't an answer, so the user chooses (D-038).
  fill: (input) =>
    input.field.elements[0]?.getAttribute('role') === 'combobox'
      ? Promise.resolve(result(input.field, 'needs_answer', 'Choose this one yourself.'))
      : genericAdapter.fill(input),
  readJobDetails: (doc) => {
    const parts = /^Job Application for (.+) at (.+)$/.exec(doc.title.trim());
    return parts ? { title: parts[1] ?? '', company: parts[2] ?? '' } : null;
  },
};
