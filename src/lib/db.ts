/**
 * Local storage layer (IndexedDB via `idb`).
 *
 * Two object stores:
 *   - `meta`:    non-secret vault metadata (salts + wrapped keys) and small
 *                settings. Storing these in the clear is safe — they reveal
 *                nothing without the passphrase or recovery code.
 *   - `entries`: one record per calendar day. The `blob` is the AES-GCM
 *                ciphertext of that day's log; the date key is left in the clear
 *                so the app can look days up without decrypting everything.
 *
 * Nothing here ever touches the network. This is the only place data is
 * persisted, and it lives solely in this browser on this device.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { EncBlob, VaultMeta } from './crypto';

const DB_NAME = 'cadence';
const DB_VERSION = 1;
const META_STORE = 'meta';
const ENTRIES_STORE = 'entries';
const VAULT_KEY = 'vault';
const SETTINGS_KEY = 'settings';

export interface Settings {
  fallbackCycleLength: number;
}

/** An encrypted day record as stored on disk. */
export interface StoredEntry {
  date: string;
  blob: EncBlob;
}

/** The shape of an encrypted backup file. */
export interface BackupFile {
  app: 'cadence';
  version: number;
  exportedAt: string;
  meta: VaultMeta;
  settings: Settings;
  entries: StoredEntry[];
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(META_STORE)) {
          database.createObjectStore(META_STORE);
        }
        if (!database.objectStoreNames.contains(ENTRIES_STORE)) {
          database.createObjectStore(ENTRIES_STORE, { keyPath: 'date' });
        }
      },
    });
  }
  return dbPromise;
}

// ---- vault metadata --------------------------------------------------------

export async function getVaultMeta(): Promise<VaultMeta | undefined> {
  return (await db()).get(META_STORE, VAULT_KEY);
}

export async function saveVaultMeta(meta: VaultMeta): Promise<void> {
  await (await db()).put(META_STORE, meta, VAULT_KEY);
}

export async function hasVault(): Promise<boolean> {
  return (await getVaultMeta()) !== undefined;
}

// ---- settings --------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const s = (await (await db()).get(META_STORE, SETTINGS_KEY)) as Settings | undefined;
  return s ?? { fallbackCycleLength: 28 };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await (await db()).put(META_STORE, settings, SETTINGS_KEY);
}

// ---- entries ---------------------------------------------------------------

export async function getAllStoredEntries(): Promise<StoredEntry[]> {
  return (await db()).getAll(ENTRIES_STORE);
}

export async function putStoredEntry(entry: StoredEntry): Promise<void> {
  await (await db()).put(ENTRIES_STORE, entry);
}

export async function deleteStoredEntry(date: string): Promise<void> {
  await (await db()).delete(ENTRIES_STORE, date);
}

// ---- backup / restore ------------------------------------------------------

export async function buildBackup(): Promise<BackupFile | null> {
  const meta = await getVaultMeta();
  if (!meta) return null;
  return {
    app: 'cadence',
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    meta,
    settings: await getSettings(),
    entries: await getAllStoredEntries(),
  };
}

/** Replace all local data with the contents of a backup file. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  if (backup.app !== 'cadence' || !backup.meta) {
    throw new Error('This does not look like a Cadence backup file.');
  }
  const database = await db();
  const tx = database.transaction([META_STORE, ENTRIES_STORE], 'readwrite');
  await tx.objectStore(META_STORE).clear();
  await tx.objectStore(ENTRIES_STORE).clear();
  await tx.objectStore(META_STORE).put(backup.meta, VAULT_KEY);
  await tx.objectStore(META_STORE).put(backup.settings ?? { fallbackCycleLength: 28 }, SETTINGS_KEY);
  for (const e of backup.entries ?? []) await tx.objectStore(ENTRIES_STORE).put(e);
  await tx.done;
}

/** Permanently erase everything Cadence has stored on this device. */
export async function wipeEverything(): Promise<void> {
  const database = await db();
  const tx = database.transaction([META_STORE, ENTRIES_STORE], 'readwrite');
  await tx.objectStore(META_STORE).clear();
  await tx.objectStore(ENTRIES_STORE).clear();
  await tx.done;
}
