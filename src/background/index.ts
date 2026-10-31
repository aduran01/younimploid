import type { Message } from '../shared/messages';
import { runMigrations } from '../shared/storage/migrations';
import { registerTabSessionCleanup } from '../shared/storage/tabSession';
import { handleMessage } from './router';
import { registerTabTracking } from './tabTracking';

// Listeners register synchronously so they survive service worker restarts.
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  void handleMessage(message, sender).then(sendResponse);
  // Keeps the channel open for the async response.
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  void runMigrations();
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

registerTabSessionCleanup();
registerTabTracking();
