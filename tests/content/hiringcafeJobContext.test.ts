import { describe, expect, it } from 'vitest';
import { extractJobContext, isApplyControlText } from '../../src/content/hiringcafeJobContext';
import html from '../fixtures/hiringcafe/job-page.html?raw';

const URL_BASE = 'https://hiringcafe.com/job/housing-social-services-coordinator';
const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
  (match) => match[1] ?? '',
);

const EXPECTED = {
  title: 'Housing Social Services Coordinator',
  company: 'Catholic Charities Eastern Washington',
  url: URL_BASE,
};

describe('extractJobContext', () => {
  it('reads title and company from the saved snapshot', () => {
    expect(jsonLd).toHaveLength(2);
    expect(extractJobContext({ url: URL_BASE, jsonLd, heading: null, headingNext: null })).toEqual(
      EXPECTED,
    );
  });

  it('drops the query string from the kept URL', () => {
    const context = extractJobContext({
      url: `${URL_BASE}?ref=abc#top`,
      jsonLd,
      heading: null,
      headingNext: null,
    });
    expect(context?.url).toBe(URL_BASE);
  });

  it('keeps only title, company and URL', () => {
    const block = JSON.stringify({
      '@type': 'JobPosting',
      title: 'T',
      hiringOrganization: { name: 'C' },
      description: 'secret',
      identifier: 'abc',
    });
    const context = extractJobContext({
      url: URL_BASE,
      jsonLd: [block],
      heading: null,
      headingNext: null,
    });
    expect(Object.keys(context ?? {}).sort()).toEqual(['company', 'title', 'url']);
  });

  it('falls back to the heading on a job page', () => {
    expect(
      extractJobContext({
        url: URL_BASE,
        jsonLd: ['not json'],
        heading: ` ${EXPECTED.title} `,
        headingNext: EXPECTED.company,
      }),
    ).toEqual(EXPECTED);
  });

  it('finds nothing on other pages, or when the page has no job data', () => {
    expect(
      extractJobContext({
        url: 'https://hiringcafe.com/',
        jsonLd: [],
        heading: 'Search jobs',
        headingNext: null,
      }),
    ).toBeNull();
    expect(extractJobContext({ url: URL_BASE, jsonLd: [], heading: null, headingNext: null })).toBe(
      null,
    );
  });

  it('is harmless on malformed input', () => {
    expect(
      extractJobContext({ url: 'not a url', jsonLd: ['{'], heading: null, headingNext: null }),
    ).toBeNull();
    expect(
      extractJobContext({
        url: URL_BASE,
        jsonLd: ['null', '[]', '{"@type":"JobPosting","title":5}'],
        heading: null,
        headingNext: null,
      }),
    ).toBeNull();
  });
});

describe('isApplyControlText', () => {
  it.each(['Apply', 'Apply Now', "Apply directly on employer's site"])('accepts %s', (text) => {
    expect(isApplyControlText(text)).toBe(true);
  });

  it.each(['Apply Process', 'Encouraged to Apply', 'Save job'])('rejects %s', (text) => {
    expect(isApplyControlText(text)).toBe(false);
  });
});
