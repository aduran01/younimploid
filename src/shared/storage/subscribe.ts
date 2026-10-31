import type { StorageAreaName } from './core';

// Notifies on change, leaving the caller to re-read through a validated getter.
// Returns a function that stops the subscription.
export function subscribe(area: StorageAreaName, key: string, onChange: () => void): () => void {
  const listener = (changes: Record<string, unknown>, changedArea: string) => {
    if (changedArea === area && key in changes) onChange();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
