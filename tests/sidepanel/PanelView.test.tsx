import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TabState } from '../../src/shared/messages';
import type { TabSession } from '../../src/shared/storage/tabSession';
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
};

function render(state: TabState | null): string {
  return renderToStaticMarkup(
    <PanelView state={state} onFill={() => undefined} onOpenSettings={() => undefined} />,
  );
}

function withSession(patch: Partial<TabSession>): TabState {
  return { session: { ...SESSION, ...patch }, application: null };
}

describe('panelStatus', () => {
  it('derives each state', () => {
    expect(panelStatus(null)).toBe('idle');
    expect(panelStatus(SESSION)).toBe('running');
    expect(panelStatus({ ...SESSION, pausedReason: 'Sign in' })).toBe('paused');
    expect(
      panelStatus({ ...SESSION, fillResults: [{ field: 'x', status: 'missing', note: '' }] }),
    ).toBe('needs_answer');
    expect(
      panelStatus({ ...SESSION, fillResults: [{ field: 'x', status: 'filled', note: '' }] }),
    ).toBe('running');
    expect(panelStatus({ ...SESSION, pageState: 'confirmation' })).toBe('done');
  });
});

describe('PanelView', () => {
  it('offers the fill button on an idle tab', () => {
    const html = render({ session: null, application: null });
    expect(html).toContain('Idle');
    expect(html).toContain('Fill this application');
    expect(html).toContain('Profile and settings');
  });

  it('shows no button until the tab state has loaded', () => {
    expect(render(null)).not.toContain('Fill this application');
  });

  it('tells a manual session that autofill comes later', () => {
    const html = render(withSession({}));
    expect(html).toContain('Running');
    expect(html).toContain('Autofill arrives in Phase 2');
    expect(html).not.toContain('Fill this application');
    expect(html).not.toContain('Opened from HiringCafe');
  });

  it('shows the paused reason', () => {
    const html = render(withSession({ pausedReason: 'Please sign in' }));
    expect(html).toContain('Paused');
    expect(html).toContain('Please sign in');
  });

  it('shows when an answer is needed', () => {
    const html = render(
      withSession({ fillResults: [{ field: 'x', status: 'flagged', note: '' }] }),
    );
    expect(html).toContain('Needs your answer');
  });

  it('shows when the application is done', () => {
    expect(render(withSession({ pageState: 'confirmation' }))).toContain('Done');
  });

  it('labels a HiringCafe tab with its job and the auto-start flag', () => {
    const html = render({
      session: { ...SESSION, origin: 'hiringcafe', wouldAutoStart: true },
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
