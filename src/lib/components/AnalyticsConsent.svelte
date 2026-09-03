<script lang="ts">
  import { analyticsConsent, setAnalyticsConsent } from '../analytics';
</script>

{#if $analyticsConsent === null}
  <aside class="analytics-prompt" aria-label="Analytics choice">
    <p>
      <strong>Help improve Cadence?</strong><br />
      Allow anonymous page-view analytics. Your cycle data, symptoms, notes, and profile never leave
      this device.
    </p>
    <div class="actions">
      <button class="btn btn-quiet" onclick={() => setAnalyticsConsent('denied')}>No thanks</button>
      <button class="btn" onclick={() => setAnalyticsConsent('granted')}>Allow</button>
    </div>
  </aside>
{/if}

<style>
  .analytics-prompt {
    position: fixed;
    z-index: 20;
    right: max(1rem, env(safe-area-inset-right));
    bottom: max(1rem, env(safe-area-inset-bottom));
    left: max(1rem, env(safe-area-inset-left));
    max-width: 28rem;
    margin: 0 auto;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: 0 8px 32px rgba(80, 50, 35, 0.18);
  }
  p {
    margin: 0 0 0.8rem;
    font-size: 0.85rem;
  }
  .actions {
    display: flex;
    gap: 0.6rem;
  }
  .actions .btn {
    flex: 1;
    padding: 0.65rem 0.8rem;
    font-size: 0.9rem;
  }
</style>

