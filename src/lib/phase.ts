/**
 * Cadence cycle & phase engine.
 *
 * This is a calendar-based estimate, the same method most trackers use: it reads
 * a woman's own logged period-start dates and works out where she likely is in
 * her cycle and when the next period is likely due. It is an ESTIMATE, not a
 * diagnosis, and it is honest about that — confidence grows with history and
 * drops when cycles are irregular. It is not a contraceptive method.
 *
 * Phase boundaries follow standard reproductive physiology:
 *   - menstrual:  bleeding days (cycle day 1 .. period length)
 *   - follicular: after bleeding, before the fertile window
 *   - ovulatory:  a short window around estimated ovulation
 *   - luteal:     after ovulation until the next period
 * Ovulation is estimated as ~14 days BEFORE the next expected period, because
 * the luteal phase length is far more consistent than the follicular one.
 */

import { addDays, daysBetween, toDayNumber } from './dates';
import { isBleeding, type DayEntry } from './types';

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type Confidence = 'estimated' | 'low' | 'medium' | 'high';

/** A logged period: its first day, and how many days it lasted (if known). */
export interface PeriodLog {
  start: string; // "YYYY-MM-DD"
  lengthDays?: number;
}

export interface CycleStats {
  avgCycleLength: number;
  avgPeriodLength: number;
  cycleVariability: number; // standard deviation of cycle lengths, in days
  cyclesTracked: number; // number of complete cycles observed (gaps between starts)
  confidence: Confidence;
}

export interface PhaseInfo {
  phase: Phase;
  dayOfCycle: number; // 1-based; day 1 is the first day of the period
  ovulationDay: number; // estimated cycle day of ovulation
  isLate: boolean; // true if the next period was expected before today
}

export interface Prediction {
  date: string; // most-likely next-period start
  rangeStart: string;
  rangeEnd: string;
  daysAway: number; // whole days from today (negative if overdue)
}

const DEFAULT_PERIOD_LENGTH = 5;
const LUTEAL_LENGTH = 14; // days from ovulation to next period
const OVULATION_WINDOW = 1; // ± days around estimated ovulation counted as "ovulatory"

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Summarize a woman's logged periods into cycle statistics.
 * `fallbackCycleLength` is her onboarding estimate, used until enough real
 * cycles have been logged to compute an average.
 */
export function computeCycleStats(
  periods: PeriodLog[],
  fallbackCycleLength = 28,
): CycleStats {
  const starts = periods
    .map((p) => p.start)
    .sort()
    .filter((s, i, arr) => arr.indexOf(s) === i);

  const cycleLengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const len = daysBetween(starts[i - 1], starts[i]);
    // Ignore implausible gaps (double-logs or long gaps in tracking).
    if (len >= 15 && len <= 60) cycleLengths.push(len);
  }

  const periodLengths = periods
    .map((p) => p.lengthDays)
    .filter((n): n is number => typeof n === 'number' && n > 0 && n <= 15);

  const cyclesTracked = cycleLengths.length;
  const avgCycleLength = cyclesTracked ? Math.round(mean(cycleLengths)) : fallbackCycleLength;
  const avgPeriodLength = periodLengths.length
    ? Math.round(mean(periodLengths))
    : DEFAULT_PERIOD_LENGTH;
  const cycleVariability = Math.round(stddev(cycleLengths) * 10) / 10;

  let confidence: Confidence;
  if (cyclesTracked === 0) confidence = 'estimated';
  else if (cyclesTracked < 3) confidence = 'low';
  else if (cyclesTracked < 6) confidence = 'medium';
  else confidence = 'high';
  // Irregular cycles reduce how much any calendar estimate can be trusted.
  if (confidence === 'high' && cycleVariability > 9) confidence = 'medium';
  else if (confidence === 'medium' && cycleVariability > 12) confidence = 'low';

  return { avgCycleLength, avgPeriodLength, cycleVariability, cyclesTracked, confidence };
}

/** Where in her cycle a woman is on `today`, given her most recent period start. */
export function currentPhase(
  today: string,
  lastPeriodStart: string,
  stats: CycleStats,
): PhaseInfo {
  const dayOfCycle = Math.max(1, daysBetween(lastPeriodStart, today) + 1);
  const ovulationDay = Math.max(1, stats.avgCycleLength - LUTEAL_LENGTH);
  const isLate = dayOfCycle > stats.avgCycleLength;

  let phase: Phase;
  if (dayOfCycle <= stats.avgPeriodLength) {
    phase = 'menstrual';
  } else if (dayOfCycle < ovulationDay - OVULATION_WINDOW) {
    phase = 'follicular';
  } else if (dayOfCycle <= ovulationDay + OVULATION_WINDOW) {
    phase = 'ovulatory';
  } else {
    phase = 'luteal';
  }

  return { phase, dayOfCycle, ovulationDay, isLate };
}

/** Predict the next period, with a range that widens when cycles are irregular. */
export function predictNextPeriod(
  today: string,
  lastPeriodStart: string,
  stats: CycleStats,
): Prediction {
  const date = addDays(lastPeriodStart, stats.avgCycleLength);
  // Uncertainty band: at least ±2 days, wider when variability is higher.
  const margin = clamp(Math.round(stats.cycleVariability), 2, 14);
  return {
    date,
    rangeStart: addDays(date, -margin),
    rangeEnd: addDays(date, margin),
    daysAway: daysBetween(today, date),
  };
}

/**
 * Derive discrete periods from logged days. A period is a run of consecutive
 * bleeding days; its length is only recorded when the run is 2+ days, so a
 * single onboarding day doesn't skew the average period length.
 */
export function derivePeriods(entries: DayEntry[]): PeriodLog[] {
  const bleedingDays = entries
    .filter(isBleeding)
    .map((e) => e.date)
    .sort();
  if (bleedingDays.length === 0) return [];

  const periods: PeriodLog[] = [];
  let runStart = bleedingDays[0];
  let runLength = 1;

  for (let i = 1; i < bleedingDays.length; i++) {
    const consecutive = toDayNumber(bleedingDays[i]) - toDayNumber(bleedingDays[i - 1]) === 1;
    if (consecutive) {
      runLength++;
    } else {
      periods.push({ start: runStart, lengthDays: runLength >= 2 ? runLength : undefined });
      runStart = bleedingDays[i];
      runLength = 1;
    }
  }
  periods.push({ start: runStart, lengthDays: runLength >= 2 ? runLength : undefined });
  return periods;
}

/** The start date of the most recent period, or undefined if none logged. */
export function lastPeriodStart(periods: PeriodLog[]): string | undefined {
  return periods.length ? periods[periods.length - 1].start : undefined;
}

export const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Menstrual phase',
  follicular: 'Follicular phase',
  ovulatory: 'Ovulatory phase',
  luteal: 'Luteal phase',
};
