<script lang="ts">
  import { onMount } from 'svelte';
  import { screen, init } from './lib/store';
  import { initUpdates } from './lib/updates';
  import Onboarding from './routes/Onboarding.svelte';
  import Picker from './routes/Picker.svelte';
  import Lock from './routes/Lock.svelte';
  import Main from './routes/Main.svelte';

  onMount(() => {
    void init();
    initUpdates();
  });
</script>

{#if $screen === 'loading'}
  <div class="splash">
    <div class="mark">Cadence</div>
  </div>
{:else if $screen === 'onboarding'}
  <Onboarding />
{:else if $screen === 'picker'}
  <Picker />
{:else if $screen === 'locked'}
  <Lock />
{:else}
  <Main />
{/if}

<style>
  .splash {
    flex: 1;
    display: grid;
    place-items: center;
  }
  .mark {
    font-size: 1.5rem;
    font-weight: 650;
    color: var(--clay);
    letter-spacing: -0.02em;
  }
</style>
