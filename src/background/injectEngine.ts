import engineScript from '../content/atsEngine.ts?script&iife';

// A single self-contained file, so nothing has to be web-accessible to the sites it runs on.
export async function injectEngine(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, files: [engineScript] });
}
