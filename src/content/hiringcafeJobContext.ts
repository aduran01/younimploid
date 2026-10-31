import type { JobContext } from '../shared/storage/hiringCafeTabs';

export interface JobPageSnapshot {
  url: string;
  jsonLd: string[];
  heading: string | null;
  headingNext: string | null;
}

const MAX_FIELD_LENGTH = 300;

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_FIELD_LENGTH) : '';
}

function fromJsonLd(blocks: string[]): { title: string; company: string } | null {
  for (const block of blocks) {
    try {
      const data: unknown = JSON.parse(block);
      if (typeof data !== 'object' || data === null) continue;
      const posting = data as {
        '@type'?: unknown;
        title?: unknown;
        hiringOrganization?: { name?: unknown };
      };
      if (posting['@type'] !== 'JobPosting') continue;
      const title = clean(posting.title);
      const company = clean(posting.hiringOrganization?.name);
      if (title || company) return { title, company };
    } catch {
      // A malformed block is skipped; another may still parse.
    }
  }
  return null;
}

// Prefers the page's JobPosting data, since class names change and that data rarely does.
// Keeps only title, company and a URL with no query string.
export function extractJobContext(page: JobPageSnapshot): JobContext | null {
  let url: URL;
  try {
    url = new URL(page.url);
  } catch {
    return null;
  }
  const isJobPage = url.pathname.startsWith('/job/');
  const found =
    fromJsonLd(page.jsonLd) ??
    (isJobPage && page.heading
      ? { title: clean(page.heading), company: clean(page.headingNext) }
      : null);
  return found && { ...found, url: url.origin + url.pathname };
}

export function isApplyControlText(text: string): boolean {
  return /^apply(\s+(now|directly\b.*))?$/i.test(text.trim());
}
