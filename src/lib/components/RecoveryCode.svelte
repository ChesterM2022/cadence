<script lang="ts">
  let { code }: { code: string } = $props();
  let copied = $state(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      /* clipboard may be unavailable; the code is shown on screen regardless */
    }
  }
</script>

<div class="code-box">
  <code>{code}</code>
  <button class="btn-ghost small" onclick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
</div>

<style>
  .code-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    background: var(--surface-2);
    border: 1px dashed var(--clay);
    border-radius: var(--radius-sm);
    padding: 1rem 1.1rem;
    margin: 1rem 0;
  }
  code {
    font-family: ui-monospace, 'SF Mono', 'Cascadia Code', monospace;
    font-size: 1.05rem;
    letter-spacing: 0.04em;
    color: var(--text);
    word-break: break-all;
  }
</style>
