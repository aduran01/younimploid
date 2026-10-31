import { describe, expect, it } from 'vitest';
import type { DataResponse } from '../../src/shared/hiringcafe/types';
import filtered from '../fixtures/hiringcafe/data-filtered.json';
import simple from '../fixtures/hiringcafe/data-simple.json';

// These assignments are the type check: npm run typecheck fails if a fixture stops matching.
const fixtures: Record<string, DataResponse> = { simple, filtered };

describe.each(Object.entries(fixtures))('%s fixture', (_name, fixture) => {
  it('has five trimmed hits with apply links', () => {
    expect(fixture.pageProps.ssrHits).toHaveLength(5);
    for (const hit of fixture.pageProps.ssrHits) {
      expect(hit.apply_url).toMatch(/^https?:\/\//);
    }
  });

  it("contains no other users' IDs", () => {
    for (const hit of fixture.pageProps.ssrHits) {
      const info: Record<string, unknown> = { ...hit.job_information };
      for (const key of [
        'viewedByUsers',
        'appliedFromUsers',
        'hiddenFromUsers',
        'savedFromUsers',
      ]) {
        expect(info[key] ?? []).toEqual([]);
      }
    }
  });
});
