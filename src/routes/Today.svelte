<script lang="ts">
  import { cycle, goToLearn } from '../lib/store';
  import { todayISO, formatDate } from '../lib/dates';
  import { PHASE_CONTENT, CONTEXTUAL_NOTE, positionHeadline } from '../lib/phaseContent';
  import { phasePosition } from '../lib/phase';
  import DayLog from '../lib/components/DayLog.svelte';
  import CycleWheel from '../lib/components/CycleWheel.svelte';

  const today = todayISO();

  const confidenceNote: Record<string, string> = {
    estimated: 'This is an early estimate — it sharpens as you log more.',
    low: 'Still learning your pattern — treat this as a rough guide.',
    medium: 'Based on a few of your cycles.',
    high: 'Based on several of your logged cycles.',
  };

  function predictionLine(daysAway: number): string {
    if (daysAway === 0) return 'Your next period may start today.';
    if (daysAway < 0) return `Your period is about ${Math.abs(daysAway)} day${Math.abs(daysAway) === 1 ? '' : 's'} late.`;
    return `Next period in about ${daysAway} day${daysAway === 1 ? '' : 's'}.`;
  }
</script>

<section>
  <header class="head">
    <span class="date muted small">{formatDate(today)}</span>
  </header>

  {#if $cycle.phase}
    {@const info = $cycle.phase}
    {@const content = PHASE_CONTENT[info.phase]}
    {@const pos = phasePosition(info.dayOfCycle, info.phase, $cycle.stats)}
    <div class="phase-card phase-{info.phase}">
      <CycleWheel
        dayOfCycle={info.dayOfCycle}
        cycleLength={$cycle.stats.avgCycleLength}
        periodLength={$cycle.stats.avgPeriodLength}
        ovulationDay={info.ovulationDay}
        phase={info.phase}
      />
      <h1>{positionHeadline(info.phase, pos)}</h1>
      <p class="context">{CONTEXTUAL_NOTE[info.phase][pos]}</p>
      <p class="whats">{content.whatsHappening}</p>
      <button class="learn-more" onclick={() => goToLearn(info.phase)}>
        Learn more about this phase →
      </button>
    </div>

    {#if $cycle.prediction}
      <div class="predict card">
        <strong>{predictionLine($cycle.prediction.daysAway)}</strong>
        <span class="small muted">
          Expected around {formatDate($cycle.prediction.date)}. {confidenceNote[$cycle.stats.confidence]}
        </span>
      </div>
    {/if}
  {:else}
    <div class="phase-card phase-follicular">
      <h1>Let's begin</h1>
      <p class="whats">Log your period days below and Cadence will start showing you where you are in your cycle.</p>
    </div>
  {/if}

  <div class="logcard card">
    <h2 class="logtitle">How are you today?</h2>
    <p class="small muted logsub">There are no wrong answers here — just what's true for you.</p>
    <DayLog date={today} />
  </div>
</section>

<style>
  .head {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 0.5rem;
  }
  .phase-card {
    border-radius: var(--radius);
    padding: 1.4rem 1.35rem;
    margin-bottom: 1rem;
    color: var(--text);
    border: 1px solid var(--border);
  }
  .phase-menstrual {
    background: var(--menstrual-soft);
    border-color: var(--menstrual);
  }
  .phase-follicular {
    background: var(--follicular-soft);
    border-color: var(--follicular);
  }
  .phase-ovulatory {
    background: var(--ovulatory-soft);
    border-color: var(--ovulatory);
  }
  .phase-luteal {
    background: var(--luteal-soft);
    border-color: var(--luteal);
  }
  .phase-card h1 {
    font-size: 1.5rem;
    text-align: center;
  }
  .context {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.7rem;
  }
  .whats {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin: 0;
  }
  .learn-more {
    margin-top: 0.9rem;
    padding: 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--clay-dark);
  }
  .learn-more:hover {
    text-decoration: underline;
  }
  .predict {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }
  .logcard {
    margin-top: 0.25rem;
  }
  .logtitle {
    font-size: 1.15rem;
    margin-bottom: 0.1rem;
  }
  .logsub {
    margin-bottom: 1rem;
  }
</style>
