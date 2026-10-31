import type { Message } from '../shared/messages';
import { runMigrations } from '../shared/storage/migrations';
import { registerTabSessionCleanup } from '../shared/storage/tabSession';
import { handleMessage } from './router';

// Listeners register synchronously so they survive service worker restarts.
chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html') });
});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  sendResponse(handleMessage(message));
});

chrome.runtime.onInstalled.addListener(() => {
  void runMigrations();
});

registerTabSessionCleanup();
