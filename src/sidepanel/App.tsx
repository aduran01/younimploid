import { useEffect, useState } from 'react';
import { sendMessage, type TabState } from '../shared/messages';
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

export function App() {
  const tabId = useActiveTabId();
  const [state, setState] = useState<TabState | null>(null);

  useEffect(() => {
    if (tabId === null) return;
    let stale = false;
    const refresh = () => {
      void sendMessage({ type: 'GET_TAB_STATE', tabId }).then((next) => {
        if (!stale) setState(next);
      });
    };
    refresh();
    const stopSession = subscribe('session', sessionKey(tabId), refresh);
    const stopApplications = subscribe('local', KEYS.applications, refresh);
    return () => {
      stale = true;
      stopSession();
      stopApplications();
    };
  }, [tabId]);

  return (
    <PanelView
      state={state}
      onFill={() => {
        if (tabId !== null) void sendMessage({ type: 'START_MANUAL_SESSION', tabId });
      }}
      onOpenSettings={() => void sendMessage({ type: 'OPEN_SETTINGS' })}
    />
  );
}
