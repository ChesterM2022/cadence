/**
 * Cadence application state.
 *
 * Supports multiple profiles on one device. The active profile's decryption key
 * lives ONLY in memory while unlocked and is dropped on lock or profile switch.
 * All persistence goes through db.ts, namespaced by the active profile id.
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
  getProfiles,
  saveProfiles,
  getVaultMeta,
  saveVaultMeta,
  deleteVaultMeta,
  getSettings,
  saveSettings,
  getAllStoredEntries,
  putStoredEntry,
  deleteStoredEntry,
  deleteProfileData,
  buildBackup,
  restoreBackup,
  wipeEverything,
  type Settings,
  type BackupFile,
  type ProfileMeta,
  type Registry,
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

export type Screen = 'loading' | 'onboarding' | 'picker' | 'locked' | 'app';
export type Tab = 'today' | 'history' | 'learn' | 'settings';

export const screen = writable<Screen>('loading');

export const activeTab = writable<Tab>('today');
export const learnFocus = writable<Phase | null>(null);

export function goToLearn(phase: Phase): void {
  learnFocus.set(phase);
  activeTab.set('learn');
}

export const entries = writable<DayEntry[]>([]);
export const settings = writable<Settings>({ fallbackCycleLength: 28 });
export const profiles = writable<ProfileMeta[]>([]);
export const activeProfile = writable<ProfileMeta | null>(null);

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

/** Whether the active profile's data is encrypted or stored open. */
export const encryptedMode = writable<boolean>(true);

// In-memory only. All reset on lock / profile switch.
let dek: CryptoKey | null = null;
let meta: VaultMeta | null = null;
let encrypted = true;
let activeId: string | null = null;
let registry: Registry = { list: [], activeId: null };

function setEncrypted(v: boolean): void {
  encrypted = v;
  encryptedMode.set(v);
}

function publishRegistry(): void {
  profiles.set(registry.list);
  activeProfile.set(registry.list.find((p) => p.id === activeId) ?? null);
}

/** Enter the main app, always landing on the Today tab. */
function toApp(): void {
  activeTab.set('today');
  screen.set('app');
}

// ---- startup ---------------------------------------------------------------

export async function init(): Promise<void> {
  registry = await getProfiles();
  profiles.set(registry.list);
  if (registry.list.length === 0) {
    screen.set('onboarding');
  } else if (registry.list.length === 1) {
    await selectProfile(registry.list[0].id);
  } else {
    // Preselect the last-used profile in the picker, but let the user choose.
    activeId = registry.activeId;
    publishRegistry();
    screen.set('picker');
  }
}

/** Open a profile: unlock screen if encrypted, straight into the app if open. */
export async function selectProfile(id: string): Promise<void> {
  activeId = id;
  const prof = registry.list.find((p) => p.id === id) ?? null;
  registry.activeId = id;
  await saveProfiles(registry);
  publishRegistry();
  settings.set(await getSettings(id));

  if (prof?.encrypted) {
    meta = (await getVaultMeta(id)) ?? null;
    dek = null;
    entries.set([]);
    setEncrypted(true);
    screen.set('locked');
  } else {
    meta = null;
    dek = null;
    setEncrypted(false);
    await loadEntries();
    toApp();
  }
}

