// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { genericAdapter } from '../../src/content/adapters/generic';
import { classifyPage, isWall } from '../../src/content/engine/classifier';
import { createController, HANDOFF_MESSAGE } from '../../src/content/engine/controller';
import type { FillReport } from '../../src/shared/messages';
import { defaultProfile } from '../../src/shared/storage/profile';

const SIGN_IN = `<h1>Sign in</h1>
  <label for="e">Email</label><input id="e">
  <label for="p">Password</label><input id="p" type="password"><button>Log in</button>`;
const SIGN_IN_OAUTH = `<h1>Welcome</h1><button>Continue with Google</button>
  <label for="e">Email</label><input id="e">`;
const CREATE_ACCOUNT = `<h1>Create your account</h1>
  <label for="f">First name</label><input id="f">
  <label for="e">Email</label><input id="e">
  <label for="p">Password</label><input id="p" type="password">`;
const CREATE_TWO_PASSWORDS = `<label for="e">Email</label><input id="e">
  <input type="password" id="p"><input type="password" id="q">`;
const SIGN_UP_NO_PASSWORD = `<h1>Sign up</h1>
  <label for="f">First name</label><input id="f">
  <label for="e">Email</label><input id="e">
  <label for="m">Phone</label><input id="m">`;
const VERIFICATION = `<h1>Verify your email</h1><label for="c">Code</label><input id="c">`;
const VERIFICATION_INPUT = `<input autocomplete="one-time-code" id="c">`;
const CAPTCHA = `<h1>Checking</h1><iframe src="https://challenges.cloudflare.com/x"></iframe>`;
const CAPTCHA_ON_FORM = `<div class="g-recaptcha"></div><label for="f">First name</label><input id="f">`;
const FORM = `<h1>Apply for Engineer</h1>
  <label for="f">First name</label><input id="f">
  <label for="l">Last name</label><input id="l">
  <label for="e">Email</label><input id="e">
  <label for="r">Resume</label><input id="r" type="file">`;
const FORM_NO_RESUME = `<label for="f">First name</label><input id="f">
  <label for="l">Last name</label><input id="l"><label for="e">Email</label><input id="e">`;
const FORM_WITH_INVISIBLE_CAPTCHA = `${FORM}<div class="grecaptcha-badge"><iframe src="https://www.google.com/recaptcha/api2/anchor?size=invisible"></iframe></div>`;
const FORM_WITH_LOGIN_LINK = `${FORM}<button>Log in</button>`;
const AMBIGUOUS = `<h1>Create your account to apply</h1>${FORM}
  <label for="p">Password</label><input id="p" type="password">`;
const DESCRIPTION = `<h1>Engineer</h1><p>You will log in to servers and register users.</p><a href="#">Apply now</a>`;
const DESCRIPTION_LD = `<script type="application/ld+json">{"@type":"JobPosting"}</script><h1>Engineer</h1>`;
const CONFIRMATION = `<h1>Thank you for applying!</h1>`;
const UNKNOWN = `<h1>Hello</h1><p>Nothing here.</p>`;

function classify(html: string) {
  document.body.innerHTML = html;
  return classifyPage(document);
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.title = '';
});

