import { vi } from 'vitest';
import type { ResumeFile, ResumeStore } from '../../src/shared/storage/resumeFile';

type ChangeListener = (changes: Record<string, unknown>, area: string) => void;
type RemovedListener = (tabId: number) => void;

function fakeArea(name: string, listeners: Set<ChangeListener>) {
  const data = new Map<string, unknown>();
  const notify = (key: string) => {
    for (const listener of listeners) listener({ [key]: {} }, name);
  };
  return {
    data,
    get: async (key: string) => (data.has(key) ? { [key]: data.get(key) } : {}),
    set: async (items: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(items)) {
        // Storage serializes values, so writes must not share references with the caller.
        data.set(key, JSON.parse(JSON.stringify(value)));
        notify(key);
      }
    },
    remove: async (key: string) => {
      data.delete(key);
      notify(key);
    },
  };
}

export function installFakeChrome() {
  const changeListeners = new Set<ChangeListener>();
  const removedListeners = new Set<RemovedListener>();
  const local = fakeArea('local', changeListeners);
  const session = fakeArea('session', changeListeners);
  const frames = new Map<string, string>();
  vi.stubGlobal('chrome', {
    storage: {
      local,
      session,
      onChanged: {
        addListener: (listener: ChangeListener) => changeListeners.add(listener),
        removeListener: (listener: ChangeListener) => changeListeners.delete(listener),
      },
    },
    tabs: {
      onRemoved: { addListener: (listener: RemovedListener) => removedListeners.add(listener) },
      // No content script is listening in tests.
      sendMessage: async () => {
        throw new Error('Could not establish connection');
      },
    },
    webNavigation: {
      getFrame: async ({ tabId, frameId }: { tabId: number; frameId: number }) => {
        const url = frames.get(`${tabId}:${frameId}`);
        return url ? { url } : null;
      },
    },
  });
  return {
    local: local.data,
    session: session.data,
    setFrameUrl: (tabId: number, frameId: number, url: string) => {
      frames.set(`${tabId}:${frameId}`, url);
    },
    closeTab: (tabId: number) => {
      for (const listener of removedListeners) listener(tabId);
    },
  };
}

export function memoryResumeStore(initial?: unknown): ResumeStore & { current: unknown } {
  const store = {
    current: initial,
    get: async () => store.current,
    put: async (file: ResumeFile) => {
      store.current = file;
    },
    delete: async () => {
      store.current = undefined;
    },
  };
  return store;
}
