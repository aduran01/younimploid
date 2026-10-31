import { beforeEach, describe, expect, it } from 'vitest';
import {
  DECLINE_TO_ANSWER,
  defaultProfile,
  getProfile,
  saveProfile,
} from '../../src/shared/storage/profile';
import { installFakeChrome } from '../helpers/fakeChrome';

describe('profile', () => {
  let chromeFake: ReturnType<typeof installFakeChrome>;
  beforeEach(() => {
    chromeFake = installFakeChrome();
  });

  it('returns an empty profile by default', async () => {
    expect(await getProfile()).toEqual(defaultProfile());
    expect(defaultProfile().eeo.gender).toBeNull();
  });

  it('round trips a saved profile, including declined answers', async () => {
    const profile = defaultProfile();
    profile.firstName = 'Test';
    profile.eeo.gender = DECLINE_TO_ANSWER;
    profile.workHistory.push({
      employer: 'Example Co',
      title: 'Engineer',
      location: '',
      startDate: '2020-01',
      endDate: '',
      current: true,
      description: '',
    });
    await saveProfile(profile);
    expect(await getProfile()).toEqual(profile);
  });

  it('never keeps sensitive or unknown fields', async () => {
    chromeFake.local.set('profile', {
      firstName: 'Test',
      ssn: '000-00-0000',
      password: 'hunter2',
      governmentId: 'X',
      cardNumber: '4111',
    });
    const stored = JSON.stringify(await getProfile());
    expect(stored).toContain('Test');
    for (const value of ['000-00-0000', 'hunter2', 'governmentId', 'cardNumber']) {
      expect(stored).not.toContain(value);
    }
  });

  it('drops invalid list items and wrong types', async () => {
    chromeFake.local.set('profile', { email: 5, links: ['bad', { label: 'Site', url: 'x' }] });
    const profile = await getProfile();
    expect(profile.email).toBe('');
    expect(profile.links).toEqual([{ label: 'Site', url: 'x' }]);
  });
});
