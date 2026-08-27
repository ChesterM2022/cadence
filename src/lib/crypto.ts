/**
 * Cadence encryption core.
 *
 * Everything a woman logs is encrypted at rest with AES-256-GCM. The design is
 * "envelope encryption": a single random Data Encryption Key (DEK) protects all
 * records, and that DEK is itself wrapped twice — once under a key derived from
 * her passphrase, once under a key derived from a one-time recovery code. Either
 * secret can unlock the data; neither secret is ever stored.
 *
 * If both are lost, the data is unrecoverable by design — there is no backend,
 * no escrow, and no reset. That is the point: seized or copied, the stored bytes
 * are meaningless without a secret that lives only in the user's head or on the
 * paper she wrote her recovery code on.
 *
 * Uses only the browser-native Web Crypto API — no third-party crypto code to
 * audit or trust.
 */

// PBKDF2 work factor. OWASP's 2023 guidance for PBKDF2-HMAC-SHA256 is >= 600,000
// iterations; we use that. Bump this (with a version migration) as hardware
// improves. A future hardening step is switching the KDF to Argon2id.
const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const VAULT_VERSION = 1;

const subtle = globalThis.crypto.subtle;

/** A random-IV AES-GCM ciphertext, both fields base64-encoded. */
export interface EncBlob {
  iv: string;
  ct: string;
}

/** Public vault metadata. Contains no secrets — safe to store in plaintext. */
export interface VaultMeta {
  version: number;
  passSalt: string;
  recSalt: string;
  passWrap: EncBlob; // DEK wrapped under the passphrase-derived key
  recWrap: EncBlob; // DEK wrapped under the recovery-code-derived key
}

export class WrongSecretError extends Error {
  constructor() {
    super('The passphrase or recovery code is incorrect.');
    this.name = 'WrongSecretError';
  }
}

// ---- byte / base64 helpers -------------------------------------------------

export function randomBytes(n: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

/**
 * Normalize any Uint8Array to one backed by a plain ArrayBuffer. TypeScript's
 * Web Crypto types require `BufferSource` (ArrayBuffer-backed); views over
 * `ArrayBufferLike` (the default) are rejected. This copies into a fresh buffer.
 */
function ab(u: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(u.byteLength);
  out.set(u);
  return out;
}

export function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

// ---- key derivation & DEK wrapping ----------------------------------------

/** Derive a 256-bit AES-GCM key-encryption key from a secret string + salt. */
async function deriveKEK(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await subtle.importKey(
    'raw',
    ab(enc.encode(secret.normalize('NFKC'))),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: ab(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function wrapDEK(kek: CryptoKey, dek: CryptoKey): Promise<EncBlob> {
  const raw = new Uint8Array(await subtle.exportKey('raw', dek));
  const iv = randomBytes(IV_BYTES);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: ab(iv) }, kek, ab(raw)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

async function unwrapDEK(kek: CryptoKey, wrap: EncBlob): Promise<CryptoKey> {
  let raw: ArrayBuffer;
  try {
    raw = await subtle.decrypt(
      { name: 'AES-GCM', iv: ab(fromB64(wrap.iv)) },
      kek,
      ab(fromB64(wrap.ct)),
    );
  } catch {
    // AES-GCM authentication failed → the derived key was wrong → bad secret.
    throw new WrongSecretError();
  }
  return subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);
}

// ---- recovery code ---------------------------------------------------------

// Crockford-style base32 without ambiguous characters (no I, L, O, U, 0, 1).
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * A 20-character recovery code in five groups of four (~98 bits of entropy),
 * e.g. "K7QF-2M9X-..." — enough to make brute force infeasible while staying
 * writable on paper. Shown to the user exactly once.
 */
export function generateRecoveryCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < 5; g++) {
    let group = '';
    const r = randomBytes(4);
    for (let i = 0; i < 4; i++) group += RECOVERY_ALPHABET[r[i] % RECOVERY_ALPHABET.length];
    groups.push(group);
  }
  return groups.join('-');
}

/** Normalize user-entered codes: uppercase, strip spaces/dashes. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

// ---- vault lifecycle -------------------------------------------------------

export interface NewVault {
  meta: VaultMeta;
  recoveryCode: string;
  dek: CryptoKey;
}

/** Create a fresh vault protected by a passphrase, returning the one-time code. */
export async function createVault(passphrase: string): Promise<NewVault> {
  const dek = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const recoveryCode = generateRecoveryCode();
  const passSalt = randomBytes(SALT_BYTES);
  const recSalt = randomBytes(SALT_BYTES);
  const passKEK = await deriveKEK(passphrase, passSalt);
  const recKEK = await deriveKEK(normalizeRecoveryCode(recoveryCode), recSalt);
  const meta: VaultMeta = {
    version: VAULT_VERSION,
    passSalt: toB64(passSalt),
    recSalt: toB64(recSalt),
    passWrap: await wrapDEK(passKEK, dek),
    recWrap: await wrapDEK(recKEK, dek),
  };
  return { meta, recoveryCode, dek };
}

export async function unlockWithPassphrase(
  meta: VaultMeta,
  passphrase: string,
): Promise<CryptoKey> {
  const kek = await deriveKEK(passphrase, fromB64(meta.passSalt));
  return unwrapDEK(kek, meta.passWrap);
}

export async function unlockWithRecoveryCode(
  meta: VaultMeta,
  code: string,
): Promise<CryptoKey> {
  const kek = await deriveKEK(normalizeRecoveryCode(code), fromB64(meta.recSalt));
  return unwrapDEK(kek, meta.recWrap);
}

/** Re-wrap the existing DEK under a new passphrase (keeps all data intact). */
export async function changePassphrase(
  meta: VaultMeta,
  dek: CryptoKey,
  newPassphrase: string,
): Promise<VaultMeta> {
  const passSalt = randomBytes(SALT_BYTES);
  const passKEK = await deriveKEK(newPassphrase, passSalt);
  return { ...meta, passSalt: toB64(passSalt), passWrap: await wrapDEK(passKEK, dek) };
}

// ---- record encryption -----------------------------------------------------

export async function encryptJSON(dek: CryptoKey, value: unknown): Promise<EncBlob> {
  const iv = randomBytes(IV_BYTES);
  const data = enc.encode(JSON.stringify(value));
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: ab(iv) }, dek, ab(data)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJSON<T = unknown>(dek: CryptoKey, blob: EncBlob): Promise<T> {
  let plain: ArrayBuffer;
  try {
    plain = await subtle.decrypt(
      { name: 'AES-GCM', iv: ab(fromB64(blob.iv)) },
      dek,
      ab(fromB64(blob.ct)),
    );
  } catch {
    throw new WrongSecretError();
  }
  return JSON.parse(dec.decode(plain)) as T;
}
