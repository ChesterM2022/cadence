<script lang="ts">
  import {
    exportBackup,
    importBackup,
    changeVaultPassphrase,
    deleteEverything,
    lock,
  } from '../lib/store';
  import { todayISO } from '../lib/dates';
  import { MEDICAL_DISCLAIMER } from '../lib/phaseContent';
  import PasswordField from '../lib/components/PasswordField.svelte';

  let msg = $state('');
  let showChangePass = $state(false);
  let newPass = $state('');
  let confirmPass = $state('');
  let passErr = $state('');
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
    flash('Encrypted backup downloaded.');
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
      Your data lives only in this browser. Save an encrypted backup file to keep it safe or move it
      to another device. The file is useless without your passphrase or recovery code.
    </p>
    <button class="btn" onclick={doExport}>Download encrypted backup</button>
    <label class="btn btn-quiet importbtn">
      Restore from a backup file
      <input type="file" accept="application/json,.json" onchange={onImportFile} hidden />
    </label>
  </div>

  <div class="card block">
    <h2>Security</h2>
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
  <p class="ver small muted">Cadence · local-first · open source</p>
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
  .block .btn {
    margin-top: 0.5rem;
  }
  .importbtn {
    cursor: pointer;
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
  .ver {
    text-align: center;
    margin-top: 0.5rem;
  }
</style>
