<script lang="ts">
  import { completeOnboarding, enterApp } from '../lib/store';
  import { todayISO } from '../lib/dates';
  import RecoveryCode from '../lib/components/RecoveryCode.svelte';
  import PasswordField from '../lib/components/PasswordField.svelte';

  let step = $state(0);
  let lastPeriod = $state(todayISO());
  let cycleLength = $state(28);
  let passphrase = $state('');
  let confirm = $state('');
  let busy = $state(false);
  let error = $state('');
  let recoveryCode = $state('');
  let savedCode = $state(false);

  const passphraseValid = $derived(passphrase.length >= 8 && passphrase === confirm);

  async function create() {
    error = '';
    if (!passphraseValid) {
      error = 'Passphrases must match and be at least 8 characters.';
      return;
    }
    busy = true;
    try {
      recoveryCode = await completeOnboarding({
        lastPeriodStart: lastPeriod,
        cycleLength,
        passphrase,
      });
      step = 3;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Something went wrong.';
    } finally {
      busy = false;
    }
  }
</script>

<main class="onboarding">
  {#if step === 0}
    <div class="hero">
      <div class="mark">Cadence</div>
      <h1>Understand your cycle.</h1>
      <p class="lead">
        A calm, judgment-free way to see where you are in your cycle and what's happening in your
        body — explained clearly, like a scientist would.
      </p>
      <div class="promise card">
        <strong>Your data never leaves this device.</strong>
        <p class="small muted">
          Everything you log stays on your phone or computer, encrypted. There is no account, no
          cloud, and no company — not even us — that can see it.
        </p>
      </div>
      <button class="btn" onclick={() => (step = 1)}>Get started</button>
    </div>
  {:else if step === 1}
    <div class="step">
      <h2>A little about your cycle</h2>
      <p class="muted small">This gives Cadence a starting point. It refines itself as you log.</p>
      <label class="field">
        <span>When did your last period start?</span>
        <input type="date" bind:value={lastPeriod} max={todayISO()} />
      </label>
      <label class="field">
        <span>Roughly how long is your cycle? (first day to first day)</span>
        <input type="number" bind:value={cycleLength} min="20" max="45" />
        <span class="small muted">Not sure? 28 days is a common average — you can leave it.</span>
      </label>
      <button class="btn" onclick={() => (step = 2)}>Continue</button>
    </div>
  {:else if step === 2}
    <div class="step">
      <h2>Set a passphrase</h2>
      <p class="muted small">
        This encrypts your data. Choose something memorable — a few words is stronger than one odd
        word. Because nothing is stored in the cloud, <strong>it cannot be reset</strong>. We'll give
        you a one-time recovery code next as a backup.
      </p>
      <PasswordField bind:value={passphrase} label="Passphrase" placeholder="at least 8 characters" />
      <PasswordField bind:value={confirm} label="Confirm passphrase" />
      {#if error}<p class="error">{error}</p>{/if}
      <button class="btn" onclick={create} disabled={busy || !passphraseValid}>
        {busy ? 'Creating your private space…' : 'Continue'}
      </button>
    </div>
  {:else if step === 3}
    <div class="step">
      <h2>Save your recovery code</h2>
      <p class="muted small">
        Write this down and keep it somewhere safe. It's the only way back in if you forget your
        passphrase. We can't recover it for you — that's what keeps your data truly private.
      </p>
      <RecoveryCode code={recoveryCode} />
      <label class="ack">
        <input type="checkbox" bind:checked={savedCode} />
        <span>I've written down my recovery code and stored it somewhere safe.</span>
      </label>
      <button class="btn" onclick={enterApp} disabled={!savedCode}>Enter Cadence</button>
    </div>
  {/if}
</main>

<style>
  .onboarding {
    flex: 1;
    padding: 1.5rem 1.25rem 2rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .mark {
    font-weight: 650;
    color: var(--clay);
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: 1.9rem;
  }
  .lead {
    font-size: 1.05rem;
    color: var(--text-muted);
  }
  .promise {
    margin: 1.25rem 0 1.75rem;
  }
  .promise strong {
    color: var(--clay-dark);
  }
  .promise p {
    margin: 0.4rem 0 0;
  }
  .ack {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    margin: 1.25rem 0;
    font-size: 0.9rem;
  }
  .ack input {
    margin-top: 0.2rem;
  }
</style>
