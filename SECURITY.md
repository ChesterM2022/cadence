# Security

This document describes how Cadence protects your data, so that the claim "your data
is private" can be checked rather than taken on faith. The relevant code is in
[`src/lib/crypto.ts`](./src/lib/crypto.ts).

## Cryptographic design

Cadence uses **envelope encryption** built entirely on the browser-native
[Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
There is no third-party cryptography code.

1. **Data Encryption Key (DEK).** On setup, a random 256-bit AES-GCM key is
   generated. Every day-entry is encrypted under this single key with
   **AES-256-GCM** and a fresh 96-bit random IV per record. GCM provides both
   confidentiality and integrity (tampering is detected on decryption).

2. **Key derivation.** Two key-encryption keys (KEKs) are derived with
   **PBKDF2-HMAC-SHA256** at **600,000 iterations** (OWASP's current guidance) over
   a per-user 128-bit random salt — one KEK from your passphrase, one from your
   recovery code.

3. **Wrapping.** The DEK is encrypted ("wrapped") separately under each KEK and both
   wrapped copies are stored. Either your passphrase **or** your recovery code can
   unwrap the DEK and unlock your data. Neither secret, nor the DEK, is ever stored
   in the clear.

4. **In memory only.** Once unlocked, the DEK lives solely in the running app's
   memory and is discarded when you lock the app or close the tab.

### What's stored on disk

- Two random salts (not secret)
- Two AES-GCM-wrapped copies of the DEK (opaque without a KEK)
- Per-entry ciphertext + IV

There is no stored password, password hash, or key that can decrypt your data on its
own.

## Recovery code

The recovery code is 20 characters in five groups of four (~98 bits of entropy),
drawn from a reduced alphabet that omits visually ambiguous characters. It is shown
**once**, at setup, and is never stored anywhere by the app. It is the only backup
path if you forget your passphrase — and if both are lost, the data cannot be
recovered by anyone. That is the intended property.

## Threat model

Cadence is designed to keep cycle data private from companies and off the cloud, and
to keep it unreadable if the device or a backup is seized or copied.

**In scope:** confidentiality and integrity of stored data at rest; no data exfiltration.

**Out of scope:** a compromised or malware-infected device; an adversary who knows the
passphrase; coercion; and access to an already-unlocked app on an unlocked device.

## Known limitations (honest list)

- **Not independently audited.** The design follows standard practice, but it has not
  had a formal third-party security review. Treat it accordingly for now.
- **PBKDF2, not Argon2id.** PBKDF2 at 600k iterations is solid, but memory-hard
  Argon2id resists GPU brute-forcing better. Moving to Argon2id is on the roadmap.
- **Browser storage durability.** IndexedDB can be evicted by the OS or cleared by
  the user. Use the encrypted backup export to avoid data loss.
- **No shared-device / duress protection yet.** There is currently no separate app
  passcode or hidden mode for someone with your unlocked device.

## Reporting a vulnerability

If you find a security issue, please open a GitHub issue describing it (avoid
including anyone's real personal data in the report), or contact the maintainer
privately if the issue is sensitive. Responsible disclosure is appreciated.
