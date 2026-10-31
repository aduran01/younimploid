import type { EngineCommand, Message, ResumePayload } from '../shared/messages';
import { sendMessage } from '../shared/messages';
import { adapterFor } from './adapters';
import { createController, type Controller } from './engine/controller';
import { collectFields } from './engine/fields';

const SETTLE_QUIET_MS = 500;
const SETTLE_MAX_MS = 5000;
const WATCH_DEBOUNCE_MS = 500;
const OUTLINE_MS = 2500;

// Resolves once the page has gone quiet, for page stability only (D-020).
function settle(): Promise<void> {
  return new Promise((resolve) => {
    let quietTimer = setTimeout(finish, SETTLE_QUIET_MS);
    const maxTimer = setTimeout(finish, SETTLE_MAX_MS);
    const observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, SETTLE_QUIET_MS);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    function finish() {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      resolve();
    }
  });
}

function toFile(resume: ResumePayload | null): File | null {
  if (!resume) return null;
  const bytes = Uint8Array.from(atob(resume.base64), (char) => char.charCodeAt(0));
  return new File([bytes], resume.filename, { type: resume.mime });
}

function highlight(ref: string): void {
  const index = Number(ref.replace('field-', ''));
  const element = collectFields(document)[index]?.elements[0];
  if (!element) return;
  element.scrollIntoView({ block: 'center' });
  const previous = element.style.outline;
  element.style.outline = '3px solid #d97706';
  setTimeout(() => {
    element.style.outline = previous;
  }, OUTLINE_MS);
}

function watch(controller: Controller): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver(() => {
    if (!controller.isWaiting()) return;
    clearTimeout(timer);
    timer = setTimeout(() => void controller.check(), WATCH_DEBOUNCE_MS);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function handleCommand(controller: Controller, command: EngineCommand): void {
  if (command.kind === 'continue') void controller.check(true);
  if (command.kind === 'answer_form_question') void controller.confirmForm(command.isForm);
  if (command.kind === 'highlight') highlight(command.ref);
}

async function start(): Promise<void> {
  const data = await sendMessage({ type: 'ENGINE_READY' });
  if (!data) return;
  const controller = createController({
    doc: document,
    adapter: adapterFor(new URL(location.href)),
    data,
    resume: toFile(data.resume),
    settle,
    report: (report) => {
      sendMessage({ type: 'FILL_REPORT', report }).catch(() => undefined);
    },
  });
  chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    if (message.type !== 'ENGINE_COMMAND') return;
    handleCommand(controller, message.command);
    sendResponse({ ok: true });
  });
  watch(controller);
  await controller.check();
}

// Injection can repeat on the same document, and must not start a second engine.
const marker = Symbol.for('younimploid.engine');
const scope = globalThis as unknown as Record<symbol, boolean>;
if (!scope[marker]) {
  scope[marker] = true;
  void start();
}
