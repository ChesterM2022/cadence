<script lang="ts">
  import Today from './Today.svelte';
  import Learn from './Learn.svelte';
  import History from './History.svelte';
  import Settings from './Settings.svelte';
  import { activeTab, type Tab } from '../lib/store';
  import { showWhatsNew, markSeen } from '../lib/updates';

  function openWhatsNew() {
    activeTab.set('settings');
    markSeen();
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'today', label: 'Today', icon: '◉' },
    { id: 'history', label: 'History', icon: '☰' },
    { id: 'learn', label: 'Learn', icon: '✦' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];
</script>

<div class="main">
  {#if $showWhatsNew}
    <div class="whatsnew">
      <button class="wn-link" onclick={openWhatsNew}>✨ Cadence updated — see what's new</button>
      <button class="wn-close" aria-label="Dismiss" onclick={markSeen}>×</button>
    </div>
  {/if}
  <div class="content">
    {#if $activeTab === 'today'}
      <Today />
    {:else if $activeTab === 'history'}
      <History />
    {:else if $activeTab === 'learn'}
      <Learn />
    {:else}
      <Settings />
    {/if}
  </div>

  <nav class="tabbar">
    {#each tabs as t (t.id)}
      <button class="tab" aria-current={$activeTab === t.id} onclick={() => activeTab.set(t.id)}>
        <span class="icon">{t.icon}</span>
        <span class="label">{t.label}</span>
      </button>
    {/each}
  </nav>
</div>

<style>
  .main {
    /* Pin the shell to the viewport so only .content scrolls and the tab bar
       stays visible at any scroll position (not just at the bottom). */
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .content {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem 1.1rem 1.5rem;
  }
  .whatsnew {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--clay-soft);
    border-bottom: 1px solid var(--border);
    padding: 0.55rem 0.9rem;
    flex-shrink: 0;
  }
  .wn-link {
    flex: 1;
    text-align: left;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--clay-dark);
  }
  .wn-close {
    font-size: 1.3rem;
    line-height: 1;
    color: var(--text-muted);
    padding: 0 0.3rem;
  }
  .tabbar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid var(--border);
    background: var(--surface);
    padding-bottom: env(safe-area-inset-bottom, 0);
    flex-shrink: 0;
  }
  .tab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    padding: 0.6rem 0.25rem 0.7rem;
    color: var(--text-muted);
    font-size: 0.72rem;
  }
  .tab[aria-current='true'] {
    color: var(--clay-dark);
  }
  .icon {
    font-size: 1.15rem;
    line-height: 1;
  }
</style>
