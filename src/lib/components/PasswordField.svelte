<script lang="ts">
  let {
    value = $bindable(''),
    label,
    placeholder = '',
    autocomplete = 'new-password',
  }: {
    value?: string;
    label: string;
    placeholder?: string;
    autocomplete?: AutoFill;
  } = $props();

  let show = $state(false);
</script>

<label class="field">
  <span>{label}</span>
  <div class="wrap">
    <!-- Two inputs because Svelte can't two-way bind a dynamic `type`. The
         value is bound, so toggling preserves what's typed. -->
    {#if show}
      <input type="text" bind:value {placeholder} {autocomplete} spellcheck="false" />
    {:else}
      <input type="password" bind:value {placeholder} {autocomplete} />
    {/if}
    <button
      type="button"
      class="toggle"
      aria-pressed={show}
      aria-label={show ? 'Hide passphrase' : 'Show passphrase'}
      onclick={() => (show = !show)}
    >
      {show ? 'Hide' : 'Show'}
    </button>
  </div>
</label>

<style>
  .wrap {
    position: relative;
  }
  .wrap input {
    width: 100%;
    padding: 0.75rem 4rem 0.75rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .wrap input:focus {
    outline: 2px solid var(--clay);
    outline-offset: 1px;
  }
  .toggle {
    position: absolute;
    top: 50%;
    right: 0.4rem;
    transform: translateY(-50%);
    padding: 0.35rem 0.6rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--clay-dark);
    border-radius: 8px;
  }
  .toggle:hover {
    background: var(--clay-soft);
  }
</style>
