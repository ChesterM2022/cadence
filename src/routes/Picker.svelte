<script lang="ts">
  import { profiles, selectProfile, startAddProfile } from '../lib/store';
</script>

<main class="picker">
  <div class="mark">Cadence</div>
  <h1>Who's using Cadence?</h1>
  <p class="muted">Choose your profile. Each one is private and separate.</p>

  <div class="list">
    {#each $profiles as p (p.id)}
      <button class="profile" onclick={() => selectProfile(p.id)}>
        <span class="avatar">{p.name.slice(0, 1).toUpperCase() || '?'}</span>
        <span class="pname">{p.name}</span>
        {#if p.encrypted}<span class="lockicon" title="Protected with a passphrase">🔒</span>{/if}
      </button>
    {/each}
    <button class="profile add" onclick={startAddProfile}>
      <span class="avatar plus">＋</span>
      <span class="pname">Add someone</span>
    </button>
  </div>
</main>

<style>
  .picker {
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
  .list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .profile {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    padding: 0.9rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    text-align: left;
    transition: border-color 0.12s ease, transform 0.05s ease;
  }
  .profile:hover {
    border-color: var(--clay);
  }
  .profile:active {
    transform: translateY(1px);
  }
  .avatar {
    display: grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 50%;
    background: var(--clay);
    color: #fff;
    font-weight: 650;
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  .avatar.plus {
    background: var(--surface-2);
    color: var(--clay-dark);
  }
  .pname {
    flex: 1;
    font-weight: 600;
    font-size: 1.05rem;
  }
  .lockicon {
    font-size: 0.9rem;
    opacity: 0.6;
  }
  .add .pname {
    color: var(--text-muted);
    font-weight: 600;
  }
</style>
