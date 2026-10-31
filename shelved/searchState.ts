import type { SearchLocation, SearchState } from '../src/shared/hiringcafe/types';

const PARAM = 'searchState';

export interface SearchFilters {
  keyword?: string;
  locations?: SearchLocation[];
  workplaceTypes?: string[];
  commitmentTypes?: string[];
  departments?: string[];
  minSalary?: {
    amount: number;
    // Yearly is the site's default and is left out of the URL.
    per?: string;
    // The site turns this on whenever a minimum is entered.
    transparentOnly?: boolean;
  };
  seniorityLevels?: string[];
  securityClearances?: string[];
}

function nonEmpty<T>(values: T[] | undefined): T[] | undefined {
  return values && values.length > 0 ? values : undefined;
}

// Assignment order is the key order in the URL, so it mirrors the order the site produces.
// Undefined values are dropped by JSON.stringify.
export function buildSearchState(filters: SearchFilters): SearchState {
  const { minSalary } = filters;
  const per = minSalary?.per;
  return {
    searchQuery: filters.keyword || undefined,
    locations: nonEmpty(filters.locations),
    workplaceTypes: nonEmpty(filters.workplaceTypes),
    commitmentTypes: nonEmpty(filters.commitmentTypes),
    restrictJobsToTransparentSalaries:
      minSalary && minSalary.transparentOnly !== false ? true : undefined,
    departments: nonEmpty(filters.departments),
    calcFrequency: per && per !== 'Yearly' ? per : undefined,
    maxCompensationLowEnd: minSalary ? String(minSalary.amount) : undefined,
    seniorityLevel: nonEmpty(filters.seniorityLevels),
    securityClearances: nonEmpty(filters.securityClearances),
  };
}

// Returns the raw value of the searchState parameter, with spaces encoded as "+".
export function encodeSearchState(state: SearchState): string {
  return new URLSearchParams({ [PARAM]: JSON.stringify(state) }).toString().slice(PARAM.length + 1);
}

export function decodeSearchState(encoded: string): SearchState {
  const json = new URLSearchParams(`${PARAM}=${encoded}`).get(PARAM) ?? '';
  return JSON.parse(json) as SearchState;
}
