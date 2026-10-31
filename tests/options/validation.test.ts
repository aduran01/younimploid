import { describe, expect, it } from 'vitest';
import { formatFileSize, resumeMimeType, validateProfile } from '../../src/options/validation';
import { defaultProfile, normalizeProfile } from '../../src/shared/storage/profile';

const WORK = {
  employer: 'Acme',
  title: 'Engineer',
  location: '',
  startDate: '2024-05',
  endDate: '2023-01',
  current: false,
  description: '',
};

describe('validateProfile', () => {
  it('accepts an empty profile', () => {
    expect(validateProfile(defaultProfile())).toEqual({});
  });

  it('flags a bad email and phone', () => {
    const errors = validateProfile({ ...defaultProfile(), email: 'nope', phone: 'call me' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'phone']);
  });

  it('accepts a normal email and phone', () => {
    const errors = validateProfile({
      ...defaultProfile(),
      email: 'a@example.com',
      phone: '+1 (555) 010-0000',
    });
    expect(errors).toEqual({});
  });

  it('flags blank and non-web link URLs by row', () => {
    const errors = validateProfile({
      ...defaultProfile(),
      links: [
        { label: 'ok', url: 'https://example.com' },
        { label: 'blank', url: '' },
        { label: 'script', url: 'javascript:alert(1)' },
      ],
    });
    expect(Object.keys(errors).sort()).toEqual(['links.1.url', 'links.2.url']);
  });

  it('requires employer and title, and an end date after the start', () => {
    const errors = validateProfile({
      ...defaultProfile(),
      workHistory: [{ ...WORK, employer: ' ', title: '' }],
    });
    expect(Object.keys(errors).sort()).toEqual([
      'workHistory.0.employer',
      'workHistory.0.endDate',
      'workHistory.0.title',
    ]);
  });

  it('ignores the end date of a current job', () => {
    const errors = validateProfile({
      ...defaultProfile(),
      workHistory: [{ ...WORK, current: true }],
    });
    expect(errors).toEqual({});
  });

  it('checks education entries', () => {
    const errors = validateProfile({
      ...defaultProfile(),
      education: [
        { school: '', degree: '', fieldOfStudy: '', startDate: '2024-01', endDate: '2020-01' },
      ],
    });
    expect(Object.keys(errors).sort()).toEqual(['education.0.endDate', 'education.0.school']);
  });
});

describe('profile data', () => {
  it('has no field for sensitive identifiers, even when one is supplied', () => {
    const profile = normalizeProfile({
      firstName: 'A',
      ssn: '000-00-0000',
      password: 'x',
      passport: 'x',
      cardNumber: 'x',
    });
    expect(JSON.stringify(profile)).not.toMatch(/ssn|password|passport|cardNumber|000-00/);
  });
});

describe('resume files', () => {
  it('accepts PDF and DOCX only, whatever the case', () => {
    expect(resumeMimeType('me.PDF')).toBe('application/pdf');
    expect(resumeMimeType('me.docx')).toContain('wordprocessingml');
    expect(resumeMimeType('me.doc')).toBeNull();
    expect(resumeMimeType('me.pdf.exe')).toBeNull();
    expect(resumeMimeType('resume')).toBeNull();
  });

  it('formats sizes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});
