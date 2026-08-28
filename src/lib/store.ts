/**
 * Cadence application state.
 *
 * The Data Encryption Key lives ONLY in this module's memory while the app is
 * unlocked; it is never written to disk and is dropped on lock. All persistence
 * goes through `db.ts` as ciphertext. This module is the single place that holds
 * decrypted data in memory.
 */

import { writable, get } from 'svelte/store';
import {
  createVault,
  unlockWithPassphrase,
  unlockWithRecoveryCode,
  changePassphrase,
  encryptJSON,
  decryptJSON,
  type VaultMeta,
} from './crypto';
import {
  getVaultMeta,
  saveVaultMeta,
  deleteVaultMeta,
  getSettings,
  saveSettings,
  getMode,
  getAllStoredEntries,
  putStoredEntry,
  deleteStoredEntry,
  buildBackup,
  restoreBackup,
  wipeEverything,
  type Settings,
  type BackupFile,
} from './db';
import {
  computeCycleStats,
  currentPhase,
  predictNextPeriod,
  derivePeriods,
  lastPeriodStart,
  type CycleStats,
  type PhaseInfo,
  type Prediction,
  type Phase,
} from './phase';
import { hasAnyData, type DayEntry } from './types';
import { todayISO } from './dates';

export type Screen = 'loading' | 'onboarding' | 'locked' | 'app';
export type Tab = 'today' | 'history' | 'learn' | 'settings';

export const screen = writable<Screen>('loading');

/** Which main tab is showing, and (optionally) a phase to open in Learn. */
export const activeTab = writable<Tab>('today');
export const learnFocus = writable<Phase | null>(null);

/** Jump to the Learn tab with a specific phase expanded. */
export function goToLearn(phase: Phase): void {
  learnFocus.set(phase);
  activeTab.set('learn');
}
export const entries = writable<DayEntry[]>([]);
export const settings = writable<Settings>({ fallbackCycleLength: 28 });

export interface CycleView {
  stats: CycleStats;
  lastStart: string | undefined;
  phase: PhaseInfo | null;
  prediction: Prediction | null;
}

export const cycle = writable<CycleView>({
  stats: computeCycleStats([], 28),
  lastStart: undefined,
  phase: null,
  prediction: null,
});

/** Whether data on this device is encrypted (passphrase set) or stored open. */
export const encryptedMode = writable<boolean>(true);

// In-memory only. Cleared on lock. `encrypted` mirrors encryptedMode for logic.
let dek: CryptoKey | null = null;
let meta: VaultMeta | null = null;
let encrypted = true;

function setEncrypted(v: boolean): void {
  encrypted = v;
  encryptedMode.set(v);
}

/** Decide the opening screen based on the device's storage mode. */
export async function init(): Promise<void> {
  const mode = await getMode();
  settings.set(await getSettings());
  if (mode === 'encrypted') {
    meta = (await getVaultMeta()) ?? null;
    setEncrypted(true);
    screen.set('locked');
  } else if (mode === 'open') {
    setEncrypted(false);
    dek = null;
    await loadEntries();
    screen.set('app');
  } else {
    screen.set('onboarding');
  }
}

async function loadEntries(): Promise<void> {
  const stored = await getAllStoredEntries();
  const loaded: DayEntry[] = [];
  for (const s of stored) {
    if (s.plain) loaded.push(s.plain);
    else if (s.blob && dek) loaded.push(await decryptJSON<DayEntry>(dek, s.blob));
  }
  loaded.sort((a, b) => a.date.localeCompare(b.date));
  entries.set(loaded);
  recompute();
}

function recompute(): void {
  const all = get(entries);
  const s = get(settings);
  const periods = derivePeriods(all);
  const stats = computeCycleStats(periods, s.fallbackCycleLength);
  const lastStart = lastPeriodStart(periods);
  const today = todayISO();
  cycle.set({
    stats,
    lastStart,
    phase: lastStart ? currentPhase(today, lastStart, stats) : null,
    prediction: lastStart ? predictNextPeriod(today, lastStart, stats) : null,
  });
}

export interface OnboardingInput {
  lastPeriodStart: string;
  cycleLength: number;
  passphrase: string;
}

/** Create the vault, seed the first period, and return the one-time code. */
export async function completeOnboarding(input: OnboardingInput): Promise<string> {
  const vault = await createVault(input.passphrase);
  await saveVaultMeta(vault.meta);
  const newSettings: Settings = { fallbackCycleLength: input.cycleLength };
  await saveSettings(newSettings);
  meta = vault.meta;
  dek = vault.dek;
  setEncrypted(true);
  settings.set(newSettings);
  // Seed the last period start so a phase can be shown immediately.
  await saveDay({ date: input.lastPeriodStart, flow: 'medium' });
  // NOTE: we intentionally stay on the onboarding screen so the one-time
  // recovery code can be shown. The caller invokes enterApp() once the user
  // confirms they've saved it.
  return vault.recoveryCode;
}

