import { useEffect, useState } from 'react';
import {
  deleteResumeFile,
  getResumeFile,
  saveResumeFile,
  type ResumeFile,
} from '../shared/storage/resumeFile';
import { Button } from '../shared/ui/Button';
import { formatFileSize, resumeMimeType } from './validation';

export function ResumeTab() {
  const [resume, setResume] = useState<ResumeFile | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getResumeFile().then(setResume, () => setMessage('Could not read your saved resume.'));
  }, []);

  const upload = async (file: File) => {
    const mime = resumeMimeType(file.name);
    if (!mime) {
      setMessage('Choose a PDF or DOCX file.');
      return;
    }
    if (file.size === 0) {
      setMessage('This file is empty.');
      return;
    }
    try {
      setResume(await saveResumeFile(new Blob([file], { type: mime }), file.name));
      setMessage('Saved.');
    } catch {
      setMessage('Could not save this file.');
    }
  };

  const remove = async () => {
    try {
      await deleteResumeFile();
      setResume(null);
      setMessage('Removed.');
    } catch {
      setMessage('Could not remove your resume.');
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Resume</h2>
      {resume ? (
        <p>
          {resume.filename} ({formatFileSize(resume.blob.size)})
        </p>
      ) : (
        <p className="text-gray-600">No resume saved.</p>
      )}
      <label className="block text-sm">
        {resume ? 'Replace with a PDF or DOCX' : 'Upload a PDF or DOCX'}
        <input
          type="file"
          accept=".pdf,.docx"
          className="mt-1 block"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void upload(file);
          }}
        />
      </label>
      {resume && (
        <Button variant="secondary" onClick={() => void remove()}>
          Remove resume
        </Button>
      )}
      <p role="status" className="text-sm">
        {message}
      </p>
    </section>
  );
}
