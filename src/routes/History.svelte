<script lang="ts">
  import { entries, cycle, getEntry } from '../lib/store';
  import { todayISO, addDays, formatDate } from '../lib/dates';
  import { isBleeding } from '../lib/types';
  import DayLog from '../lib/components/DayLog.svelte';

  const DAYS = 42;
  const today = todayISO();
  let selected = $state<string | null>(null);

  // Build the last DAYS days, newest first. Depends on $entries for reactivity.
  const days = $derived.by(() => {
    void $entries;
    return Array.from({ length: DAYS }, (_, i) => {
      const date = addDays(today, -i);
      const e = getEntry(date);
      return { date, entry: e, bleeding: isBleeding(e), logged: Boolean(e.flow || e.energy || e.cramps || e.sleep || e.note || e.mood?.length) };
    });
  });
</script>

<section>
  <h1 class="title">History</h1>

  <div class="stats card">
    <div class="stat">
      <span class="n">{$cycle.stats.avgCycleLength}</span>
      <span class="l muted small">avg cycle (days)</span>
    </div>
    <div class="stat">
      <span class="n">{$cycle.stats.avgPeriodLength}</span>
      <span class="l muted small">avg period (days)</span>
    </div>
    <div class="stat">
      <span class="n">{$cycle.stats.cyclesTracked}</span>
      <span class="l muted small">cycles tracked</span>
    </div>
  </div>

  <p class="muted small hint">Tap any day to view or edit what you logged.</p>

  <ul class="days">
    {#each days as d (d.date)}
      <li>
        <button class="day" class:sel={selected === d.date} onclick={() => (selected = selected === d.date ? null : d.date)}>
          <span class="marker" class:bleed={d.bleeding} class:some={d.logged && !d.bleeding}></span>
          <span class="dlabel">{d.date === today ? 'Today' : formatDate(d.date)}</span>
          {#if d.entry.flow}<span class="tag">{d.entry.flow}</span>{/if}
        </button>
        {#if selected === d.date}
          <div class="editor card"><DayLog date={d.date} /></div>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<style>
  .title {
    font-size: 1.5rem;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    text-align: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .stat {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }
  .stat .n {
    font-size: 1.5rem;
    font-weight: 650;
    color: var(--clay-dark);
  }
  .hint {
    margin: 0 0 0.5rem;
  }
  .days {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .day {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.7rem 0.4rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  .day.sel {
    color: var(--clay-dark);
    font-weight: 600;
  }
  .marker {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    flex-shrink: 0;
  }
  .marker.bleed {
    background: var(--menstrual);
    border-color: var(--menstrual);
  }
  .marker.some {
    background: var(--follicular-soft);
    border-color: var(--follicular);
  }
  .dlabel {
    flex: 1;
  }
  .tag {
    font-size: 0.75rem;
    text-transform: capitalize;
    color: var(--text-muted);
    background: var(--surface-2);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }
  .editor {
    margin: 0.5rem 0 1rem;
  }
</style>
