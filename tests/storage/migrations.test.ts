import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION, runMigrations } from '../../src/shared/storage/migrations';
import { installFakeChrome } from '../helpers/fakeChrome';

describe('runMigrations', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
  });

  it('drops old dashboard data and records the version', async () => {
    chromeFake.local.set('jobStates', { a: 'saved' });
    chromeFake.local.set('buildIdCache', 'x');
    chromeFake.local.set('profile', { firstName: 'Keep' });
    await runMigrations();
    expect(chromeFake.local.has('jobStates')).toBe(false);
    expect(chromeFake.local.has('buildIdCache')).toBe(false);
    expect(chromeFake.local.get('profile')).toEqual({ firstName: 'Keep' });
    expect(chromeFake.local.get('schemaVersion')).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('does not re-run migrations already applied', async () => {
    chromeFake.local.set('schemaVersion', CURRENT_SCHEMA_VERSION);
    chromeFake.local.set('jobStates', { a: 'unrelated' });
    await runMigrations();
    expect(chromeFake.local.has('jobStates')).toBe(true);
  });
});
