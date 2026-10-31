// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { greenhouseAdapter } from '../../src/content/adapters/greenhouse';
import { adapterFor } from '../../src/content/adapters';
import { leverAdapter } from '../../src/content/adapters/lever';
import type { AtsAdapter } from '../../src/content/adapters/types';
import { classifyPage } from '../../src/content/engine/classifier';
import { createController } from '../../src/content/engine/controller';
import { planField } from '../../src/content/engine/fillPage';
import { matchField } from '../../src/content/engine/matcher';
import type { FillData, FillReport } from '../../src/shared/messages';
import { findAtsSource, isSupportedSite } from '../../src/shared/atsSites';
import { defaultProfile, type Profile } from '../../src/shared/storage/profile';

const PROFILE: Profile = {
  ...defaultProfile(),
  firstName: 'Sam',
  lastName: 'Lee',
  email: 'sam@example.com',
  phone: '555-010-0000',
  links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/sam' }],
};

function load(fixture: string): void {
  const html = readFileSync(resolve(__dirname, '../fixtures/ats', fixture), 'utf8');
  document.documentElement.innerHTML = /<html[^>]*>([\s\S]*)<\/html>/.exec(html)?.[1] ?? html;
}

function mapping(adapter: AtsAdapter): Record<string, string | null> {
  return Object.fromEntries(
    adapter.collectFields(document).map((field) => [field.label, matchField(field)]),
  );
}

function planned(adapter: AtsAdapter, label: string) {
  const field = adapter.collectFields(document).find((item) => item.label === label);
  if (!field) throw new Error(`no field labeled ${label}`);
  return planField(field, PROFILE);
}

const FILL_DATA: FillData = {
  profile: PROFILE,
  resume: null,
  autoAttachResume: false,
  fieldDelayMs: 0,
};

function controllerFor(adapter: AtsAdapter) {
  const reports: FillReport[] = [];
  const controller = createController({
    doc: document,
    adapter,
    data: FILL_DATA,
    resume: null,
    settle: async () => undefined,
    report: (report) => reports.push(report),
  });
  return { controller, reports };
}

describe('registry', () => {
  it('routes hosts to their adapters and marks only built ones verified', () => {
    expect(adapterFor(new URL('https://job-boards.greenhouse.io/a/jobs/1')).id).toBe('greenhouse');
    expect(adapterFor(new URL('https://boards.greenhouse.io/a/jobs/1')).id).toBe('greenhouse');
    expect(adapterFor(new URL('https://jobs.lever.co/a/1')).id).toBe('lever');
    expect(adapterFor(new URL('https://jobs.ashbyhq.com/a/1')).id).toBe('generic');
    expect(isSupportedSite('https://jobs.lever.co/a/1')).toBe(true);
    expect(isSupportedSite('https://job-boards.greenhouse.io/a/jobs/1')).toBe(true);
    expect(isSupportedSite('https://jobs.ashbyhq.com/a/1')).toBe(false);
    expect(findAtsSource('https://jobs.ashbyhq.com/a/1')).toBe('ashby');
  });
});

describe.each(['figma-form.html', 'anthropic-form.html'])('Greenhouse %s', (fixture) => {
  const open = () => load(`greenhouse/${fixture}`);

  it('is an application form, and the reCAPTCHA-free page is not a wall', () => {
    open();
    expect(greenhouseAdapter.classifyPage?.(document).state ?? classifyPage(document).state).toBe(
      'application_form',
    );
  });

  it('maps the standard fields', () => {
    open();
    expect(mapping(greenhouseAdapter)).toMatchObject({
      'First Name': 'firstName',
      'Last Name': 'lastName',
      Email: 'email',
      Phone: 'phone',
      'LinkedIn Profile': 'linkedin',
    });
  });

  it('collects no unlabeled required shadow inputs', () => {
    open();
    const unlabeled = greenhouseAdapter.collectFields(document).filter((field) => !field.label);
    expect(unlabeled).toEqual([]);
  });

  it('flags a dropdown instead of typing into it', async () => {
    open();
    const country = greenhouseAdapter
      .collectFields(document)
      .find((field) => field.label === 'Country');
    if (!country) throw new Error('no country field');
    const filled = await greenhouseAdapter.fill({
      field: country,
      value: 'United States',
      profileKey: 'country',
    });
    expect(filled.status).toBe('needs_answer');
    expect((country.elements[0] as HTMLInputElement).value).toBe('');
  });

  it('still fills a plain text field', async () => {
    open();
    const email = greenhouseAdapter.collectFields(document).find((f) => f.label === 'Email');
    if (!email) throw new Error('no email field');
    const filled = await greenhouseAdapter.fill({
      field: email,
      value: 'sam@example.com',
      profileKey: 'email',
    });
    expect(filled.status).toBe('filled');
  });

  it('attaches the resume to the resume input', async () => {
    open();
    // jsdom has no DataTransfer, and its input only accepts a real FileList.
    vi.stubGlobal(
      'DataTransfer',
      class {
        files: File[] = [];
        items = { add: (file: File) => this.files.push(file) };
      },
    );
    Object.defineProperty(document.querySelector('#resume'), 'files', {
      writable: true,
      value: null,
    });
    const attach = greenhouseAdapter.attachResume?.(document, {
      file: new File(['x'], 'r.pdf'),
    });
    await expect(attach).resolves.toMatchObject({ profileKey: 'resume' });
    vi.unstubAllGlobals();
  });

  it('reads the job title and company', () => {
    open();
    const details = greenhouseAdapter.readJobDetails?.(document);
    expect(details?.title).toBeTruthy();
    expect(details?.company).toMatch(/Figma|Anthropic/);
  });
});

