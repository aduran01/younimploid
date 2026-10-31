// @vitest-environment jsdom
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { genericAdapter } from '../../src/content/adapters/generic';
import { collectFields } from '../../src/content/engine/fields';
import { attachFile, fillField, readValue } from '../../src/content/engine/fill';
import { fillPage } from '../../src/content/engine/fillPage';
import {
  isConsentField,
  isResumeInput,
  matchField,
  matchOption,
  profileValue,
} from '../../src/content/engine/matcher';
import { isSensitiveField } from '../../src/content/engine/sensitive';
import { defaultProfile, type Profile } from '../../src/shared/storage/profile';

const PROFILE: Profile = {
  ...defaultProfile(),
  firstName: 'Sam',
  lastName: 'Lee',
  email: 'sam@example.com',
  phone: '555-010-0000',
  dateOfBirth: '1990-02-03',
  address: {
    line1: '1 Main St',
    line2: 'Apt 2',
    city: 'Springfield',
    region: 'IL',
    postalCode: '62701',
    country: 'United States',
  },
  links: [
    { label: 'LinkedIn', url: 'https://linkedin.com/in/sam' },
    { label: 'GitHub', url: 'https://github.com/sam' },
    { label: 'Portfolio', url: 'https://sam.example' },
  ],
  workHistory: [
    {
      employer: 'Acme',
      title: 'Engineer',
      location: '',
      startDate: '',
      endDate: '',
      current: true,
      description: '',
    },
  ],
  education: [
    { school: 'State U', degree: 'BS', fieldOfStudy: 'Math', startDate: '', endDate: '' },
  ],
  workAuthorization: { authorizedToWork: 'Yes', requiresSponsorship: 'No' },
  eeo: {
    gender: 'Decline to answer',
    ethnicity: 'Asian',
    veteranStatus: 'I am not a protected veteran',
    disabilityStatus: null,
  },
};

function page(html: string) {
  document.body.innerHTML = html;
  return collectFields(document);
}

function field(html: string) {
  const [first] = page(html);
  if (!first) throw new Error('no field collected');
  return first;
}

