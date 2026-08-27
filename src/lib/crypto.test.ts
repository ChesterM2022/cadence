import { describe, it, expect } from 'vitest';
import {
  createVault,
  unlockWithPassphrase,
  unlockWithRecoveryCode,
  changePassphrase,
  encryptJSON,
  decryptJSON,
  generateRecoveryCode,
  normalizeRecoveryCode,
  WrongSecretError,
} from './crypto';

describe('recovery codes', () => {
  it('generates 5 groups of 4 with ~98 bits of entropy and no ambiguous chars', () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(code).not.toMatch(/[ILOU01]/);
  });

  it('normalizes user input (case, spaces, dashes)', () => {
    expect(normalizeRecoveryCode('k7qf 2m9x-abcd')).toBe('K7QF2M9XABCD');
  });

  it('produces distinct codes', () => {
    expect(generateRecoveryCode()).not.toBe(generateRecoveryCode());
  });
});

describe('vault: passphrase and recovery code both unlock the same data', () => {
  it('unlocks with the passphrase and round-trips a record', async () => {
    const { meta } = await createVault('correct horse battery staple');
    const dek = await unlockWithPassphrase(meta, 'correct horse battery staple');
    const blob = await encryptJSON(dek, { flow: 'medium', mood: 'calm' });
    expect(await decryptJSON(dek, blob)).toEqual({ flow: 'medium', mood: 'calm' });
  });

  it('unlocks with the recovery code and decrypts data written under the passphrase', async () => {
    const { meta, recoveryCode } = await createVault('my passphrase');
    const dekPass = await unlockWithPassphrase(meta, 'my passphrase');
    const blob = await encryptJSON(dekPass, ['period-day-1']);
    const dekRec = await unlockWithRecoveryCode(meta, recoveryCode);
    expect(await decryptJSON(dekRec, blob)).toEqual(['period-day-1']);
  });

  it('accepts a recovery code typed back without its dashes', async () => {
    const { meta, recoveryCode } = await createVault('pw');
    const dek = await unlockWithRecoveryCode(meta, recoveryCode.replace(/-/g, '').toLowerCase());
    expect(dek).toBeDefined();
  });
});

describe('vault: wrong secrets are rejected', () => {
  it('throws WrongSecretError on a bad passphrase', async () => {
    const { meta } = await createVault('right');
    await expect(unlockWithPassphrase(meta, 'wrong')).rejects.toBeInstanceOf(WrongSecretError);
  });

  it('throws WrongSecretError on a bad recovery code', async () => {
    const { meta } = await createVault('pw');
    await expect(unlockWithRecoveryCode(meta, 'ZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZ')).rejects.toBeInstanceOf(
      WrongSecretError,
    );
  });

  it('fails to decrypt a tampered ciphertext (GCM integrity)', async () => {
    const { meta } = await createVault('pw');
    const dek = await unlockWithPassphrase(meta, 'pw');
    const blob = await encryptJSON(dek, { secret: true });
    const tampered = { ...blob, ct: blob.ct.slice(0, -2) + (blob.ct.endsWith('A') ? 'B' : 'A') + '=' };
    await expect(decryptJSON(dek, tampered)).rejects.toBeInstanceOf(WrongSecretError);
  });
});

describe('changing the passphrase keeps data readable', () => {
  it('re-wraps the DEK so old data decrypts under the new passphrase', async () => {
    const { meta, dek } = await createVault('old-pass');
    const blob = await encryptJSON(dek, { note: 'hello' });
    const newMeta = await changePassphrase(meta, dek, 'new-pass');

    await expect(unlockWithPassphrase(newMeta, 'old-pass')).rejects.toBeInstanceOf(WrongSecretError);
    const dek2 = await unlockWithPassphrase(newMeta, 'new-pass');
    expect(await decryptJSON(dek2, blob)).toEqual({ note: 'hello' });
  });

  it('leaves the recovery code still working after a passphrase change', async () => {
    const { meta, dek, recoveryCode } = await createVault('old-pass');
    const newMeta = await changePassphrase(meta, dek, 'new-pass');
    const dekRec = await unlockWithRecoveryCode(newMeta, recoveryCode);
    expect(dekRec).toBeDefined();
  });
});
