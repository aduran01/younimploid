import { describe, expect, it } from 'vitest';
import samplesText from './searchstate-samples.txt?raw';
import {
  buildSearchState,
  decodeSearchState,
  encodeSearchState,
  type SearchFilters,
} from './searchState';

const samples = samplesText.trim().split('\n');

const OBSERVED_REMOTE_SEARCH =
  '%7B%22workplaceTypes%22%3A%5B%22Remote%22%5D%2C%22commitmentTypes%22%3A%5B%22Full+Time%22%5D%2C%22restrictJobsToTransparentSalaries%22%3Atrue%2C%22calcFrequency%22%3A%22Hourly%22%2C%22maxCompensationLowEnd%22%3A%2230%22%7D';

function sample(index: number): string {
  const value = samples[index];
  if (!value) throw new Error(`Missing sample ${index}`);
  return value;
}

const software = ['Software Development', 'Information Technology', 'Data and Analytics'];
const entryLevels = ['No Prior Experience Required', 'Entry Level'];

describe('searchState round trips', () => {
  it('finds all four samples', () => {
    expect(samples).toHaveLength(4);
  });

  it.each(samples)('decodes and re-encodes byte for byte: sample %#', (raw) => {
    expect(encodeSearchState(decodeSearchState(raw))).toBe(raw);
  });

  it('round trips the captured remote search', () => {
    expect(encodeSearchState(decodeSearchState(OBSERVED_REMOTE_SEARCH))).toBe(
      OBSERVED_REMOTE_SEARCH,
    );
  });
});

describe('buildSearchState', () => {
  const location = (index: number) => {
    const found = decodeSearchState(sample(index)).locations?.[0];
    if (!found) throw new Error(`Sample ${index} has no location`);
    return found;
  };

  const salaried: SearchFilters = {
    departments: software,
    minSalary: { amount: 65000 },
    seniorityLevels: entryLevels,
    securityClearances: ['None'],
  };

  it('reproduces sample 1 from typed filters', () => {
    const state = buildSearchState({
      locations: [location(0)],
      departments: software,
      seniorityLevels: entryLevels,
    });
    expect(encodeSearchState(state)).toBe(sample(0));
  });

  it('reproduces sample 2 from typed filters', () => {
    const state = buildSearchState({ ...salaried, locations: [location(1)] });
    expect(encodeSearchState(state)).toBe(sample(1));
  });

  it('reproduces sample 3 from typed filters', () => {
    expect(encodeSearchState(buildSearchState(salaried))).toBe(sample(2));
  });

  it('reproduces sample 4 from typed filters', () => {
    const state = buildSearchState({ ...salaried, locations: [location(3)] });
    expect(encodeSearchState(state)).toBe(sample(3));
  });

  it('reproduces the captured remote search from typed filters', () => {
    const state = buildSearchState({
      workplaceTypes: ['Remote'],
      commitmentTypes: ['Full Time'],
      minSalary: { amount: 30, per: 'Hourly' },
    });
    expect(encodeSearchState(state)).toBe(OBSERVED_REMOTE_SEARCH);
  });

  it('leaves out empty filters and the default Yearly period', () => {
    const state = buildSearchState({
      keyword: '',
      departments: [],
      minSalary: { amount: 65000, per: 'Yearly', transparentOnly: false },
    });
    expect(JSON.parse(JSON.stringify(state))).toEqual({ maxCompensationLowEnd: '65000' });
  });
});
