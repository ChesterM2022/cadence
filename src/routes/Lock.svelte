<script lang="ts">
  import { unlockWithPass, unlockWithCode } from '../lib/store';

  let mode = $state<'passphrase' | 'recovery'>('passphrase');
  let value = $state('');
  let busy = $state(false);
  let error = $state('');

  async function unlock() {
    error = '';
    busy = true;
    try {
      if (mode === 'passphrase') await unlockWithPass(value);
      else await unlockWithCode(value);
    } catch (e) {
      error =
        e instanceof Error && e.name === 'WrongSecretError'
          ? mode === 'passphrase'
            ? 'That passphrase doesn’t match.'
            : 'That recovery code doesn’t match.'
          : 'Could not unlock.';
    } finally {
      busy = false;
    }
  }
</script>

<main class="lock">
  <div class="mark">Cadence</div>
  <h1>Welcome back</h1>
  <p class="muted">Your data is locked on this device. Enter your {mode === 'passphrase' ? 'passphrase' : 'recovery code'} to open it.</p>

  <form onsubmit={(e) => { e.preventDefault(); void unlock(); }}>
    <label class="field">
      <span>{mode === 'passphrase' ? 'Passphrase' : 'Recovery code'}</span>
      {#if mode === 'passphrase'}
        <input type="password" bind:value autocomplete="current-password" placeholder="your passphrase" />
      {:else}
        <input type="text" bind:value autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" />
      {/if}
    </label>
    {#if error}<p class="error">{error}</p>{/if}
    <button class="btn" type="submit" disabled={busy || !value}>{busy ? 'Unlocking…' : 'Unlock'}</button>
  </form>

  <button
    class="btn-ghost small switch"
    onclick={() => { mode = mode === 'passphrase' ? 'recovery' : 'passphrase'; value = ''; error = ''; }}
  >
    {mode === 'passphrase' ? 'Use my recovery code instead' : 'Use my passphrase instead'}
  </button>
</main>

<style>
  .lock {
    flex: 1;
    padding: 2rem 1.25rem;
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
    font-size: 1.6rem;
  }
  .switch {
    margin: 1rem auto 0;
  }
</style>
