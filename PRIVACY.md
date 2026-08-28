# Privacy

Cadence is built so that your cycle data is yours alone. This document explains, in
plain language, exactly what that means.

## The short version

- Everything you log stays on the device you logged it on.
- It is encrypted at rest with a key derived from your passphrase.
- The app makes **no network requests** after it loads. There is no server to send
  data to, no account, and no analytics.
- Nobody — not the people who built Cadence, not a hosting provider, not us — can
  read your data. There is no back door, because there is no back end.

## What is stored, and where

All data lives in your browser's local storage (IndexedDB) on your device:

- **Your daily logs** (period flow, energy, cramps, sleep, mood, notes). With a
  passphrase set (recommended), these are stored only as **encrypted ciphertext**.
  A passphrase is optional; without one, entries are stored in the clear on your
  device (you can add a passphrase later to encrypt them). Either way, the calendar
  date of each entry is kept unencrypted so the app can find days quickly.
- **Vault metadata** — the random salts and the wrapped copies of your encryption
  key. These contain no secrets and reveal nothing without your passphrase or
  recovery code.
- **A small settings record** (your typical cycle length).

That's the whole footprint. If you clear your browser's data for the site, or use
"delete everything" in Settings, it's gone.

## What leaves your device

Nothing. Cadence never transmits your data anywhere. The only network activity ever
is the one-time download of the app's own code when you first open or install it —
the same as loading any web page. After that, you can turn off your network entirely
and the app keeps working.

You can confirm this: open your browser's developer tools, go to the Network tab, and
use the app. You will see no requests being made as you log or browse your data.

## Backups are your choice

Cadence can export an **encrypted backup file** so you don't lose your history if your
browser data is cleared or you switch devices. That file is encrypted with the same
key as your live data — it's useless to anyone without your passphrase or recovery
code. Where you keep it is up to you; Cadence never uploads it anywhere.

## Threat model — what this does and doesn't protect against

**Protects against:**

- Companies collecting, profiling, or selling your reproductive health data — there
  is no company in the loop.
- Your data being readable if your device or a backup file is seized or copied,
  as long as your passphrase is strong and unknown to the other party.

**Does not fully protect against:**

- Someone who knows or can guess your passphrase.
- Malware or a compromised device that can read your screen or memory while the app
  is unlocked.
- Someone with access to your unlocked device and open app. (An app-passcode / hidden
  mode for shared-device situations is a possible future addition, not a current
  feature.)

Security is never absolute. Cadence's goal is to make your cycle data genuinely
private in the ordinary sense — off the cloud, encrypted on your device, and out of
reach of anyone who can't unlock it.

See [SECURITY.md](./SECURITY.md) for the technical details of the encryption.
