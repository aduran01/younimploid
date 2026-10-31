import { useEffect, useState } from 'react';
import { sendMessage, type TabState } from '../shared/messages';
import type { Application } from '../shared/storage/applications';
import { KEYS } from '../shared/storage/core';
import { subscribe } from '../shared/storage/subscribe';
import { sessionKey } from '../shared/storage/tabSession';
import { PanelView } from './PanelView';

function useActiveTabId(): number | null {
  const [tabId, setTabId] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => {
      void chrome.tabs
        .query({ active: true, currentWindow: true })
        .then(([tab]) => setTabId(tab?.id ?? null));
    };
    refresh();
    chrome.tabs.onActivated.addListener(refresh);
    return () => chrome.tabs.onActivated.removeListener(refresh);
  }, []);
  return tabId;
}

const CLOSED_STATUSES = ['submitted', 'rejected', 'withdrawn'];

// Must run synchronously inside the click, since Chrome requires a user gesture (D-026).
function requestSiteAccess(pageUrl: string | null): Promise<boolean> {
  if (!pageUrl) return Promise.resolve(false);
  const { protocol, origin } = new URL(pageUrl);
  if (protocol !== 'https:' && protocol !== 'http:') return Promise.resolve(false);
  return chrome.permissions.request({ origins: [`${origin}/*`] });
}

export function App() {
  const tabId = useActiveTabId();
  const [state, setState] = useState<TabState | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tabId === null) return;
    let stale = false;
    const refresh = () => {
      void sendMessage({ type: 'GET_TAB_STATE', tabId }).then((next) => {
        if (!stale) setState(next);
      });
      void sendMessage({ type: 'LIST_APPLICATIONS' }).then((next) => {
        if (!stale) setApplications(next);
      });
    };
    setError('');
    refresh();
    const stopSession = subscribe('session', sessionKey(tabId), refresh);
    const stopApplications = subscribe('local', KEYS.applications, refresh);
    // A navigation with no session changes nothing in storage, but the page URL still moved on.
    const onTabUpdated = (updatedTabId: number) => {
      if (updatedTabId === tabId) refresh();
    };
    chrome.tabs.onUpdated.addListener(onTabUpdated);
    return () => {
      stale = true;
      stopSession();
      stopApplications();
      chrome.tabs.onUpdated.removeListener(onTabUpdated);
    };
  }, [tabId]);

  const openApplications = applications.filter(({ status }) => !CLOSED_STATUSES.includes(status));

  return (
    <PanelView
      state={state}
      openApplications={openApplications}
      error={error}
      onFill={() => {
        if (tabId === null) return;
        setError('');
        requestSiteAccess(state?.pageUrl ?? null).then(
          (allowed) => {
            if (allowed) void sendMessage({ type: 'START_FILL', tabId });
            else setError('This site has to be allowed before I can fill it.');
          },
          () => setError('Chrome could not ask for access to this site.'),
        );
      }}
      onContinue={() => {
        if (tabId !== null) void sendMessage({ type: 'CONTINUE_FILL', tabId });
      }}
      onAnswerFormQuestion={(isForm) => {
        if (tabId !== null) void sendMessage({ type: 'ANSWER_FORM_QUESTION', tabId, isForm });
      }}
      onHighlight={(ref) => {
        if (tabId !== null) void sendMessage({ type: 'HIGHLIGHT_FIELD', tabId, ref });
      }}
      onLink={(applicationId) => {
        if (tabId !== null) void sendMessage({ type: 'LINK_APPLICATION', tabId, applicationId });
      }}
      onOpenSettings={() => void sendMessage({ type: 'OPEN_SETTINGS' })}
    />
  );
}