function run(profile: Profile = PROFILE, resume: File | null = null, settle = async () => {}) {
  return fillPage({
    doc: document,
    adapter: genericAdapter,
    profile,
    resume,
    delayMs: 0,
    settle,
    shouldStop: () => false,
  });
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

// jsdom has no DataTransfer, so files are set through a stand-in FileList.
function stubDataTransfer() {
  vi.stubGlobal(
    'DataTransfer',
    class {
      private list: File[] = [];
      items = { add: (file: File) => this.list.push(file) };
      get files() {
        return this.list;
      }
    },
  );
  Object.defineProperty(HTMLInputElement.prototype, 'files', {
    configurable: true,
    get() {
      return this._files ?? [];
    },
    set(value) {
      this._files = value;
    },
  });
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('label patterns', () => {
  it.each([
    ['label[for]', '<label for="a">First name</label><input id="a">'],
    ['wrapping label', '<label>First name <input></label>'],
    ['aria-label', '<input aria-label="First name">'],
    ['aria-labelledby', '<span id="s">First name</span><input aria-labelledby="s">'],
    ['placeholder', '<input placeholder="First name">'],
    ['name', '<input name="first_name">'],
    ['camelCase name', '<input name="firstName">'],
    ['id', '<input id="first-name">'],
    ['autocomplete', '<input autocomplete="given-name">'],
  ])('matches through %s', (_pattern, html) => {
    expect(matchField(field(html))).toBe('firstName');
  });

  it.each([
    ['Last name', 'lastName'],
    ['Surname', 'lastName'],
    ['Full name', 'fullName'],
    ['Name', 'fullName'],
    ['Email address', 'email'],
    ['Mobile phone', 'phone'],
    ['Date of birth', 'dateOfBirth'],
    ['Street address', 'addressLine1'],
    ['Address line 2', 'addressLine2'],
    ['City', 'city'],
    ['State', 'region'],
    ['Zip code', 'postalCode'],
    ['Country', 'country'],
    ['LinkedIn profile', 'linkedin'],
    ['GitHub', 'github'],
    ['Portfolio URL', 'website'],
    ['Current company', 'currentEmployer'],
    ['Job title', 'currentTitle'],
    ['University', 'school'],
    ['Degree', 'degree'],
    ['Major', 'fieldOfStudy'],
    [
      'Are you legally authorized to work in the United States for any employer?',
      'authorizedToWork',
    ],
    [
      'Will you now or in the future require visa sponsorship from an employer?',
      'requiresSponsorship',
    ],
    ['Gender', 'gender'],
    ['Race or ethnicity', 'ethnicity'],
    ['Veteran status', 'veteranStatus'],
    ['Disability status', 'disabilityStatus'],
  ])('maps %s', (label, key) => {
    expect(matchField(field(`<label for="a">${label}</label><input id="a">`))).toBe(key);
  });

  it.each(['Reference name', 'Emergency contact email', "Manager's phone", 'Referred by (name)'])(
    "does not treat %s as the user's own detail",
    (label) => {
      expect(matchField(field(`<label for="a">${label}</label><input id="a">`))).toBeNull();
    },
  );

  it('does not match a long question on a stray word', () => {
    const label = 'Why do you want to work at this company and in this city today?';
    expect(matchField(field(`<label for="a">${label}</label><input id="a">`))).toBeNull();
  });

  it('skips hidden, disabled, read-only and button inputs', () => {
    expect(
      page(`
        <input type="hidden" name="email">
        <input name="email" disabled>
        <input name="email" readonly>
        <input name="email" style="display:none">
        <div hidden><input name="email"></div>
        <div style="visibility:hidden"><input name="email"></div>
        <input type="submit" value="Email"><input type="button" name="email">
      `),
    ).toEqual([]);
  });

  it('groups radios and reads the question from the legend', () => {
    const fields = page(`
      <fieldset><legend>Are you authorized to work here?</legend>
        <label><input type="radio" name="auth" value="1">Yes</label>
        <label><input type="radio" name="auth" value="0">No</label>
      </fieldset>`);
    expect(fields).toHaveLength(1);
    expect(fields[0]?.elements).toHaveLength(2);
    expect(matchField(fields[0]!)).toBe('authorizedToWork');
  });

  it('notices required fields', () => {
    expect(field('<input name="a" required>').required).toBe(true);
    expect(field('<input name="a" aria-required="true">').required).toBe(true);
    expect(field('<label for="a">Thing *</label><input id="a">').required).toBe(true);
    expect(field('<input name="a">').required).toBe(false);
  });
});

describe('profile values and options', () => {
  it('resolves every kind of key', () => {
    expect(profileValue('fullName', PROFILE)).toBe('Sam Lee');
    expect(profileValue('linkedin', PROFILE)).toContain('linkedin.com');
    expect(profileValue('github', PROFILE)).toContain('github.com');
    expect(profileValue('website', PROFILE)).toBe('https://sam.example');
    expect(profileValue('currentEmployer', PROFILE)).toBe('Acme');
    expect(profileValue('school', PROFILE)).toBe('State U');
    expect(profileValue('disabilityStatus', PROFILE)).toBeNull();
    expect(profileValue('currentTitle', defaultProfile())).toBeNull();
  });

  it('picks only an unambiguous option', () => {
    expect(matchOption(['Yes', 'No'], 'No')).toBe(1);
    expect(matchOption(['', 'Yes, I am', 'No, I am not'], 'Yes')).toBe(1);
    expect(matchOption(['Yes, a', 'Yes, b'], 'Yes')).toBeNull();
    expect(matchOption(['Male', 'Female', 'Prefer not to say'], 'Decline to answer')).toBe(2);
    expect(matchOption(['Prefer not to say', 'I decline'], 'Decline to answer')).toBeNull();
    expect(matchOption(['United States of America', 'Canada'], 'United States')).toBe(0);
    expect(matchOption(['Asian American', 'Asian Other'], 'Asian')).toBeNull();
    expect(matchOption(['Canada'], 'France')).toBeNull();
  });
});

describe('sensitive denylist', () => {
  it.each([
    'SSN',
    'Social Security Number',
    'Tax ID',
    'TIN',
    'EIN',
    'Passport number',
    "Driver's license",
    'Driving licence number',
    'National ID',
    'Government ID',
    'Card number',
    'Credit card',
    'CVV',
    'CVC',
    'Security code',
    'Routing number',
    'Account number',
    'Password',
    'Passcode',
  ])('never writes "%s" and flags it', async (label) => {
    page(`<label for="a">${label}</label><input id="a">`);
    const before = input('a').value;
    const { results } = await run();
    expect(input('a').value).toBe(before);
    expect(results.map(({ status }) => status)).toEqual(['enter_manual']);
  });

  it.each([
    '<input type="password" id="a">',
    '<input autocomplete="cc-number" id="a">',
    '<input autocomplete="new-password" id="a">',
    '<input name="ssn" id="a">',
    '<input aria-label="SSN" name="email" id="a">',
  ])('catches it from other signals: %s', async (html) => {
    expect(isSensitiveField(field(html))).toBe(true);
    await run();
    expect(input('a').value).toBe('');
  });

  it('runs before matching, and never reads or flags a value in a sensitive field', async () => {
    page('<label for="a">Email or SSN</label><input id="a" value="123">');
    const { results } = await run();
    expect(results[0]?.status).toBe('enter_manual');
    expect(JSON.stringify(results)).not.toContain('123');
  });

  it('does not flag ordinary words that contain a term', () => {
    expect(isSensitiveField(field('<label for="a">Destination</label><input id="a">'))).toBe(false);
    expect(isSensitiveField(field('<label for="a">Account manager</label><input id="a">'))).toBe(
      false,
    );
  });

  it("fills date of birth, by the user's choice", async () => {
    page('<label for="a">Date of birth</label><input id="a" type="date">');
    await run();
    expect(input('a').value).toBe('1990-02-03');
    page('<label for="b">Date of birth</label><input id="b" placeholder="MM/DD/YYYY">');
    await run();
    expect(input('b').value).toBe('02/03/1990');
  });
});

describe('checkboxes', () => {
  it.each([
    'I agree to the terms',
    'I certify this is accurate',
    'I consent to data processing',
    'I acknowledge the privacy policy',
  ])('never checks "%s"', async (label) => {
    page(`<label><input type="checkbox" id="a">${label}</label>`);
    const { results } = await run();
    expect(input('a').checked).toBe(false);
    expect(isConsentField(collectFields(document)[0]!)).toBe(true);
    expect(results[0]?.status).toBe('needs_answer');
  });

  it('leaves optional checkboxes alone and asks about required ones', async () => {
    page(`
      <label><input type="checkbox" id="a">Join our newsletter</label>
      <label><input type="checkbox" id="b" required>Over 18</label>`);
    const { results } = await run();
    expect(input('a').checked).toBe(false);
    expect(input('b').checked).toBe(false);
    expect(results).toHaveLength(1);
    expect(results[0]?.status).toBe('needs_answer');
  });
});

describe('pre-filled fields', () => {
  it('never overwrites a value that differs, and flags it', async () => {
    page('<label for="a">Email</label><input id="a" value="site@example.com">');
    const setter = vi.spyOn(input('a'), 'dispatchEvent');
    const { results } = await run();
    expect(input('a').value).toBe('site@example.com');
    expect(setter).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      status: 'site_differs',
      note: 'Site value differs from your profile.',
    });
  });

  it('marks a matching value as pre-filled, ignoring formatting', async () => {
    page('<label for="a">Phone</label><input id="a" value="(555) 010 0000">');
    const { results } = await run();
    expect(input('a').value).toBe('(555) 010 0000');
    expect(results[0]?.status).toBe('prefilled');
  });

  it('leaves a value alone when the profile has nothing to compare', async () => {
    page('<label for="a">Email</label><input id="a" value="site@example.com">');
    const { results } = await run(defaultProfile());
    expect(input('a').value).toBe('site@example.com');
    expect(results).toEqual([]);
  });

  it('never overwrites a chosen select or radio', async () => {
    page(`
      <label for="s">Country</label>
      <select id="s"><option value="">Choose</option><option value="ca" selected>Canada</option><option value="us">United States</option></select>
      <fieldset><legend>Gender</legend>
        <label><input type="radio" name="g" id="m" checked>Male</label>
        <label><input type="radio" name="g" id="d">Decline to answer</label>
      </fieldset>`);
    const { results } = await run();
    expect((document.getElementById('s') as HTMLSelectElement).value).toBe('ca');
    expect(input('m').checked).toBe(true);
    expect(results.map(({ status }) => status)).toEqual(['site_differs', 'site_differs']);
  });
});