async function loadEntries(): Promise<void> {
  if (!activeId) return;
  const stored = await getAllStoredEntries(activeId);
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

// ---- profile navigation ----------------------------------------------------

/** Leave the current profile and show the picker to choose another. */
export function switchProfile(): void {
  dek = null;
  meta = null;
  entries.set([]);
  screen.set('picker');
}

/** From the picker: begin creating a new profile. */
export function startAddProfile(): void {
  dek = null;
  meta = null;
  activeId = null;
  entries.set([]);
  activeProfile.set(null);
  screen.set('onboarding');
}

// ---- onboarding / profile creation -----------------------------------------

export interface OnboardingInput {
  name: string;
  lastPeriodStart: string;
  cycleLength: number;
  passphrase: string;
}

function addProfileToRegistry(id: string, name: string, isEncrypted: boolean): void {
  registry.list.push({
    id,
    name: name.trim() || 'Me',
    encrypted: isEncrypted,
    createdAt: new Date().toISOString(),
  });
  registry.activeId = id;
}

/** Create an encrypted profile, seed the first period, return the one-time code. */
export async function completeOnboarding(input: OnboardingInput): Promise<string> {
  const id = crypto.randomUUID();
  const vault = await createVault(input.passphrase);
  await saveVaultMeta(id, vault.meta);
  const newSettings: Settings = { fallbackCycleLength: input.cycleLength };
  await saveSettings(id, newSettings);
  activeId = id;
  meta = vault.meta;
  dek = vault.dek;
  setEncrypted(true);
  settings.set(newSettings);
  addProfileToRegistry(id, input.name, true);
  await saveProfiles(registry);
  publishRegistry();
  await saveDay({ date: input.lastPeriodStart, flow: 'medium' });
  // Stay on onboarding so the recovery code can be shown; caller calls enterApp.
  return vault.recoveryCode;
}

/** Create an open (no-passphrase) profile — data stored unencrypted. */
export async function completeOnboardingOpen(
  input: Omit<OnboardingInput, 'passphrase'>,
): Promise<void> {
  const id = crypto.randomUUID();
  const newSettings: Settings = { fallbackCycleLength: input.cycleLength };
  await saveSettings(id, newSettings);
  activeId = id;
  meta = null;
  dek = null;
  setEncrypted(false);
  settings.set(newSettings);
  addProfileToRegistry(id, input.name, false);
  await saveProfiles(registry);
  publishRegistry();
  await saveDay({ date: input.lastPeriodStart, flow: 'medium' });
  toApp();
}

export function enterApp(): void {
  toApp();
}

// ---- unlock / lock ---------------------------------------------------------

export async function unlockWithPass(passphrase: string): Promise<void> {
  if (!meta) throw new Error('No vault on this device.');
  dek = await unlockWithPassphrase(meta, passphrase);
  setEncrypted(true);
  await loadEntries();
  toApp();
}

export async function unlockWithCode(code: string): Promise<void> {
  if (!meta) throw new Error('No vault on this device.');
  dek = await unlockWithRecoveryCode(meta, code);
  setEncrypted(true);
  await loadEntries();
  toApp();
}

export function lock(): void {
  dek = null;
  entries.set([]);
  screen.set('locked');
}

// ---- entries ---------------------------------------------------------------

export function getEntry(date: string): DayEntry {
  return get(entries).find((e) => e.date === date) ?? { date };
}

export async function saveDay(entry: DayEntry): Promise<void> {
  if (!activeId) throw new Error('No active profile.');
  if (encrypted && !dek) throw new Error('Locked.');
  const rest = get(entries).filter((e) => e.date !== entry.date);
  if (hasAnyData(entry)) {
    const stored =
      encrypted && dek
        ? { profileId: activeId, date: entry.date, blob: await encryptJSON(dek, entry) }
        : { profileId: activeId, date: entry.date, plain: entry };
    await putStoredEntry(stored);
    rest.push(entry);
  } else {
    await deleteStoredEntry(activeId, entry.date);
  }
  rest.sort((a, b) => a.date.localeCompare(b.date));
  entries.set(rest);
  recompute();
}

// ---- passphrase management -------------------------------------------------

function setProfileEncryptedFlag(value: boolean): void {
  const p = registry.list.find((x) => x.id === activeId);
  if (p) p.encrypted = value;
}

export async function changeVaultPassphrase(newPassphrase: string): Promise<void> {
  if (!meta || !dek || !activeId) throw new Error('Locked.');
  meta = await changePassphrase(meta, dek, newPassphrase);
  await saveVaultMeta(activeId, meta);
}

/** Add a passphrase to the active open profile, encrypting existing entries. */
export async function addPassphrase(passphrase: string): Promise<string> {
  if (!activeId) throw new Error('No active profile.');
  const vault = await createVault(passphrase);
  await saveVaultMeta(activeId, vault.meta);
  meta = vault.meta;
  dek = vault.dek;
  setEncrypted(true);
  for (const e of get(entries)) {
    await putStoredEntry({ profileId: activeId, date: e.date, blob: await encryptJSON(dek, e) });
  }
  setProfileEncryptedFlag(true);
  await saveProfiles(registry);
  publishRegistry();
  return vault.recoveryCode;
}

/** Remove the active profile's passphrase, decrypting its entries to plaintext. */
export async function removePassphrase(): Promise<void> {
  if (!encrypted || !dek || !activeId) throw new Error('No passphrase set.');
  for (const e of get(entries)) {
    await putStoredEntry({ profileId: activeId, date: e.date, plain: e });
  }
  await deleteVaultMeta(activeId);
  meta = null;
  dek = null;
  setEncrypted(false);
  setProfileEncryptedFlag(false);
  await saveProfiles(registry);
  publishRegistry();
}

// ---- backup / restore ------------------------------------------------------

export async function exportBackup(): Promise<BackupFile> {
  if (!activeId) throw new Error('No active profile.');
  const backup = await buildBackup(activeId);
  if (!backup) throw new Error('Nothing to export yet.');
  return backup;
}

/** Restore a backup into the ACTIVE profile. Encrypted backups return to lock. */
export async function importBackup(backup: BackupFile): Promise<void> {
  if (!activeId) throw new Error('No active profile.');
  await restoreBackup(activeId, backup);
  settings.set(backup.settings ?? { fallbackCycleLength: 28 });
  setProfileEncryptedFlag(Boolean(backup.meta));
  await saveProfiles(registry);
  publishRegistry();
  if (backup.meta) {
    meta = backup.meta;
    dek = null;
    setEncrypted(true);
    lock();
  } else {
    meta = null;
    dek = null;
    setEncrypted(false);
    await loadEntries();
    toApp();
  }
}

// ---- deletion --------------------------------------------------------------

/** Delete the active profile and its data, then route to what remains. */
export async function deleteThisProfile(): Promise<void> {
  if (!activeId) return;
  const removed = activeId;
  await deleteProfileData(removed);
  registry.list = registry.list.filter((p) => p.id !== removed);
  if (registry.activeId === removed) registry.activeId = registry.list[0]?.id ?? null;
  await saveProfiles(registry);
  dek = null;
  meta = null;
  activeId = null;
  entries.set([]);
  publishRegistry();

  if (registry.list.length === 0) screen.set('onboarding');
  else if (registry.list.length === 1) await selectProfile(registry.list[0].id);
  else screen.set('picker');
}

/** Erase every profile on this device. */
export async function deleteEverything(): Promise<void> {
  await wipeEverything();
  dek = null;
  meta = null;
  activeId = null;
  registry = { list: [], activeId: null };
  setEncrypted(true);
  entries.set([]);
  publishRegistry();
  screen.set('onboarding');
}
