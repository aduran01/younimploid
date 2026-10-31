import { useState } from 'react';
import { exportBackup, importBackup } from '../shared/storage/backup';
import { Button } from '../shared/ui/Button';
import { confirmImport, describeSummary, prepareImport, type ImportState } from './importFlow';

function download(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `younimploid-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function BackupTab() {
  const [includeResume, setIncludeResume] = useState(false);
  const [includeAiKey, setIncludeAiKey] = useState(false);
  const [exportError, setExportError] = useState('');
  const [importState, setImportState] = useState<ImportState>({ step: 'idle' });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Export</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeResume}
            onChange={(event) => setIncludeResume(event.target.checked)}
          />
          Include my resume file
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeAiKey}
            onChange={(event) => setIncludeAiKey(event.target.checked)}
          />
          Include my AI key (the backup file stores it unencrypted)
        </label>
        <Button
          onClick={() => {
            setExportError('');
            exportBackup({ includeResume, includeAiKey }).then(download, () =>
              setExportError('Could not create the backup.'),
            );
          }}
        >
          Export backup
        </Button>
        {exportError && <p className="text-sm text-red-700">{exportError}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Import</h2>
        <label className="block text-sm">
          Choose a backup file
          <input
            type="file"
            accept=".json,application/json"
            className="mt-1 block"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              file?.text().then(
                (json) => setImportState(prepareImport(json)),
                () => setImportState({ step: 'error', message: 'Could not read this file.' }),
              );
            }}
          />
        </label>

        {importState.step === 'confirming' && (
          <div role="alertdialog" className="space-y-3 rounded border border-amber-600 p-3">
            <p className="font-semibold">This will overwrite:</p>
            <ul className="list-disc pl-5 text-sm">
              {describeSummary(importState.summary).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  void confirmImport(importState, importBackup).then(setImportState);
                }}
              >
                Overwrite my data
              </Button>
              <Button variant="secondary" onClick={() => setImportState({ step: 'idle' })}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        {importState.step === 'done' && (
          <p role="status" className="text-sm">
            Backup imported.
          </p>
        )}
        {importState.step === 'error' && (
          <p className="text-sm text-red-700">{importState.message}</p>
        )}
      </section>
    </div>
  );
}
