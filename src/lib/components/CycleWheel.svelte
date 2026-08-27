<script lang="ts">
  import { PHASE_LABEL, type Phase } from '../phase';

  let {
    dayOfCycle,
    cycleLength,
    periodLength,
    ovulationDay,
    phase,
  }: {
    dayOfCycle: number;
    cycleLength: number;
    periodLength: number;
    ovulationDay: number;
    phase: Phase;
  } = $props();

  const SIZE = 200;
  const C = SIZE / 2; // center
  const R = 78; // ring radius
  const GAP = 2.4; // degrees of gap between segments

  // Map a cycle day (0..cycleLength) to an angle in degrees, 0 at the top,
  // increasing clockwise.
  function angleForDay(d: number): number {
    return (d / cycleLength) * 360 - 90;
  }

  function point(r: number, deg: number): { x: number; y: number } {
    const rad = (deg * Math.PI) / 180;
    return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
  }

  function arcPath(d0: number, d1: number): string {
    let a0 = angleForDay(d0);
    let a1 = angleForDay(d1);
    // inset for a small gap, but never past the segment's own extent
    if (a1 - a0 > 2 * GAP + 1) {
      a0 += GAP;
      a1 -= GAP;
    }
    const s = point(R, a0);
    const e = point(R, a1);
    const largeArc = a1 - a0 > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  }

  const segments = $derived.by(() => {
    const ovStart = Math.min(Math.max(periodLength, ovulationDay - 1), cycleLength);
    const ovEnd = Math.min(Math.max(ovStart, ovulationDay + 1), cycleLength);
    return [
      { phase: 'menstrual', color: 'var(--menstrual)', d0: 0, d1: periodLength },
      { phase: 'follicular', color: 'var(--follicular)', d0: periodLength, d1: ovStart },
      { phase: 'ovulatory', color: 'var(--ovulatory)', d0: ovStart, d1: ovEnd },
      { phase: 'luteal', color: 'var(--luteal)', d0: ovEnd, d1: cycleLength },
    ].filter((s) => s.d1 > s.d0) as { phase: Phase; color: string; d0: number; d1: number }[];
  });

  const marker = $derived(point(R, angleForDay(Math.min(dayOfCycle, cycleLength) - 0.5)));
</script>

<div class="wheel">
  <svg viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label="Day {dayOfCycle} of your cycle, {PHASE_LABEL[phase]}">
    <!-- background track -->
    <circle cx={C} cy={C} r={R} fill="none" stroke="var(--surface-2)" stroke-width="16" />
    <!-- phase segments -->
    {#each segments as s (s.phase)}
      <path
        d={arcPath(s.d0, s.d1)}
        fill="none"
        stroke={s.color}
        stroke-width="16"
        stroke-linecap="round"
        opacity={s.phase === phase ? 1 : 0.45}
      />
    {/each}
    <!-- current-day marker -->
    <circle cx={marker.x} cy={marker.y} r="9" fill="var(--surface)" stroke="var(--clay-dark)" stroke-width="3" />
    <!-- center label -->
    <text x={C} y={C - 6} text-anchor="middle" class="day-num">Day {dayOfCycle}</text>
    <text x={C} y={C + 16} text-anchor="middle" class="day-lbl">{PHASE_LABEL[phase].replace(' phase', '')}</text>
  </svg>
</div>

<style>
  .wheel {
    display: flex;
    justify-content: center;
    margin: 0.25rem 0 1.1rem;
  }
  svg {
    width: 190px;
    height: 190px;
  }
  .day-num {
    font-size: 26px;
    font-weight: 650;
    fill: var(--text);
  }
  .day-lbl {
    font-size: 12px;
    font-weight: 600;
    fill: var(--text-muted);
    text-transform: capitalize;
  }
</style>
