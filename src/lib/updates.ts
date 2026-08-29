/**
 * "What's new" detection. Remembers the last app version a viewer has seen in
 * localStorage (per-device, private — never leaves the browser) and flips a
 * store when the running version is newer, so the banner shows once per update.
 *
 * First-ever run initializes silently to the current version, so brand-new
 * users don't see a "what's new" banner for changes they never missed.
 */

import { writable } from 'svelte/store';
import { APP_VERSION } from './changelog';

const KEY = 'cadence_seen_version';

export const showWhatsNew = writable(false);

export function initUpdates(): void {
  try {
    const seen = localStorage.getItem(KEY);
    if (seen === null) {
      localStorage.setItem(KEY, APP_VERSION); // first run — nothing to announce
    } else if (seen !== APP_VERSION) {
      showWhatsNew.set(true);
    }
  } catch {
    /* private mode / storage blocked — just don't show the banner */
  }
}

export function markSeen(): void {
  try {
    localStorage.setItem(KEY, APP_VERSION);
  } catch {
    /* ignore */
  }
  showWhatsNew.set(false);
}
