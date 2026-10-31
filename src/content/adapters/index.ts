import { genericAdapter } from './generic';
import { greenhouseAdapter } from './greenhouse';
import { leverAdapter } from './lever';
import type { AtsAdapter } from './types';

// Site adapters go here as they're built. Status per site lives in src/shared/atsSites.ts.
const ADAPTERS: AtsAdapter[] = [greenhouseAdapter, leverAdapter];

export function adapterFor(url: URL): AtsAdapter {
  return ADAPTERS.find((adapter) => adapter.matches(url)) ?? genericAdapter;
}
