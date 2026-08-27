<script lang="ts">
  import { cycle } from '../lib/store';
  import { todayISO, formatDate } from '../lib/dates';
  import { PHASE_CONTENT } from '../lib/phaseContent';
  import DayLog from '../lib/components/DayLog.svelte';

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
    <div class="phase-card phase-{info.phase}">
      <div class="daychip">Day {info.dayOfCycle}</div>
      <h1>{content.label}</h1>
      <p class="tagline">{content.tagline}</p>
      <p class="whats">{content.whatsHappening}</p>
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
  .daychip {
    display: inline-block;
    font-size: 0.78rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 999px;
    padding: 0.25rem 0.7rem;
    margin-bottom: 0.6rem;
  }
  .phase-card h1 {
    font-size: 1.5rem;
  }
  .tagline {
    font-weight: 600;
    margin-bottom: 0.6rem;
  }
  .whats {
    font-size: 0.95rem;
    margin: 0;
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
