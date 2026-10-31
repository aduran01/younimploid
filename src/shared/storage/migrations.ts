import { KEYS, asFiniteNumber, read, remove, write } from './core';

interface Migration {
  version: number;
  migrate: () => Promise<void>;
}

// Ordered oldest to newest. Add new migrations at the end with the next version number.
const MIGRATIONS: Migration[] = [
  {
    // Drops data from the abandoned job dashboard design.
    version: 1,
    migrate: async () => {
      await remove('local', 'jobStates');
      await remove('local', 'buildIdCache');
    },
  },
];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.reduce(
  (latest, migration) => Math.max(latest, migration.version),
  0,
);

export async function runMigrations(): Promise<void> {
  const stored = asFiniteNumber(await read('local', KEYS.schemaVersion)) ?? 0;
  for (const migration of MIGRATIONS) {
    if (migration.version > stored) {
      await migration.migrate();
      await write('local', KEYS.schemaVersion, migration.version);
    }
  }
}
