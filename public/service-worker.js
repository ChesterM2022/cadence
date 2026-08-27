/*
 * Cadence offline service worker.
 *
 * Privacy-critical property: this worker ONLY ever touches same-origin GET
 * requests. It never contacts any other host — there are none to contact. It
 * exists purely to make the app work with the network off, which is also the
 * strongest privacy guarantee: once installed, Cadence cannot phone home.
 *
 * Strategy:
 *   - navigations (the HTML document): network-first, fall back to cache, so a
 *     new deploy is picked up when online but the app still opens offline.
 *   - other same-origin GETs (hashed JS/CSS/assets): cache-first, since their
 *     URLs change on every build.
 */

const CACHE = 'cadence-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never handle cross-origin

  const isNavigation = req.mode === 'navigate';

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      if (isNavigation) {
        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = (await cache.match(req)) || (await cache.match('/index.html')) || (await cache.match('/'));
          if (cached) return cached;
          throw new Error('offline and no cached document');
        }
      }

      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    })(),
  );
});
