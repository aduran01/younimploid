import type { Message } from '../shared/messages';
import { handleMessage } from './router';

// Listeners register synchronously so they survive service worker restarts.
chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/index.html') });
});

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  sendResponse(handleMessage(message));
});
