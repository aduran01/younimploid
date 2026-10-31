import { BackupError, summarizeBackup, type BackupSummary } from '../shared/storage/backup';

export type ImportState =
  | { step: 'idle' }
  | { step: 'confirming'; json: string; summary: BackupSummary }
  | { step: 'done' }
  | { step: 'error'; message: string };

function errorState(error: unknown): ImportState {
  const message = error instanceof BackupError ? error.message : 'The import failed.';
  return { step: 'error', message };
}

// Choosing a file only reads it. Nothing is overwritten until confirmImport runs.
export function prepareImport(json: string): ImportState {
  try {
    return { step: 'confirming', json, summary: summarizeBackup(json) };
  } catch (error) {
    return errorState(error);
  }
}

export async function confirmImport(
  state: ImportState,
  runImport: (json: string) => Promise<void>,
): Promise<ImportState> {
  if (state.step !== 'confirming') return state;
  try {
    await runImport(state.json);
    return { step: 'done' };
  } catch (error) {
    return errorState(error);
  }
}

// Lists what the import replaces, for the confirmation prompt.
export function describeSummary(summary: BackupSummary): string[] {
  return [
    ...(summary.hasProfile ? ['Your profile'] : []),
    ...(summary.hasSettings ? ['Your settings'] : []),
    ...(summary.applicationCount === null
      ? []
      : [`Your tracker (${summary.applicationCount} applications in the backup)`]),
    ...(summary.auditEntryCount === null
      ? []
      : [`Your audit log (${summary.auditEntryCount} entries in the backup)`]),
    ...(summary.hasResume ? ['Your resume file'] : []),
  ];
}
