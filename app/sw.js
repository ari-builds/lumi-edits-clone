// Lumi Edits Clone — Service Worker (basic PWA)
const CACHE_NAME = 'lumi-v1';
const ASSETS = [
  '/app/index.html',
  '/app/styles.css',
  '/app/app.js',
  '/app/manifest.webmanifest',
  '/app/icon-192.svg',
  '/app/icon-512.svg',
  '/app/placeholder.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // API requests: try network, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
