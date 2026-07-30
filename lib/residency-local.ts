/**
 * On-device storage for proof-of-residency documents.
 *
 * These files are identity documents — passports, driver's licences, bank
 * statements — so they are deliberately kept off our servers entirely. They
 * live in IndexedDB on the performer's own device and are read out only when
 * the performer chooses to attach them to an email.
 *
 * Consequences of that choice, which the page states plainly to the user:
 *   - the library is per-device and per-browser; it does not sync
 *   - clearing browser data removes it
 *   - BGReady cannot recover a lost document, because we never had it
 *
 * IndexedDB is used rather than localStorage because localStorage holds
 * strings only (a base64 photo would blow its ~5MB quota) and blocks the main
 * thread. Blobs go into IndexedDB natively.
 */

const DB_NAME = 'bgready-residency';
const DB_VERSION = 1;
const STORE = 'documents';

export type LocalResidencyDoc = {
  id: string;
  document_type: string;
  document_label: string | null;
  notes: string | null;
  filename: string;
  file_type: string;
  size: number;
  created_at: string;
  blob: Blob;
};

/** Metadata only — what the list UI needs, without holding every blob in memory. */
export type LocalResidencyMeta = Omit<LocalResidencyDoc, 'blob'>;

export function isLocalStorageSupported(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser cannot store documents on the device.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Could not open device storage.'));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    db =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('Device storage error.'));
        transaction.oncomplete = () => db.close();
      })
  );
}

export async function listLocalDocs(): Promise<LocalResidencyMeta[]> {
  const all = await tx<LocalResidencyDoc[]>('readonly', store => store.getAll() as IDBRequest<LocalResidencyDoc[]>);
  return all
    .map(({ blob: _blob, ...meta }) => meta)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addLocalDoc(input: {
  document_type: string;
  document_label: string | null;
  notes: string | null;
  file: File;
}): Promise<LocalResidencyMeta> {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const doc: LocalResidencyDoc = {
    id,
    document_type: input.document_type,
    document_label: input.document_label,
    notes: input.notes,
    filename: input.file.name,
    file_type: input.file.type || 'application/octet-stream',
    size: input.file.size,
    created_at: new Date().toISOString(),
    // Stored as a plain Blob so the File wrapper's name does not have to
    // survive structured cloning across browsers.
    blob: input.file.slice(0, input.file.size, input.file.type || 'application/octet-stream'),
  };

  await tx('readwrite', store => store.put(doc));
  const { blob: _blob, ...meta } = doc;
  return meta;
}

export async function getLocalDocFile(id: string): Promise<File | null> {
  const doc = await tx<LocalResidencyDoc | undefined>('readonly', store =>
    store.get(id) as IDBRequest<LocalResidencyDoc | undefined>
  );
  if (!doc) return null;
  return new File([doc.blob], doc.filename, { type: doc.file_type });
}

export async function deleteLocalDoc(id: string): Promise<void> {
  await tx('readwrite', store => store.delete(id));
}

export async function localDocsTotalBytes(): Promise<number> {
  const docs = await listLocalDocs();
  return docs.reduce((sum, d) => sum + d.size, 0);
}
