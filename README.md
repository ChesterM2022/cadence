# Cadence

**Understand where you are in your cycle — explained clearly, and without judgment. Your data never leaves your device.**

Cadence is a private, local-first menstrual cycle tracker. Most period apps either
talk down to you or quietly send your most personal data to the cloud. Cadence does
neither. It helps you understand your body — which of the four phases you're in and
what's actually happening hormonally — and it keeps every byte of that on your own
phone or computer, encrypted.

It's a Progressive Web App: install it from a link, use it on your phone or your
laptop, and it works fully offline. There is no account, no server, and no company —
not even the people who built it — that can see your data.

> **Not medical advice.** Cadence is an educational tool. Its estimates are
> calculated from your own logged dates and can be wrong, especially with irregular
> cycles. It is not a contraceptive method and cannot diagnose any condition.

## What makes it different

- **Phase-awareness first.** The point isn't logging for its own sake — it's
  understanding. Cadence tells you which phase you're in (menstrual, follicular,
  ovulatory, luteal) and explains the physiology plainly, with gently-hedged notes
  and no "shoulds."
- **Truly private by architecture.** Everything is encrypted at rest with a key
  derived from your passphrase. The app makes **zero network requests** once loaded —
  you can verify this yourself in your browser's Network tab.
- **Yours to keep.** Encrypted backup export/import lets you move your history
  between devices without any cloud in the middle.
- **Open and minimal.** A small, dependency-light codebase (one runtime dependency)
  so anyone can read it and trust it.

## Privacy in one paragraph

With a passphrase (recommended), your logs are encrypted with **AES-256-GCM** using a
key that only exists after you enter it. That key is never stored, and you also get a
one-time **recovery code** as a backup way in; lose both and the data is unrecoverable
by design. A passphrase is **optional** — you can run Cadence without one, in which case
data is stored unencrypted on your device (still no cloud, still no account), and you can
add a passphrase later from Settings to encrypt everything. See [PRIVACY.md](./PRIVACY.md)
and [SECURITY.md](./SECURITY.md) for the full explanation and threat model.

## How your data is stored

No cookies, no account, no server. Cadence uses three on-device browser
mechanisms and nothing else:

- **IndexedDB — your data.** Your daily logs live in your browser's own
  database, on your device's disk, as **encrypted ciphertext**. Alongside them
  is non-secret vault metadata (random salts and the wrapped keys); none of it
  is readable without your passphrase or recovery code.
- **Cache Storage — the app.** The service worker caches the app's own
  HTML/JS/CSS so it loads instantly and works offline. This is only code, never
  personal data.
- **Memory — the key.** Your decryption key is never written to disk. It's
  re-derived from your passphrase on unlock, held in memory while the app is
  open, and dropped when you lock or close it.

Storage is scoped to one origin, one browser, one device — so it does **not**
sync across devices (that's what the encrypted backup export is for), and
clearing browser data or using a private window will erase it.

## Verify the privacy claim yourself

1. Open the app, then open your browser's developer tools → **Network** tab.
2. Use the app — onboard, log a day, navigate around.
3. After the initial page and script load, you'll see **no further network requests**.
   Nothing is sent anywhere, because there's nowhere for it to be sent.

## Features

- Four-phase cycle awareness with plain-language physiology (the **Learn** tab)
- Next-period prediction with an honest confidence level and range
- A focused daily log: flow, energy, cramps, sleep, mood, and notes
- History view with your cycle statistics
- Passphrase encryption + one-time recovery code
- Encrypted backup / restore
- Change passphrase, lock on demand, and one-tap delete-everything
- Installable and fully offline (PWA)

## Tech

- [Svelte 5](https://svelte.dev/) + TypeScript, built with [Vite](https://vitejs.dev/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
  for all encryption (no third-party crypto code)
- IndexedDB (via [`idb`](https://github.com/jakearchibald/idb)) for local, encrypted storage
- A hand-written service worker for offline support
- No backend. No analytics. No external requests.

## Develop

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests (encryption + cycle math)
npm run check      # type-check
npm run build      # production build → dist/
npm run preview    # serve the production build
```

### Project structure

```
src/
  lib/
    crypto.ts        # envelope encryption (AES-GCM + PBKDF2), recovery codes
    phase.ts         # cycle stats, phase detection, prediction, period derivation
    phaseContent.ts  # the phase-education copy + medical disclaimer
    dates.ts         # timezone-safe calendar-date helpers
    db.ts            # IndexedDB storage (ciphertext only) + backup/restore
    store.ts         # app state; holds the decryption key in memory only
    types.ts         # the day-log data model
    components/      # DayLog, RecoveryCode
  routes/            # Onboarding, Lock, Main, Today, History, Learn, Settings
public/
  manifest.webmanifest
  service-worker.js  # same-origin-only offline cache
```

## Roadmap

- Formal medical accuracy + citation review of the phase content
- Argon2id key derivation (hardening beyond PBKDF2)
- Local reminders / notifications
- Symptom trends over time
- PNG icon set and richer install polish
- Accessibility and localization passes

## License

[MIT](./LICENSE). Free to use, read, fork, and learn from.