describe('classifyPage', () => {
  it.each([
    ['sign_in', SIGN_IN],
    ['sign_in', SIGN_IN_OAUTH],
    ['create_account', CREATE_ACCOUNT],
    ['create_account', CREATE_TWO_PASSWORDS],
    ['verification', VERIFICATION],
    ['verification', VERIFICATION_INPUT],
    ['captcha', CAPTCHA],
    ['captcha', CAPTCHA_ON_FORM],
    ['application_form', FORM],
    ['application_form', FORM_NO_RESUME],
    ['application_form', FORM_WITH_INVISIBLE_CAPTCHA],
    ['application_form', FORM_WITH_LOGIN_LINK],
    ['job_description', DESCRIPTION],
    ['job_description', DESCRIPTION_LD],
    ['confirmation', CONFIRMATION],
  ])('sees %s', (state, html) => {
    const result = classify(html);
    expect(result.state).toBe(state);
    expect(result.ambiguous).toBe(false);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it.each([
    ['an account form with application questions', AMBIGUOUS],
    ['a sign-up page with no password box', SIGN_UP_NO_PASSWORD],
    ['an unknown page', UNKNOWN],
  ])('treats %s as ambiguous', (_name, html) => {
    expect(classify(html).ambiguous).toBe(true);
  });

  it('ignores hidden password fields and challenges', () => {
    expect(classify(`${FORM}<div hidden><input type="password"></div>`).state).toBe(
      'application_form',
    );
    expect(classify(`${FORM}<div style="display:none" class="h-captcha"></div>`).state).toBe(
      'application_form',
    );
  });

  it('knows which states are walls', () => {
    expect(
      ['sign_in', 'create_account', 'verification', 'captcha'].every((s) => isWall(s as never)),
    ).toBe(true);
    expect(isWall('application_form')).toBe(false);
  });
});

function allInputs(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll('input'));
}

function setup(html: string, adapter = genericAdapter) {
  document.body.innerHTML = html;
  const reports: FillReport[] = [];
  const controller = createController({
    doc: document,
    adapter,
    data: {
      profile: {
        ...defaultProfile(),
        firstName: 'Sam',
        lastName: 'Lee',
        email: 'sam@example.com',
      },
      resume: null,
      autoAttachResume: true,
      fieldDelayMs: 0,
    },
    resume: null,
    settle: async () => {},
    report: (report) => reports.push(report),
  });
  return { controller, reports, last: () => reports[reports.length - 1] };
}

describe('handoff', () => {
  it.each([
    ['sign_in', SIGN_IN],
    ['sign_in with OAuth', SIGN_IN_OAUTH],
    ['create_account', CREATE_ACCOUNT],
    ['verification', VERIFICATION],
    ['verification input', VERIFICATION_INPUT],
    ['captcha', CAPTCHA],
  ])('writes nothing and focuses nothing on %s', async (_name, html) => {
    const { controller, last } = setup(html);
    const spies = allInputs().map((element) => [
      vi.spyOn(element, 'focus'),
      vi.spyOn(element, 'click'),
      vi.spyOn(element, 'dispatchEvent'),
    ]);
    await controller.check();
    expect(last()?.phase).toBe('paused');
    expect(last()?.pausedReason).toBe(HANDOFF_MESSAGE);
    expect(allInputs().every((element) => element.value === '')).toBe(true);
    for (const spy of spies.flat()) expect(spy).not.toHaveBeenCalled();
  });

  it('resumes when the application form appears in the same tab', async () => {
    const { controller, last } = setup(SIGN_IN);
    await controller.check();
    expect(controller.isWaiting()).toBe(true);

    document.body.innerHTML = FORM;
    await controller.check();
    expect(last()?.phase).toBe('filled');
    expect((document.getElementById('f') as HTMLInputElement).value).toBe('Sam');
    expect(controller.isWaiting()).toBe(false);
  });

  it('"continue" on a page that is still a wall stays paused and types nothing', async () => {
    const { controller, last } = setup(SIGN_IN);
    await controller.check(true);
    expect(last()?.phase).toBe('paused');
    expect(last()?.pausedReason).not.toBe(HANDOFF_MESSAGE);
    expect(allInputs().every((element) => element.value === '')).toBe(true);
  });

  it('asks on an ambiguous page and writes nothing until answered', async () => {
    const { controller, last } = setup(AMBIGUOUS);
    await controller.check();
    expect(last()?.phase).toBe('asking');
    expect(allInputs().every((element) => element.value === '')).toBe(true);
  });

  it('"Yes" fills, and still never types a password', async () => {
    const { controller, last } = setup(AMBIGUOUS);
    await controller.check();
    await controller.confirmForm(true);
    expect(last()?.phase).toBe('filled');
    expect((document.getElementById('f') as HTMLInputElement).value).toBe('Sam');
    expect((document.getElementById('p') as HTMLInputElement).value).toBe('');
    expect(last()?.results.find(({ field }) => field === 'Password')?.status).toBe('enter_manual');
  });

  it('"No" keeps waiting, and DOM changes do not ask again', async () => {
    const { controller, reports, last } = setup(AMBIGUOUS);
    await controller.check();
    await controller.confirmForm(false);
    expect(last()?.phase).toBe('paused');
    expect(allInputs().every((element) => element.value === '')).toBe(true);

    const count = reports.length;
    await controller.check();
    expect(reports).toHaveLength(count);
    await controller.check(true);
    expect(last()?.phase).toBe('asking');
  });

  it('"Yes" cannot override a clear wall', async () => {
    const { controller, last } = setup(SIGN_IN);
    await controller.check();
    await controller.confirmForm(true);
    expect(last()?.phase).toBe('paused');
    expect(allInputs().every((element) => element.value === '')).toBe(true);
  });

  it('stops within one field when a wall appears mid-fill', async () => {
    let filled = 0;
    const adapter = {
      ...genericAdapter,
      fill: async (input: Parameters<typeof genericAdapter.fill>[0]) => {
        const output = await genericAdapter.fill(input);
        filled += 1;
        // The wall arrives right after the first write.
        document.body.insertAdjacentHTML('beforeend', '<div class="cf-turnstile"></div>');
        return output;
      },
    };
    const { controller, last } = setup(FORM, adapter);
    await controller.check();
    expect(filled).toBe(1);
    expect(last()?.phase).toBe('paused');
    expect(last()?.state).toBe('captcha');
    expect((document.getElementById('l') as HTMLInputElement).value).toBe('');
    expect(last()?.results).toHaveLength(1);
    expect(controller.isWaiting()).toBe(true);
  });

  it('reports a job description and a confirmation without writing', async () => {
    const description = setup(DESCRIPTION);
    await description.controller.check();
    expect(description.last()).toMatchObject({ phase: 'paused', state: 'job_description' });

    const confirmation = setup(CONFIRMATION);
    await confirmation.controller.check();
    expect(confirmation.last()).toMatchObject({ phase: 'filled', state: 'confirmation' });
  });

  it('lets an adapter override classification', async () => {
    const { controller, last } = setup(FORM, {
      ...genericAdapter,
      classifyPage: () => ({ state: 'sign_in', ambiguous: false, evidence: ['adapter'] }),
    });
    await controller.check();
    expect(last()).toMatchObject({ state: 'sign_in', evidence: ['adapter'] });
    expect(allInputs().every((element) => element.value === '')).toBe(true);
  });
});

describe('no submit path', () => {
  it('never clicks a submit button or submits the form', async () => {
    document.body.innerHTML = '';
    const { controller } = setup(
      `<form id="x">${FORM}<button type="submit" id="go">Submit</button></form>`,
    );
    const form = document.getElementById('x') as HTMLFormElement;
    const submit = vi.spyOn(form, 'submit');
    const requestSubmit = vi.spyOn(form, 'requestSubmit');
    const click = vi.spyOn(document.getElementById('go') as HTMLElement, 'click');
    const onSubmit = vi.fn();
    form.addEventListener('submit', onSubmit);
    await controller.check();
    for (const spy of [submit, requestSubmit, click, onSubmit]) expect(spy).not.toHaveBeenCalled();
  });
});
