import { genericAdapter } from './generic';
import type { AtsAdapter } from './types';

// Site adapters go here as they're built. Status per site lives in src/shared/atsSites.ts.
const ADAPTERS: AtsAdapter[] = [];

export function adapterFor(url: URL): AtsAdapter {
  return ADAPTERS.find((adapter) => adapter.matches(url)) ?? genericAdapter;
}
