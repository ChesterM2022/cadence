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
  getSettings,
  saveSettings,
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

// In-memory only. Cleared on lock.
let dek: CryptoKey | null = null;
let meta: VaultMeta | null = null;

/** Decide the opening screen based on whether a vault already exists. */
export async function init(): Promise<void> {
  meta = (await getVaultMeta()) ?? null;
  settings.set(await getSettings());
  screen.set(meta ? 'locked' : 'onboarding');
}

async function loadEntries(): Promise<void> {
  if (!dek) return;
  const stored = await getAllStoredEntries();
  const decrypted: DayEntry[] = [];
  for (const s of stored) decrypted.push(await decryptJSON<DayEntry>(dek, s.blob));
  decrypted.sort((a, b) => a.date.localeCompare(b.date));
  entries.set(decrypted);
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
  settings.set(newSettings);
  // Seed the last period start so a phase can be shown immediately.
  await saveDay({ date: input.lastPeriodStart, flow: 'medium' });
  // NOTE: we intentionally stay on the onboarding screen so the one-time
  // recovery code can be shown. The caller invokes enterApp() once the user
  // confirms they've saved it.
  return vault.recoveryCode;
}

/** Move from onboarding into the app after the recovery code is acknowledged. */
export function enterApp(): void {
  screen.set('app');
}

export async function unlockWithPass(passphrase: string): Promise<void> {
  if (!meta) throw new Error('No vault on this device.');
  dek = await unlockWithPassphrase(meta, passphrase);
  await loadEntries();
  screen.set('app');
}

export async function unlockWithCode(code: string): Promise<void> {
  if (!meta) throw new Error('No vault on this device.');
  dek = await unlockWithRecoveryCode(meta, code);
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
  if (!dek) throw new Error('Locked.');
  const rest = get(entries).filter((e) => e.date !== entry.date);
  if (hasAnyData(entry)) {
    await putStoredEntry({ date: entry.date, blob: await encryptJSON(dek, entry) });
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

export async function exportBackup(): Promise<BackupFile> {
  const backup = await buildBackup();
  if (!backup) throw new Error('Nothing to export yet.');
  return backup;
}

/** Restore from a backup file. Data is re-encrypted; the app returns to locked. */
export async function importBackup(backup: BackupFile): Promise<void> {
  await restoreBackup(backup);
  meta = backup.meta;
  settings.set(backup.settings ?? { fallbackCycleLength: 28 });
  lock();
}

export async function deleteEverything(): Promise<void> {
  await wipeEverything();
  dek = null;
  meta = null;
  entries.set([]);
  screen.set('onboarding');
}
