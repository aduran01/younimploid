import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_AUDIT_ENTRIES,
  appendAuditEntry,
  listAuditEntries,
} from '../../src/shared/storage/auditLog';
import { installFakeChrome } from '../helpers/fakeChrome';

describe('auditLog', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
  });

  it('appends in order and filters by application', async () => {
    await appendAuditEntry('a', 'filled', { field: 'email' });
    await appendAuditEntry('b', 'paused');
    expect((await listAuditEntries()).map((entry) => entry.action)).toEqual(['filled', 'paused']);
    expect(await listAuditEntries('b')).toHaveLength(1);
  });

  it('prunes the oldest entries past the cap', async () => {
    const full = Array.from({ length: MAX_AUDIT_ENTRIES }, (_, index) => ({
      applicationId: 'a',
      timestamp: index,
      action: `action-${index}`,
      details: {},
    }));
    chromeFake.local.set('auditLog', full);
    await appendAuditEntry('a', 'newest');
    const entries = await listAuditEntries();
    expect(entries).toHaveLength(MAX_AUDIT_ENTRIES);
    expect(entries[0]?.action).toBe('action-1');
    expect(entries.at(-1)?.action).toBe('newest');
  });

  it('keeps every entry when appended concurrently', async () => {
    await Promise.all([appendAuditEntry('a', 'one'), appendAuditEntry('a', 'two')]);
    expect(await listAuditEntries()).toHaveLength(2);
  });

  it('redacts secrets from details', async () => {
    await appendAuditEntry('a', 'error', { aiApiKey: 'sk-secret', field: 'email' });
    expect(JSON.stringify(chromeFake.local.get('auditLog'))).not.toContain('sk-secret');
    expect((await listAuditEntries())[0]?.details.field).toBe('email');
  });
});
