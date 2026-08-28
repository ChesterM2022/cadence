<script lang="ts">
  import {
    exportBackup,
    importBackup,
    changeVaultPassphrase,
    addPassphrase,
    removePassphrase,
    deleteEverything,
    lock,
    encryptedMode,
  } from '../lib/store';
  import { todayISO } from '../lib/dates';
  import { MEDICAL_DISCLAIMER } from '../lib/phaseContent';
  import PasswordField from '../lib/components/PasswordField.svelte';
  import RecoveryCode from '../lib/components/RecoveryCode.svelte';

  let msg = $state('');
  let showChangePass = $state(false);
  let showAddPass = $state(false);
  let newPass = $state('');
  let confirmPass = $state('');
  let passErr = $state('');
  let addRecovery = $state('');
  let addSaved = $state(false);
  let confirmingRemove = $state(false);
  let confirmingDelete = $state(false);

  function flash(text: string) {
    msg = text;
    setTimeout(() => (msg = ''), 3000);
  }

  async function doExport() {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadence-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash($encryptedMode ? 'Encrypted backup downloaded.' : 'Backup downloaded.');
  }

  async function onImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      await importBackup(backup);
      // importBackup locks the app; the Lock screen will take over.
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Could not read that backup file.');
    } finally {
      input.value = '';
    }
  }

  async function saveNewPass() {
    passErr = '';
    if (newPass.length < 8 || newPass !== confirmPass) {
      passErr = 'Passphrases must match and be at least 8 characters.';
      return;
    }
    await changeVaultPassphrase(newPass);
    newPass = confirmPass = '';
    showChangePass = false;
    flash('Passphrase changed. Your recovery code is unchanged.');
  }

  async function saveAddPass() {
    passErr = '';
    if (newPass.length < 8 || newPass !== confirmPass) {
      passErr = 'Passphrases must match and be at least 8 characters.';
      return;
    }
    addRecovery = await addPassphrase(newPass);
    newPass = confirmPass = '';
    showAddPass = false;
  }

  function finishAdd() {
    addRecovery = '';
    addSaved = false;
    flash('Passphrase added. Your data is now encrypted.');
  }

  async function doRemovePassphrase() {
    await removePassphrase();
    confirmingRemove = false;
    showChangePass = false;
    flash('Passphrase removed. Your data is no longer encrypted.');
  }

  async function confirmDelete() {
    await deleteEverything();
  }
</script>

