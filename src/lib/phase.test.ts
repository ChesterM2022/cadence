import { describe, it, expect } from 'vitest';
import {
  computeCycleStats,
  currentPhase,
  predictNextPeriod,
  derivePeriods,
  lastPeriodStart,
  type PeriodLog,
} from './phase';
import { addDays } from './dates';
import type { DayEntry } from './types';

// Build a run of regular period starts every `cycle` days ending at `last`.
function regularPeriods(last: string, cycle: number, count: number): PeriodLog[] {
  const out: PeriodLog[] = [];
  for (let i = count - 1; i >= 0; i--) {
    out.push({ start: addDays(last, -i * cycle), lengthDays: 5 });
  }
  return out;
}

describe('computeCycleStats', () => {
  it('falls back to the onboarding estimate with no history', () => {
    const stats = computeCycleStats([{ start: '2026-08-01' }], 30);
    expect(stats.cyclesTracked).toBe(0);
    expect(stats.avgCycleLength).toBe(30);
    expect(stats.confidence).toBe('estimated');
  });

  it('averages regular cycles and reports high confidence with enough history', () => {
    const stats = computeCycleStats(regularPeriods('2026-08-01', 28, 7));
    expect(stats.avgCycleLength).toBe(28);
    expect(stats.cycleVariability).toBe(0);
    expect(stats.cyclesTracked).toBe(6);
    expect(stats.confidence).toBe('high');
  });

  it('downgrades confidence when cycles are irregular', () => {
    const starts = ['2026-01-01', '2026-02-05', '2026-02-25', '2026-04-10', '2026-04-30', '2026-06-15', '2026-07-01'];
    const stats = computeCycleStats(starts.map((s) => ({ start: s, lengthDays: 5 })));
    expect(stats.cyclesTracked).toBe(6);
    expect(stats.cycleVariability).toBeGreaterThan(9);
    expect(stats.confidence).toBe('medium');
  });

  it('ignores implausible gaps (double-logs and long tracking breaks)', () => {
    const stats = computeCycleStats([
      { start: '2026-06-01' },
      { start: '2026-06-02' }, // 1-day gap → ignored
      { start: '2026-06-29' }, // 27-day gap → counted
    ]);
    expect(stats.cyclesTracked).toBe(1);
    expect(stats.avgCycleLength).toBe(27);
  });
});

describe('currentPhase', () => {
  const stats = computeCycleStats(regularPeriods('2026-08-01', 28, 7));

  it('is menstrual during bleeding days', () => {
    expect(currentPhase('2026-08-01', '2026-08-01', stats).phase).toBe('menstrual');
    expect(currentPhase('2026-08-05', '2026-08-01', stats).phase).toBe('menstrual');
  });

  it('is follicular after the period and before ovulation', () => {
    expect(currentPhase('2026-08-09', '2026-08-01', stats).phase).toBe('follicular');
  });

  it('is ovulatory around cycle day 14 for a 28-day cycle', () => {
    // ovulation ≈ 28 - 14 = day 14 → 2026-08-14
    const info = currentPhase('2026-08-14', '2026-08-01', stats);
    expect(info.ovulationDay).toBe(14);
    expect(info.phase).toBe('ovulatory');
  });

  it('is luteal after ovulation until the next period', () => {
    expect(currentPhase('2026-08-22', '2026-08-01', stats).phase).toBe('luteal');
  });

  it('flags a late period but stays luteal', () => {
    const info = currentPhase('2026-08-31', '2026-08-01', stats); // day 31 > 28
    expect(info.isLate).toBe(true);
    expect(info.phase).toBe('luteal');
  });

  it('reports a 1-based day of cycle', () => {
    expect(currentPhase('2026-08-01', '2026-08-01', stats).dayOfCycle).toBe(1);
    expect(currentPhase('2026-08-10', '2026-08-01', stats).dayOfCycle).toBe(10);
  });
});

describe('derivePeriods', () => {
  it('groups consecutive bleeding days into one period with a length', () => {
    const entries: DayEntry[] = [
      { date: '2026-08-01', flow: 'medium' },
      { date: '2026-08-02', flow: 'medium' },
      { date: '2026-08-03', flow: 'light' },
    ];
    const periods = derivePeriods(entries);
    expect(periods).toEqual([{ start: '2026-08-01', lengthDays: 3 }]);
  });

  it('ignores spotting when detecting a period start', () => {
    const entries: DayEntry[] = [
      { date: '2026-08-01', flow: 'spotting' },
      { date: '2026-08-02', flow: 'light' },
      { date: '2026-08-03', flow: 'medium' },
    ];
    expect(derivePeriods(entries)[0].start).toBe('2026-08-02');
  });

  it('separates two periods and leaves a single-day run length undefined', () => {
    const entries: DayEntry[] = [
      { date: '2026-08-01', flow: 'medium' }, // single-day run
      { date: '2026-08-29', flow: 'medium' },
      { date: '2026-08-30', flow: 'light' },
    ];
    const periods = derivePeriods(entries);
    expect(periods).toEqual([
      { start: '2026-08-01', lengthDays: undefined },
      { start: '2026-08-29', lengthDays: 2 },
    ]);
    expect(lastPeriodStart(periods)).toBe('2026-08-29');
  });

  it('returns nothing when only non-bleeding data is logged', () => {
    expect(derivePeriods([{ date: '2026-08-01', energy: 'high' }])).toEqual([]);
    expect(lastPeriodStart([])).toBeUndefined();
  });
});

describe('predictNextPeriod', () => {
  it('predicts one cycle length after the last start', () => {
    const stats = computeCycleStats(regularPeriods('2026-08-01', 28, 7));
    const p = predictNextPeriod('2026-08-10', '2026-08-01', stats);
    expect(p.date).toBe('2026-08-29');
    expect(p.daysAway).toBe(19);
  });

  it('uses at least a ±2 day range even for perfectly regular cycles', () => {
    const stats = computeCycleStats(regularPeriods('2026-08-01', 28, 7));
    const p = predictNextPeriod('2026-08-10', '2026-08-01', stats);
    expect(p.rangeStart).toBe('2026-08-27');
    expect(p.rangeEnd).toBe('2026-08-31');
  });

  it('reports a negative daysAway when the period is overdue', () => {
    const stats = computeCycleStats(regularPeriods('2026-08-01', 28, 7));
    const p = predictNextPeriod('2026-09-05', '2026-08-01', stats);
    expect(p.daysAway).toBeLessThan(0);
  });
});
