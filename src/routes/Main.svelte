<script lang="ts">
  import Today from './Today.svelte';
  import Learn from './Learn.svelte';
  import History from './History.svelte';
  import Settings from './Settings.svelte';
  import { activeTab, type Tab } from '../lib/store';

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'today', label: 'Today', icon: '◉' },
    { id: 'history', label: 'History', icon: '☰' },
    { id: 'learn', label: 'Learn', icon: '✦' },
    { id: 'settings', label: 'Settings', icon: '⚙' },
  ];
</script>

<div class="main">
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
