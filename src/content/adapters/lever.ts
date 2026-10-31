import { classifyPage } from '../engine/classifier';
import { collectFields } from '../engine/fields';
import { isVisible, normalizeText, textOf } from '../engine/signals';
import { genericAdapter } from './generic';
import type { AtsAdapter, FieldCandidate } from './types';

const HOST = 'jobs.lever.co';
// Exact wording only, so "Apply with LinkedIn" and the like never match.
const OWN_APPLY = /^apply( for this job)?$/;

// Every form has this widget for submit time. Empty or with hidden frames, it isn't asking anything.
function isIdlePlaceholder(element: Element): boolean {
  return (
    element.matches('.h-captcha') && !Array.from(element.querySelectorAll('iframe')).some(isVisible)
  );
}

function cardLabel(card: Element): string {
  const label = card.querySelector('.application-label');
  return textOf(label?.querySelector('.text') ?? label).replace(/\s*✱.*$/, '');
}

// Question text goes in the label only, so a custom question is never matched to a profile value.
function collectLeverFields(doc: Document): FieldCandidate[] {
  const seenGroups = new Set<Element>();
  return collectFields(doc).flatMap((field) => {
    const card = field.elements[0]?.closest('.application-question');
    if (!card) return [field];
    if (field.kind === 'checkbox' && card.matches('.custom-question')) {
      if (seenGroups.has(card)) return [];
      seenGroups.add(card);
    }
    return [
      {
        ...field,
        label: cardLabel(card) || field.label,
        required: field.required || card.querySelector('.application-label .required') !== null,
      },
    ];
  });
}

export const leverAdapter: AtsAdapter = {
  ...genericAdapter,
  id: 'lever',
  matches: (url) => url.hostname === HOST,
  classifyPage: (doc) => classifyPage(doc, { ignoreChallenge: isIdlePlaceholder }),
  collectFields: collectLeverFields,
  goToApplicationForm: async (doc) => {
    const link = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a.postings-btn[href]')).find(
      (anchor) =>
        OWN_APPLY.test(normalizeText(textOf(anchor))) &&
        new URL(anchor.href).hostname === HOST &&
        isVisible(anchor),
    );
    if (!link) return 'not_found';
    link.click();
    return 'navigated';
  },
  readJobDetails: (doc) => {
    const parts = /^(.+?) - (.+)$/.exec(doc.title.trim());
    return parts ? { company: parts[1] ?? '', title: parts[2] ?? '' } : null;
  },
};
