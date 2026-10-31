import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TabState } from '../../src/shared/messages';
import type { Application } from '../../src/shared/storage/applications';
import type { FillResult, TabSession } from '../../src/shared/storage/tabSession';
import { PanelView, panelStatus } from '../../src/sidepanel/PanelView';

const SESSION: TabSession = {
  origin: 'manual',
  applicationId: null,
  currentStep: null,
  pageState: 'unknown',
  fillResults: [],
  pausedReason: null,
  pageUrl: null,
  wouldAutoStart: false,
  engineActive: true,
  accessNeeded: false,
  awaitingFormAnswer: false,
  evidence: [],
};

const noop = () => undefined;

function render(state: TabState | null, applications: Application[] = []): string {
  return renderToStaticMarkup(
    <PanelView
      state={state}
      openApplications={applications}
      error=""
      onFill={noop}
      onContinue={noop}
      onAnswerFormQuestion={noop}
      onHighlight={noop}
      onLink={noop}
      onOpenSettings={noop}
    />,
  );
}

function withSession(patch: Partial<TabSession>): TabState {
  return { session: { ...SESSION, ...patch }, application: null, pageUrl: null };
}

describe('panelStatus', () => {
  it('derives each state', () => {
    expect(panelStatus(null)).toBe('idle');
    expect(panelStatus(SESSION)).toBe('running');
    expect(panelStatus({ ...SESSION, pausedReason: 'Sign in' })).toBe('paused');
    expect(
      panelStatus({
        ...SESSION,
        fillResults: [
          { field: 'x', status: 'missing_required', note: '', ref: null, profileKey: '' },
        ],
      }),
    ).toBe('needs_answer');
    expect(
      panelStatus({
        ...SESSION,
        fillResults: [{ field: 'x', status: 'filled', note: '', ref: null, profileKey: '' }],
      }),
    ).toBe('running');
    expect(panelStatus({ ...SESSION, pageState: 'confirmation' })).toBe('done');
  });
});

describe('PanelView', () => {
  it('offers the fill button on an idle tab', () => {
    const html = render({ session: null, application: null, pageUrl: null });
    expect(html).toContain('Idle');
    expect(html).toContain('Fill this application');
    expect(html).toContain('Profile and settings');
  });

  it('shows no button until the tab state has loaded', () => {
    expect(render(null)).not.toContain('Fill this application');
  });

  it('hides the fill button while running', () => {
    const html = render(withSession({}));
    expect(html).toContain('Running');
    expect(html).not.toContain('Fill this application');
    expect(html).not.toContain('Opened from HiringCafe');
  });

  it('offers the fill button when the engine has not started or lacks access', () => {
    expect(render(withSession({ engineActive: false }))).toContain('Fill this application');
    expect(render(withSession({ accessNeeded: true }))).toContain('Fill this application');
  });

  it('groups results and reminds the user to submit', () => {
    const item = (field: string, status: FillResult['status']): FillResult => ({
      field,
      status,
      note: '',
      ref: 'field-0',
      profileKey: '',
    });
    const html = render(
      withSession({
        fillResults: [
          item('Aa', 'filled'),
          item('Bb', 'missing_required'),
          item('Cc', 'enter_manual'),
          item('Dd', 'needs_answer'),
          item('Ee', 'site_differs'),
        ],
      }),
    );
    for (const title of [
      'Filled (1)',
      'Missing required (1)',
      'Enter manually (1)',
      'Needs your answer (1)',
      'Site value differs (1)',
    ]) {
      expect(html).toContain(title);
    }
    expect(html).toContain('submit it yourself');
    expect(html).not.toMatch(/<button[^>]*>Submit/);
  });

  it('shows the sign-in handoff', () => {
    const html = render(
      withSession({ pageState: 'sign_in', pausedReason: 'Sign in or create your account' }),
    );
    expect(html).toContain('Sign in or create your account');
    expect(html).toContain('signed in, continue');
  });

  it('asks whether this is the application form', () => {
    const html = render(withSession({ awaitingFormAnswer: true }));
    expect(html).toContain('Is this the application form?');
    expect(html).toContain('Yes');
    expect(html).toContain('No');
  });

  it('offers linking to a tracker entry on an idle tab only', () => {
    const entry = {
      id: 'a',
      jobTitle: 'Engineer',
      company: 'Acme',
      jobUrl: '',
    } as Application;
    const idle = render({ session: null, application: null, pageUrl: null }, [entry]);
    expect(idle).toContain('Link to an existing tracker entry');
    expect(idle).toContain('Engineer at Acme');
    expect(render(withSession({}), [entry])).not.toContain('Link to an existing');
  });

  it('shows the paused reason', () => {
    const html = render(withSession({ pausedReason: 'Please sign in' }));
    expect(html).toContain('Paused');
    expect(html).toContain('Please sign in');
  });

  it('shows when an answer is needed', () => {
    const html = render(
      withSession({
        fillResults: [{ field: 'x', status: 'needs_answer', note: '', ref: null, profileKey: '' }],
      }),
    );
    expect(html).toContain('Needs your answer');
  });

  it('shows when the application is done', () => {
    expect(render(withSession({ pageState: 'confirmation' }))).toContain('Done');
  });

  it('labels a HiringCafe tab with its job and the auto-start flag', () => {
    const html = render({
      session: { ...SESSION, origin: 'hiringcafe', wouldAutoStart: true, engineActive: false },
      pageUrl: null,
      application: {
        id: 'a',
        jobTitle: 'Engineer',
        company: 'Acme',
        jobUrl: '',
        applyUrl: '',
        origin: 'hiringcafe',
        status: 'in_progress',
        detailsSource: 'hiringcafe',
        createdAt: 0,
        updatedAt: 0,
        notes: '',
        linkedTabIds: [],
      },
    });
    expect(html).toContain('Opened from HiringCafe');
    expect(html).toContain('Engineer at Acme');
    expect(html).toContain('Would start autofill');
  });
});
