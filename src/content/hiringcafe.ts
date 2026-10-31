import { sendMessage } from '../shared/messages';
import { extractJobContext, isApplyControlText } from './hiringcafeJobContext';

// Read-only: this script listens for clicks and never writes to the page or stops the click.
function onClick(event: MouseEvent): void {
  try {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest('a, button');
    if (!control || !isApplyControlText(control.textContent ?? '')) return;
    const heading = document.querySelector('h1');
    const context = extractJobContext({
      url: location.href,
      jsonLd: Array.from(
        document.querySelectorAll('script[type="application/ld+json"]'),
        (script) => script.textContent ?? '',
      ),
      heading: heading?.textContent ?? null,
      headingNext: heading?.nextElementSibling?.textContent ?? null,
    });
    if (context) sendMessage({ type: 'JOB_CONTEXT', context }).catch(() => undefined);
  } catch {
    // Job context is a bonus (D-017), so a failure here must stay harmless.
  }
}

document.addEventListener('click', onClick, { capture: true, passive: true });