describe('filling', () => {
  it('fills text, textarea, select and radio fields', async () => {
    page(`
      <label for="a">First name</label><input id="a">
      <label for="c">Street address</label><textarea id="c"></textarea>
      <label for="s">Country</label>
      <select id="s"><option value="">Select...</option><option value="ca">Canada</option><option value="us">United States</option></select>
      <fieldset><legend>Are you authorized to work here?</legend>
        <label><input type="radio" name="w" id="y">Yes</label>
        <label><input type="radio" name="w" id="n">No</label>
      </fieldset>`);
    const { results } = await run();
    expect(input('a').value).toBe('Sam');
    expect((document.getElementById('c') as HTMLTextAreaElement).value).toBe('1 Main St');
    expect((document.getElementById('s') as HTMLSelectElement).value).toBe('us');
    expect(input('y').checked).toBe(true);
    expect(results.every(({ status }) => status === 'filled')).toBe(true);
  });

  it('updates a React-controlled input', async () => {
    const seen: string[] = [];
    function Form() {
      const [value, setValue] = useState('');
      return (
        <label>
          First name
          <input
            id="a"
            value={value}
            onChange={(event) => {
              seen.push(event.target.value);
              setValue(event.target.value);
            }}
          />
        </label>
      );
    }
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => root.render(<Form />));

    await act(async () => {
      await run();
    });

    expect(seen).toEqual(['Sam']);
    expect(input('a').value).toBe('Sam');
    await act(async () => root.unmount());
  });

  it('fires input, change and blur', async () => {
    const f = field('<label for="a">First name</label><input id="a">');
    const events: string[] = [];
    for (const type of ['input', 'change', 'blur']) {
      input('a').addEventListener(type, () => events.push(type));
    }
    await fillField(f, 'Sam', 'firstName');
    expect(events).toEqual(['input', 'change', 'blur']);
  });

  it("reports what can't be filled", async () => {
    page(`
      <label for="a">Email</label><input id="a" required>
      <label for="q">Why this role?</label><textarea id="q"></textarea>
      <label for="u">Favorite color</label><input id="u" required>
      <label for="o">Nickname</label><input id="o">
      <label for="s">Gender</label><select id="s" required><option value="">Choose</option><option value="m">Male</option></select>`);
    const { results } = await run({ ...defaultProfile(), eeo: { ...PROFILE.eeo } });
    expect(results.map(({ field: name, status }) => [name, status])).toEqual([
      ['Email', 'missing_required'],
      ['Why this role?', 'needs_answer'],
      ['Favorite color', 'needs_answer'],
      ['Gender', 'needs_answer'],
    ]);
    expect(input('a').value).toBe('');
  });

  it('reports a field that vanished or rejected the value', async () => {
    const f = field('<label for="a">First name</label><input id="a">');
    const element = input('a');
    Object.defineProperty(element, 'value', { get: () => '', set: () => {} });
    expect((await fillField(f, 'Sam', 'firstName')).status).toBe('failed');
    element.remove();
    expect((await fillField(f, 'Sam', 'firstName')).status).toBe('failed');
  });

  it('waits the configured delay and stops at a wall', async () => {
    page(`
      <label for="a">First name</label><input id="a">
      <label for="b">Last name</label><input id="b">`);
    let checks = 0;
    const { stopped } = await fillPage({
      doc: document,
      adapter: genericAdapter,
      profile: PROFILE,
      resume: null,
      delayMs: 1,
      settle: async () => {},
      // Clear at the start and for the first field, then a wall appears.
      shouldStop: () => ++checks > 2,
    });
    expect(stopped).toBe(true);
    expect(input('a').value).toBe('Sam');
    expect(input('b').value).toBe('');
  });
});

