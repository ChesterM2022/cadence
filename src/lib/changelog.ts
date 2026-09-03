/**
 * User-facing changelog. Bump APP_VERSION when you ship, and add an entry at the
 * top. The "What's new" banner appears once after the version a viewer last saw
 * changes (see updates.ts); the full list lives in Settings.
 */

export const APP_VERSION = '0.4';

export interface ChangelogEntry {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.4',
    date: '2026-09-03',
    title: 'Clearer privacy choices',
    items: [
      'Added a clear choice for optional, anonymous Google Analytics page views.',
      'Clarified that traffic analytics never include cycle dates, symptoms, notes, profile names, or phase information.',
    ],
  },
  {
    version: '0.3',
    date: '2026-09-03',
    title: 'Profiles',
    items: [
      'More than one person can now use Cadence in the same browser — each with their own private, separate profile.',
      'A profile picker lets you choose who’s using it; switch anytime from the bar at the top of Today or from Settings.',
      'Each profile is independently open or passphrase-protected — your data stays sealed from the others.',
    ],
  },
  {
    version: '0.2',
    date: '2026-08-28',
    title: 'More flexible, more informative',
    items: [
      'A passphrase is now optional — skip it for a lock-free experience, or add one anytime to encrypt your data (and remove it later if you change your mind).',
      'New cycle wheel on Today, showing the four phases and exactly where you are.',
      'Today now speaks to your week — like “late luteal” — not just the phase.',
      'Every phase now explains how it shifts from its early days to its end.',
      'Added a Save button with a “Saved ✓” confirmation (entries still save automatically).',
      'The bottom menu now stays visible while you scroll.',
      'A fresh app icon.',
    ],
  },
];
