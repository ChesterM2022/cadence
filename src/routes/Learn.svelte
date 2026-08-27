<script lang="ts">
  import { PHASE_CONTENT, MEDICAL_DISCLAIMER } from '../lib/phaseContent';
  import type { Phase } from '../lib/phase';
  import { cycle, learnFocus } from '../lib/store';

  const order: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
  let open = $state<Phase | null>($learnFocus ?? $cycle.phase?.phase ?? 'menstrual');

  // If we arrived here via a "Learn more" link, open that phase, then clear the
  // request so a later manual visit isn't forced back to it.
  $effect(() => {
    if ($learnFocus) {
      open = $learnFocus;
      learnFocus.set(null);
    }
  });
</script>

<section>
  <h1 class="title">Your cycle, explained</h1>
  <p class="muted small intro">
    Four phases, one continuous rhythm. Here's what's happening in each — the biology, plainly, with
    no shoulds.
  </p>

  {#each order as p (p)}
    {@const c = PHASE_CONTENT[p]}
    <div class="acc card phase-{p}" class:current={$cycle.phase?.phase === p}>
      <button class="acc-head" aria-expanded={open === p} onclick={() => (open = open === p ? null : p)}>
        <span>
          <span class="dot"></span>{c.label}
          {#if $cycle.phase?.phase === p}<span class="now">you're here</span>{/if}
        </span>
        <span class="chev">{open === p ? '–' : '+'}</span>
      </button>
      {#if open === p}
        <div class="acc-body">
          <p class="tagline">{c.tagline}</p>
          <h3>What's happening</h3>
          <p>{c.whatsHappening}</p>
          <h3>Commonly noticed</h3>
          <p>{c.commonlyNoticed}</p>
          <p class="reminder">{c.reminder}</p>
        </div>
      {/if}
    </div>
  {/each}

  <p class="disclaimer small muted">{MEDICAL_DISCLAIMER}</p>
</section>

<style>
  .title {
    font-size: 1.5rem;
  }
  .intro {
    margin-bottom: 1.25rem;
  }
  .acc {
    padding: 0;
    overflow: hidden;
    margin-bottom: 0.75rem;
  }
  .acc-head {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.15rem;
    font-weight: 600;
    font-size: 1.05rem;
  }
  .acc-head > span:first-child {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    display: inline-block;
  }
  .phase-menstrual .dot { background: var(--menstrual); }
  .phase-follicular .dot { background: var(--follicular); }
  .phase-ovulatory .dot { background: var(--ovulatory); }
  .phase-luteal .dot { background: var(--luteal); }
  .now {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--clay-dark);
    background: var(--clay-soft);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }
  .chev {
    color: var(--text-muted);
    font-size: 1.3rem;
  }
  .acc-body {
    padding: 0 1.15rem 1.15rem;
  }
  .tagline {
    font-weight: 600;
  }
  .acc-body h3 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    margin: 1rem 0 0.3rem;
  }
  .reminder {
    font-size: 0.9rem;
    background: var(--surface-2);
    border-radius: var(--radius-sm);
    padding: 0.75rem 0.9rem;
    margin-top: 0.75rem;
  }
  .disclaimer {
    margin-top: 1.5rem;
    line-height: 1.5;
  }
</style>