describe('resume attach', () => {
  const file = () => new File(['x'], 'me.pdf', { type: 'application/pdf' });

  beforeEach(stubDataTransfer);

  it('recognizes resume inputs', () => {
    expect(isResumeInput(field('<label for="a">Resume</label><input id="a" type="file">'))).toBe(
      true,
    );
    expect(
      isResumeInput(field('<label for="a">Cover letter</label><input id="a" type="file">')),
    ).toBe(false);
    expect(isResumeInput(field('<label for="a">Resume</label><input id="a">'))).toBe(false);
  });

  it('attaches first, then fills', async () => {
    const order: string[] = [];
    page(`
      <label for="r">Resume</label><input id="r" type="file">
      <label for="a">First name</label><input id="a">`);
    input('r').addEventListener('change', () => order.push('resume'));
    input('a').addEventListener('change', () => order.push('field'));
    const { results } = await run(PROFILE, file(), async () => {
      order.push('settle');
    });
    expect(order).toEqual(['resume', 'settle', 'field', 'settle']);
    expect(results[0]).toMatchObject({ status: 'filled', profileKey: 'resume' });
  });

  it('uses a lone unlabeled file input, but never guesses between several', async () => {
    page('<input id="a" type="file">');
    await run(PROFILE, file());
    expect(readValue(collectFields(document)[0]!)).toBe('me.pdf');

    page('<input id="a" type="file"><input id="b" type="file">');
    const { results } = await run(PROFILE, file());
    expect(results).toEqual([]);
    expect(readValue(collectFields(document)[0]!)).toBe('');
  });

  it('never attaches to a sensitive upload', async () => {
    page('<label for="a">Passport scan</label><input id="a" type="file">');
    const { results } = await run(PROFILE, file());
    expect(results.map(({ status }) => status)).toEqual(['enter_manual']);
  });

  it('keeps a file the site already has', async () => {
    page('<label for="a">Resume</label><input id="a" type="file">');
    attachFile(input('a'), new File(['y'], 'old.pdf'));
    const { results } = await run(PROFILE, file());
    expect(readValue(collectFields(document)[0]!)).toBe('old.pdf');
    expect(results[0]?.status).toBe('prefilled');
  });

  it('asks about other required uploads', async () => {
    page('<label for="a">Cover letter</label><input id="a" type="file" required>');
    const { results } = await run();
    expect(results[0]?.status).toBe('needs_answer');
  });

  it('flags a field the site fills in from the resume', async () => {
    page(`
      <label for="r">Resume</label><input id="r" type="file">
      <label for="a">First name</label><input id="a">`);
    const { results } = await run(PROFILE, file(), async () => {
      input('a').value = 'Parsed';
    });
    expect(input('a').value).toBe('Parsed');
    expect(results[1]?.status).toBe('site_differs');
  });

  it('flags a field the site overwrites after it was filled', async () => {
    page(`
      <label for="r">Resume</label><input id="r" type="file">
      <label for="a">First name</label><input id="a">`);
    let settles = 0;
    const { results } = await run(PROFILE, file(), async () => {
      settles += 1;
      if (settles === 2) input('a').value = 'Overwritten';
    });
    expect(results[1]).toMatchObject({
      status: 'site_differs',
      note: 'The site changed this after it was filled.',
    });
  });
});
