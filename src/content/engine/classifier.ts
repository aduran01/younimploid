import type { PageState } from '../../shared/storage/tabSession';
import { collectFields } from './fields';
import { matchField } from './matcher';
import { isSensitiveField } from './sensitive';
import { isVisible, normalizeText, textOf } from './signals';

export interface PageClassification {
  state: PageState;
  // True when the page might be either a wall or a form, so the user is asked.
  ambiguous: boolean;
  evidence: string[];
}

// Detection only looks at whether these exist. Nothing here reads into or touches them.
const CHALLENGE_SELECTOR = [
  'iframe[src*="recaptcha"]',
  'iframe[src*="hcaptcha"]',
  'iframe[src*="challenges.cloudflare.com"]',
  'iframe[src*="arkoselabs"]',
  'iframe[src*="funcaptcha"]',
  '.g-recaptcha',
  '.h-captcha',
  '.cf-turnstile',
  '#challenge-form',
].join(', ');

const SIGN_IN = /\b(sign in|signin|log in|login|welcome back)\b/;
const CREATE_ACCOUNT = /\b(create (an |your )?account|sign up|signup|register|new account)\b/;
const OAUTH =
  /\b(continue|sign in|log in|sign up) with (google|linkedin|apple|microsoft|facebook)\b/;
const VERIFICATION =
  /\b(verify your (email|account|identity)|verification code|enter the code|check your email|we sent (you )?a (code|link))\b/;
const CONFIRMATION =
  /\b(thank you for applying|thanks for applying|application (was )?(received|submitted)|successfully (applied|submitted)|we received your application|we ve received your application)\b/;
const APPLY_CONTROL = /^(apply|apply now|apply for this job|start application)\b/;

// Headings and controls only. Job descriptions are full of words like "register" and "log in".
function prominentText(doc: Document): string[] {
  const elements = doc.querySelectorAll(
    'h1, h2, h3, legend, button, a[role="button"], input[type="submit"], input[type="button"]',
  );
  const texts = Array.from(elements)
    .filter(isVisible)
    .map((element) => normalizeText(textOf(element) || element.getAttribute('value') || ''));
  return [normalizeText(doc.title), ...texts].filter(Boolean);
}

function isChallengeVisible(element: Element): boolean {
  if (!isVisible(element)) return false;
  // Invisible reCAPTCHA sits quietly on many real application forms and isn't asking anything.
  if (element.closest('.grecaptcha-badge')) return false;
  const src = element.getAttribute('src') ?? '';
  if (/size=invisible/.test(src)) return false;
  return element.getAttribute('data-size') !== 'invisible';
}

export interface ClassifyOptions {
  // For a site whose widget is on every form and shows nothing until the user submits.
  // A visible challenge frame still matches its own selector, so it always stops the fill.
  ignoreChallenge?: (element: Element) => boolean;
}

export function classifyPage(doc: Document, options: ClassifyOptions = {}): PageClassification {
  const done = (state: PageState, evidence: string[], ambiguous = false): PageClassification => ({
    state,
    ambiguous,
    evidence,
  });

  const challenges = Array.from(doc.querySelectorAll(CHALLENGE_SELECTOR));
  if (challenges.some((el) => isChallengeVisible(el) && !options.ignoreChallenge?.(el))) {
    return done('captcha', ['A visible challenge widget']);
  }

  const texts = prominentText(doc);
  const says = (pattern: RegExp) => texts.some((text) => pattern.test(text));
  const passwords = Array.from(doc.querySelectorAll('input[type="password"]')).filter(isVisible);
  const fields = collectFields(doc);
  const usable = fields.filter((field) => field.kind !== 'checkbox' && !isSensitiveField(field));
  const hasResumeOrWork = usable.some(
    (field) =>
      field.kind === 'file' ||
      ['currentEmployer', 'currentTitle', 'school', 'authorizedToWork', 'linkedin'].includes(
        matchField(field) ?? '',
      ),
  );
  const matched = usable.filter((field) => matchField(field) !== null).length;
  const hasApplicationQuestions = hasResumeOrWork && usable.length >= 3;

  const codeInput = doc.querySelector(
    'input[autocomplete="one-time-code"], input[name*="otp" i], input[name*="verification" i], input[id*="verification" i]',
  );
  if ((codeInput && isVisible(codeInput)) || (says(VERIFICATION) && usable.length <= 3)) {
    return done('verification', ['A verification code input or wording']);
  }

  if (passwords.length > 0) {
    const creating = passwords.length >= 2 || says(CREATE_ACCOUNT);
    const state = creating ? 'create_account' : 'sign_in';
    const evidence = [`${passwords.length} password field(s)`];
    // An account form that also asks application questions is the user's call.
    return hasApplicationQuestions
      ? done(state, [...evidence, 'Application questions on the same page'], true)
      : done(state, evidence);
  }

  if (says(CONFIRMATION) && !hasApplicationQuestions) {
    return done('confirmation', ['Confirmation wording']);
  }

  // Name, email and phone under a sign-up heading could be either kind of page.
  if (!hasResumeOrWork && matched >= 2 && (says(CREATE_ACCOUNT) || says(SIGN_IN))) {
    return done('create_account', ['Account wording with contact fields'], true);
  }

  if (hasApplicationQuestions || (matched >= 3 && usable.length >= 3)) {
    return done('application_form', [`${matched} matched of ${usable.length} usable fields`]);
  }

  // A passwordless wall: sign-in wording or OAuth buttons, and little else to fill.
  if (usable.length <= 2 && (says(SIGN_IN) || says(OAUTH))) {
    return done('sign_in', ['Sign-in wording and few fields']);
  }
  if (usable.length <= 2 && says(CREATE_ACCOUNT)) {
    return done('create_account', ['Create-account wording and few fields']);
  }

  const hasJobPosting = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).some(
    (script) => /"@type"\s*:\s*"JobPosting"/.test(script.textContent ?? ''),
  );
  const anchors = Array.from(doc.querySelectorAll('a, button')).filter(isVisible);
  const hasApply = anchors.some((element) => APPLY_CONTROL.test(normalizeText(textOf(element))));
  if (usable.length <= 2 && (hasApply || hasJobPosting)) {
    return done('job_description', [hasApply ? 'An Apply control' : 'JobPosting data']);
  }

  return done('unknown', [`${matched} matched of ${usable.length} usable fields`], true);
}

export function isWall(state: PageState): boolean {
  return (
    state === 'sign_in' ||
    state === 'create_account' ||
    state === 'verification' ||
    state === 'captcha'
  );
}