describe('Greenhouse custom questions', () => {
  it('asks the user about a required free-text question', () => {
    load('greenhouse/figma-form.html');
    expect(planned(greenhouseAdapter, 'Why do you want to join Figma?')).toMatchObject({
      action: 'report',
      report: { status: 'needs_answer' },
    });
  });
});

describe.each(['palantir', 'spotify'])('Lever %s', (company) => {
  const form = () => load(`lever/${company}-form.html`);
  const description = () => load(`lever/${company}-description.html`);

  it('classifies the description page', () => {
    description();
    expect(leverAdapter.classifyPage?.(document).state).toBe('job_description');
  });

  it('goes to the form through the site’s own Apply link, once per page', async () => {
    description();
    const clicks: string[] = [];
    const listening = new AbortController();
    document.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        clicks.push((event.target as HTMLAnchorElement).href);
      },
      { signal: listening.signal },
    );
    const { controller, reports } = controllerFor(leverAdapter);
    await controller.check();
    await controller.check();
    listening.abort();
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatch(/^https:\/\/jobs\.lever\.co\/.+\/apply$/);
    expect(reports[0]?.phase).toBe('running');
    expect(reports[1]?.phase).toBe('paused');
  });

  it('never chooses Apply with LinkedIn', async () => {
    document.documentElement.innerHTML =
      '<body><a class="postings-btn" href="https://jobs.lever.co/a/1/apply?source=x">Apply with LinkedIn</a></body>';
    expect(await leverAdapter.goToApplicationForm?.(document)).toBe('not_found');
  });

  it('is an application form despite the empty captcha placeholder', () => {
    form();
    expect(document.querySelector('.h-captcha')).not.toBeNull();
    expect(classifyPage(document).state).toBe('captcha');
    expect(leverAdapter.classifyPage?.(document).state).toBe('application_form');
  });

  it('stops when a challenge is actually showing', () => {
    form();
    const frame = document.createElement('iframe');
    frame.setAttribute('src', 'https://newassets.hcaptcha.com/captcha/v1/x/static/hcaptcha.html');
    document.querySelector('.h-captcha')?.append(frame);
    expect(leverAdapter.classifyPage?.(document).state).toBe('captcha');
  });

  it('maps the standard fields, with clean labels', () => {
    form();
    expect(mapping(leverAdapter)).toMatchObject({
      'Full name': 'fullName',
      Email: 'email',
      Phone: 'phone',
      'Current company': 'currentEmployer',
      'LinkedIn URL': 'linkedin',
      'GitHub URL': 'github',
    });
  });

  it('asks about the required location', () => {
    form();
    expect(planned(leverAdapter, 'Current location')).toMatchObject({
      report: { status: 'needs_answer' },
    });
  });

  it('reads the job title and company', () => {
    form();
    const details = leverAdapter.readJobDetails?.(document);
    expect(details?.title).toBeTruthy();
    expect(details?.company).toMatch(/Palantir|Spotify/);
  });
});

describe('Lever custom questions', () => {
  it('labels question cards and never maps them to a profile value', () => {
    load('lever/palantir-form.html');
    const fields = leverAdapter.collectFields(document);
    const pronounce = fields.find((field) => /pronounce your name/.test(field.label));
    expect(pronounce).toBeDefined();
    if (!pronounce) return;
    expect(matchField(pronounce)).toBeNull();
    expect(planField(pronounce, PROFILE)).toMatchObject({ report: { status: 'needs_answer' } });
  });

  it('shows a required checkbox group once, unticked', () => {
    load('lever/palantir-form.html');
    const groups = leverAdapter
      .collectFields(document)
      .filter((field) => /Language Skill/.test(field.label));
    expect(groups).toHaveLength(1);
    expect(groups[0]?.required).toBe(true);
    expect(document.querySelectorAll('input[type="checkbox"]:checked')).toHaveLength(0);
  });
});