<section>
  <h1 class="title">Settings</h1>
  {#if msg}<div class="flash">{msg}</div>{/if}

  <div class="card block">
    <h2>Backup</h2>
    <p class="small muted">
      Your data lives only in this browser. Save a backup file to keep it safe or move it to another
      device.
      {#if $encryptedMode}
        The file is encrypted — useless without your passphrase or recovery code.
      {:else}
        Heads up: without a passphrase, this backup file is <strong>not encrypted</strong>.
      {/if}
    </p>
    <button class="btn" onclick={doExport}>
      {$encryptedMode ? 'Download encrypted backup' : 'Download backup'}
    </button>
    <label class="btn btn-quiet importbtn">
      Restore from a backup file
      <input type="file" accept="application/json,.json" onchange={onImportFile} hidden />
    </label>
  </div>

  <div class="card block">
    <h2>How your data is stored</h2>
    <p class="small muted">
      Everything you log stays in this browser, on this device. There's no account and no server —
      nothing is ever sent anywhere.
    </p>
    <ul class="how small">
      {#if $encryptedMode}
        <li>Your entries are saved in your browser's own storage, <strong>encrypted</strong>. Only your passphrase or recovery code can unlock them.</li>
      {:else}
        <li>Your entries are saved in your browser's own storage, <strong>unencrypted</strong>. Add a passphrase (under Security) to encrypt them.</li>
      {/if}
      <li><strong>No cookies, no tracking, no cloud.</strong> The app can't even reach the internet once it's loaded.</li>
      <li>Because it lives in this one browser on this one device, it doesn't sync automatically. Use <strong>Backup</strong> above to keep a copy or move it to another device.</li>
      <li>Clearing your browser's data — or using a private window — will erase it, so keep a backup somewhere safe.</li>
    </ul>
  </div>

  <div class="card block">
    <h2>Security</h2>
    {#if addRecovery}
      <!-- Shown once right after adding a passphrase — takes priority over the
           mode split below, since the mode has just flipped to encrypted. -->
      <p class="small muted">
        Done — your data is now encrypted. Save this recovery code somewhere safe; it's the only
        other way in if you forget your passphrase.
      </p>
      <RecoveryCode code={addRecovery} />
      <label class="ack">
        <input type="checkbox" bind:checked={addSaved} />
        <span>I've saved my recovery code.</span>
      </label>
      <button class="btn" onclick={finishAdd} disabled={!addSaved}>Done</button>
    {:else if $encryptedMode}
      {#if !showChangePass}
        <button class="btn btn-quiet" onclick={() => (showChangePass = true)}>Change passphrase</button>
      {:else}
        <PasswordField bind:value={newPass} label="New passphrase" />
        <PasswordField bind:value={confirmPass} label="Confirm new passphrase" />
        {#if passErr}<p class="error">{passErr}</p>{/if}
        <div class="row">
          <button class="btn" onclick={saveNewPass}>Save</button>
          <button class="btn btn-quiet" onclick={() => (showChangePass = false)}>Cancel</button>
        </div>
      {/if}
      <button class="btn btn-ghost lockbtn" onclick={lock}>Lock now</button>
      {#if confirmingRemove}
        <div class="removebox">
          <p class="small">
            <strong>Remove your passphrase?</strong> Your data will be decrypted and stored
            <strong>unencrypted</strong> on this device. You can add one again anytime.
          </p>
          <div class="row">
            <button class="btn del" onclick={doRemovePassphrase}>Remove passphrase</button>
            <button class="btn btn-quiet" onclick={() => (confirmingRemove = false)}>Keep it</button>
          </div>
        </div>
      {:else}
        <button class="btn-ghost small removebtn" onclick={() => (confirmingRemove = true)}>
          Remove passphrase
        </button>
      {/if}
    {:else if showAddPass}
      <p class="small muted">
        A passphrase encrypts everything you've logged. Because there's no cloud it can't be reset —
        you'll get a one-time recovery code as a backup.
      </p>
      <PasswordField bind:value={newPass} label="Passphrase" placeholder="at least 8 characters" />
      <PasswordField bind:value={confirmPass} label="Confirm passphrase" />
      {#if passErr}<p class="error">{passErr}</p>{/if}
      <div class="row">
        <button class="btn" onclick={saveAddPass}>Add passphrase</button>
        <button class="btn btn-quiet" onclick={() => { showAddPass = false; newPass = confirmPass = ''; passErr = ''; }}>Cancel</button>
      </div>
    {:else}
      <p class="small muted">Your data isn't encrypted on this device. Add a passphrase to protect it.</p>
      <button class="btn" onclick={() => (showAddPass = true)}>Add a passphrase</button>
    {/if}
  </div>

  <div class="card block danger">
    <h2>Delete everything</h2>
    <p class="small muted">
      Permanently erases all your data from this device. This cannot be undone, and without a backup
      it cannot be recovered.
    </p>
    {#if !confirmingDelete}
      <button class="btn del" onclick={() => (confirmingDelete = true)}>Delete all my data</button>
    {:else}
      <p class="small"><strong>Are you sure? This is permanent.</strong></p>
      <div class="row">
        <button class="btn del" onclick={confirmDelete}>Yes, delete everything</button>
        <button class="btn btn-quiet" onclick={() => (confirmingDelete = false)}>Keep my data</button>
      </div>
    {/if}
  </div>

  <p class="disclaimer small muted">{MEDICAL_DISCLAIMER}</p>

  <div class="about small muted">
    <p>Cadence v0.1 · local-first · open source</p>
    <p>Updates arrive automatically — just reopen the app to get the latest.</p>
    <p>
      <a href="https://github.com/ChesterM2022/cadence" target="_blank" rel="noopener noreferrer">
        View the code on GitHub →
      </a>
    </p>
  </div>
</section>

<style>
  .title {
    font-size: 1.5rem;
  }
  .block {
    margin-bottom: 1rem;
  }
  .block h2 {
    font-size: 1.05rem;
  }
  .how {
    margin: 0.5rem 0 0;
    padding-left: 1.1rem;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .how li {
    margin-bottom: 0.5rem;
  }
  .how strong {
    color: var(--text);
  }
  .block .btn {
    margin-top: 0.5rem;
  }
  .importbtn {
    cursor: pointer;
  }
  .ack {
    display: flex;
    gap: 0.6rem;
    align-items: flex-start;
    margin: 0.9rem 0;
    font-size: 0.9rem;
  }
  .ack input {
    margin-top: 0.2rem;
  }
  .row {
    display: flex;
    gap: 0.6rem;
  }
  .row .btn {
    width: auto;
    flex: 1;
  }
  .lockbtn {
    margin: 0.75rem auto 0;
    display: block;
  }
  .removebtn {
    display: block;
    margin: 0.5rem auto 0;
    color: var(--text-muted);
  }
  .removebox {
    margin-top: 0.75rem;
  }
  .danger {
    border-color: #e6c4b8;
  }
  .del {
    background: var(--menstrual);
  }
  .del:hover {
    background: #a2412f;
  }
  .disclaimer {
    margin-top: 1.5rem;
  }
  .about {
    text-align: center;
    margin-top: 1rem;
    line-height: 1.6;
  }
  .about p {
    margin: 0.15rem 0;
  }
  .about a {
    color: var(--clay-dark);
    font-weight: 600;
    text-decoration: none;
  }
  .about a:hover {
    text-decoration: underline;
  }
</style>
