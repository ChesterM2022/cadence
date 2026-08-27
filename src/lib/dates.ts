/**
 * Calendar-date helpers. Cadence stores dates as plain "YYYY-MM-DD" strings and
 * does all arithmetic in whole days via UTC day-numbers, so results never shift
 * with the user's timezone or across daylight-saving boundaries.
 */

const MS_PER_DAY = 86_400_000;

/** Days since the Unix epoch for a "YYYY-MM-DD" date (timezone-independent). */
export function toDayNumber(iso: string): number {
  return Math.floor(Date.parse(iso + 'T00:00:00Z') / MS_PER_DAY);
}

export function fromDayNumber(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive if `b` is later). */
export function daysBetween(a: string, b: string): number {
  return toDayNumber(b) - toDayNumber(a);
}

export function addDays(iso: string, n: number): string {
  return fromDayNumber(toDayNumber(iso) + n);
}

/** Today's local calendar date as "YYYY-MM-DD". */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Human-friendly date, e.g. "27 Aug 2026". */
export function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