/** Onboard WITHOUT a passphrase — data is stored unencrypted on this device. */
export async function completeOnboardingOpen(
  input: Omit<OnboardingInput, 'passphrase'>,
): Promise<void> {
  const newSettings: Settings = { fallbackCycleLength: input.cycleLength };
  await saveSettings(newSettings);
  meta = null;
  dek = null;
  setEncrypted(false);
  settings.set(newSettings);
  await saveDay({ date: input.lastPeriodStart, flow: 'medium' });
  screen.set('app');
}

/**
 * Add a passphrase to an existing open vault: create keys, encrypt everything
 * logged so far, and switch to encrypted mode. Returns the one-time code.
 */
export async function addPassphrase(passphrase: string): Promise<string> {
  const vault = await createVault(passphrase);
  await saveVaultMeta(vault.meta);
  meta = vault.meta;
  dek = vault.dek;
  setEncrypted(true);
  // Re-store every existing day as ciphertext (overwrites the plaintext record).
  for (const e of get(entries)) {
    await putStoredEntry({ date: e.date, blob: await encryptJSON(dek, e) });
  }
  return vault.recoveryCode;
}

/** Move from onboarding into the app after the recovery code is acknowledged. */
export function enterApp(): void {
  screen.set('app');
}

export async function unlockWithPass(passphrase: string): Promise<void> {
  if (!meta) throw new Error('No vault on this device.');
  dek = await unlockWithPassphrase(meta, passphrase);
  setEncrypted(true);
  await loadEntries();
  screen.set('app');
}

export async function unlockWithCode(code: string): Promise<void> {
  if (!meta) throw new Error('No vault on this device.');
  dek = await unlockWithRecoveryCode(meta, code);
  setEncrypted(true);
  await loadEntries();
  screen.set('app');
}

export function lock(): void {
  dek = null;
  entries.set([]);
  screen.set('locked');
}

export function getEntry(date: string): DayEntry {
  return get(entries).find((e) => e.date === date) ?? { date };
}

/** Save (or, if emptied, delete) a single day's log. */
export async function saveDay(entry: DayEntry): Promise<void> {
  if (encrypted && !dek) throw new Error('Locked.');
  const rest = get(entries).filter((e) => e.date !== entry.date);
  if (hasAnyData(entry)) {
    const stored =
      encrypted && dek
        ? { date: entry.date, blob: await encryptJSON(dek, entry) }
        : { date: entry.date, plain: entry };
    await putStoredEntry(stored);
    rest.push(entry);
  } else {
    await deleteStoredEntry(entry.date);
  }
  rest.sort((a, b) => a.date.localeCompare(b.date));
  entries.set(rest);
  recompute();
}

export async function changeVaultPassphrase(newPassphrase: string): Promise<void> {
  if (!meta || !dek) throw new Error('Locked.');
  meta = await changePassphrase(meta, dek, newPassphrase);
  await saveVaultMeta(meta);
}

/**
 * Remove the passphrase: decrypt every entry back to plaintext, drop the vault,
 * and switch to open mode. Data is then stored unencrypted on this device.
 */
export async function removePassphrase(): Promise<void> {
  if (!encrypted || !dek) throw new Error('No passphrase set.');
  for (const e of get(entries)) {
    await putStoredEntry({ date: e.date, plain: e }); // overwrites the ciphertext record
  }
  await deleteVaultMeta();
  meta = null;
  dek = null;
  setEncrypted(false);
}

export async function exportBackup(): Promise<BackupFile> {
  const backup = await buildBackup();
  if (!backup) throw new Error('Nothing to export yet.');
  return backup;
}

/** Restore from a backup file. An encrypted backup returns to the lock screen;
 * an open backup opens straight into the app. */
export async function importBackup(backup: BackupFile): Promise<void> {
  await restoreBackup(backup);
  settings.set(backup.settings ?? { fallbackCycleLength: 28 });
  if (backup.meta) {
    meta = backup.meta;
    setEncrypted(true);
    lock();
  } else {
    meta = null;
    dek = null;
    setEncrypted(false);
    await loadEntries();
    screen.set('app');
  }
}

export async function deleteEverything(): Promise<void> {
  await wipeEverything();
  dek = null;
  meta = null;
  setEncrypted(true);
  entries.set([]);
  screen.set('onboarding');
}
