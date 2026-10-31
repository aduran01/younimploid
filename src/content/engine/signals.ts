// Lowercases and splits names like "firstName" and "first_name" into plain words.
export function normalizeText(text: string): string {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function containsPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${phrase} `);
}

export function textOf(element: Element | null | undefined): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function isVisible(element: Element): boolean {
  if (element.closest('[hidden]')) return false;
  if (element.closest('[aria-hidden="true"]')) return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = node.ownerDocument.defaultView?.getComputedStyle(node);
    if (style?.display === 'none' || style?.visibility === 'hidden') return false;
  }
  return true;
}

function labelledBy(element: Element): string {
  const ids = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  return ids.map((id) => textOf(element.ownerDocument.getElementById(id))).join(' ');
}

function forLabels(element: Element): string {
  const id = element.getAttribute('id');
  if (!id) return '';
  const labels = Array.from(element.ownerDocument.querySelectorAll('label'));
  return labels
    .filter((label) => label.getAttribute('for') === id)
    .map(textOf)
    .join(' ');
}

// Text only, so a label that wraps its input doesn't pick up select options.
function wrappingLabel(element: Element): string {
  const label = element.closest('label');
  if (!label) return '';
  const copy = label.cloneNode(true) as Element;
  copy.querySelectorAll('select, textarea, input, option').forEach((node) => node.remove());
  return textOf(copy);
}

export function collectSignals(element: Element): { text: string; weight: number }[] {
  const signals = [
    { text: forLabels(element), weight: 3 },
    { text: wrappingLabel(element), weight: 3 },
    { text: element.getAttribute('aria-label') ?? '', weight: 3 },
    { text: labelledBy(element), weight: 3 },
    { text: element.getAttribute('placeholder') ?? '', weight: 2 },
    { text: element.getAttribute('name') ?? '', weight: 1 },
    { text: element.getAttribute('id') ?? '', weight: 1 },
  ];
  return signals.filter(({ text }) => text.trim() !== '');
}
