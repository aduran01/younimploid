import { describe, expect, it } from 'vitest';
import {
  deleteResumeFile,
  getResumeFile,
  saveResumeFile,
} from '../../src/shared/storage/resumeFile';
import { memoryResumeStore } from '../helpers/fakeChrome';

describe('resumeFile', () => {
  it('returns null when nothing is stored', async () => {
    expect(await getResumeFile(memoryResumeStore())).toBeNull();
  });

  it('round trips a file', async () => {
    const store = memoryResumeStore();
    const blob = new Blob(['resume'], { type: 'application/pdf' });
    await saveResumeFile(blob, 'resume.pdf', store);
    const file = await getResumeFile(store);
    expect(file?.filename).toBe('resume.pdf');
    expect(file?.mime).toBe('application/pdf');
    expect(await file?.blob.text()).toBe('resume');
    await deleteResumeFile(store);
    expect(await getResumeFile(store)).toBeNull();
  });

  it('rejects invalid stored data', async () => {
    expect(await getResumeFile(memoryResumeStore({ blob: 'not a blob' }))).toBeNull();
  });
});
