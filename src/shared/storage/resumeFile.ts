import { asFiniteNumber, isRecord } from './core';

export interface ResumeFile {
  blob: Blob;
  filename: string;
  mime: string;
  updatedAt: number;
}

export interface ResumeStore {
  get(): Promise<unknown>;
  put(file: ResumeFile): Promise<void>;
  delete(): Promise<void>;
}

const DB_NAME = 'younimploid';
const STORE_NAME = 'files';
const RESUME_KEY = 'resume';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open file storage'));
  });
}

async function runRequest<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(new Error('File storage request failed'));
      transaction.onabort = () => reject(new Error('File storage request failed'));
    });
  } finally {
    database.close();
  }
}

// IndexedDB in the extension's origin (D-005).
export const indexedDbResumeStore: ResumeStore = {
  get: () => runRequest('readonly', (store) => store.get(RESUME_KEY)),
  put: async (file) => {
    await runRequest('readwrite', (store) => store.put(file, RESUME_KEY));
  },
  delete: async () => {
    await runRequest('readwrite', (store) => store.delete(RESUME_KEY));
  },
};

export function normalizeResumeFile(raw: unknown): ResumeFile | null {
  if (!isRecord(raw) || !(raw.blob instanceof Blob)) return null;
  const updatedAt = asFiniteNumber(raw.updatedAt);
  if (typeof raw.filename !== 'string' || typeof raw.mime !== 'string' || updatedAt === null) {
    return null;
  }
  return { blob: raw.blob, filename: raw.filename, mime: raw.mime, updatedAt };
}

export async function getResumeFile(
  store: ResumeStore = indexedDbResumeStore,
): Promise<ResumeFile | null> {
  return normalizeResumeFile(await store.get());
}

export async function saveResumeFile(
  blob: Blob,
  filename: string,
  store: ResumeStore = indexedDbResumeStore,
): Promise<ResumeFile> {
  const file: ResumeFile = { blob, filename, mime: blob.type, updatedAt: Date.now() };
  await store.put(file);
  return file;
}

export function deleteResumeFile(store: ResumeStore = indexedDbResumeStore): Promise<void> {
  return store.delete();
}
