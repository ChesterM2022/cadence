<script lang="ts">
  import { getEntry, saveDay } from '../store';
  import { MOOD_OPTIONS, type DayEntry, type Flow, type Energy, type Cramps, type Sleep } from '../types';

  let { date }: { date: string } = $props();

  let entry = $state<DayEntry>({ date: '' });

  // Load (and reload if the date ever changes) the stored entry for this day.
  $effect(() => {
    entry = { ...getEntry(date) };
  });

  function persist() {
    void saveDay({ ...entry, date });
  }

  function setFlow(v: Flow) {
    entry.flow = entry.flow === v ? undefined : v;
    persist();
  }
  function setEnergy(v: Energy) {
    entry.energy = entry.energy === v ? undefined : v;
    persist();
  }
  function setCramps(v: Cramps) {
    entry.cramps = entry.cramps === v ? undefined : v;
    persist();
  }
  function setSleep(v: Sleep) {
    entry.sleep = entry.sleep === v ? undefined : v;
    persist();
  }
  function toggleMood(m: string) {
    const set = new Set(entry.mood ?? []);
    if (set.has(m)) set.delete(m);
    else set.add(m);
    entry.mood = [...set];
    persist();
  }

  const flows: Flow[] = ['spotting', 'light', 'medium', 'heavy'];
  const energies: Energy[] = ['low', 'medium', 'high'];
  const crampLevels: Cramps[] = ['none', 'mild', 'moderate', 'strong'];
  const sleeps: Sleep[] = ['poor', 'ok', 'good'];
</script>

<div class="log">
  <div class="group">
    <div class="glabel">Flow</div>
    <div class="chip-row">
      {#each flows as f (f)}
        <button class="chip" aria-pressed={entry.flow === f} onclick={() => setFlow(f)}>{f}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">Energy</div>
    <div class="chip-row">
      {#each energies as e (e)}
        <button class="chip" aria-pressed={entry.energy === e} onclick={() => setEnergy(e)}>{e}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">Cramps</div>
    <div class="chip-row">
      {#each crampLevels as c (c)}
        <button class="chip" aria-pressed={entry.cramps === c} onclick={() => setCramps(c)}>{c}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">Sleep</div>
    <div class="chip-row">
      {#each sleeps as s (s)}
        <button class="chip" aria-pressed={entry.sleep === s} onclick={() => setSleep(s)}>{s}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">Mood</div>
    <div class="chip-row">
      {#each MOOD_OPTIONS as m (m)}
        <button class="chip" aria-pressed={entry.mood?.includes(m)} onclick={() => toggleMood(m)}>{m}</button>
      {/each}
    </div>
  </div>

  <div class="group">
    <div class="glabel">Notes</div>
    <textarea
      bind:value={entry.note}
      onblur={persist}
      rows="2"
      placeholder="Anything you want to remember about today…"
    ></textarea>
  </div>
</div>

<style>
  .group {
    margin-bottom: 1.1rem;
  }
  .glabel {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
    text-transform: capitalize;
  }
  .chip {
    text-transform: capitalize;
  }
  textarea {
    width: 100%;
    font-family: inherit;
    font-size: 0.95rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
    resize: vertical;
    color: var(--text);
  }
  textarea:focus {
    outline: 2px solid var(--clay);
    outline-offset: 1px;
  }
</style>
