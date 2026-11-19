// Lumi Edits Clone — Service Worker
// Keep the PWA shell and the browser editing engine available offline.
const CACHE_NAME = 'lumi-v2';
const ASSETS = [
  '/app/index.html',
  '/app/styles.css',
  '/app/app.js',
  '/app/editor.js',
  '/app/manifest.webmanifest',
  '/app/icon-192.svg',
  '/app/icon-512.svg',
  '/app/placeholder.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API: GETs are network-first with cached fallback; writes always go to network.
  if (url.pathname.startsWith('/api/')) {
    if (request.method !== 'GET') return;
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell and static assets: cache-first, versioned by CACHE_NAME.
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      if (res.ok && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone)).catch(() => {});
      }
      return res;
    }))
  );
});
