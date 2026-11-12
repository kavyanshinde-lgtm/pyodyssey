const CACHE_NAME = 'pyodyssey-v1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './icon-192.png',
  './icon-512.png',
  './pyodide/pyodide.mjs',
  './pyodide/pyodide-lock.json',
  './pyodide/python_stdlib.zip',
  './pyodide/pyodide.asm.wasm',
  './pyodide/pyodide.asm.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(async (cache) => {
        const urls = PRECACHE_ASSETS.map((p) => new URL(p, self.registration.scope).href);
        await cache.addAll(urls);
      })
      .then(async () => {
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'OFFLINE_READY' });
        }
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(async () => {
        await self.clients.claim();
        const clients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'OFFLINE_READY' });
        }
      })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      if (request.mode === 'navigate') {
        return fetch(request).catch(async () => {
          const indexUrl = new URL('./index.html', self.registration.scope).href;
          return (await caches.match(indexUrl)) || caches.match(new URL('./', self.registration.scope).href);
        });
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        })
        .catch(async () => {
          const cleanUrl = url.origin + url.pathname;
          const fallback = await caches.match(cleanUrl);
          if (fallback) return fallback;
          throw new Error('Offline asset unavailable: ' + request.url);
        });
    })
  );
});
