const CACHE = 'harborline-install-icons-v2';
const ICONS = ['/icons/harborline-pwa-192-v4.png', '/icons/harborline-pwa-512-v4.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ICONS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key.startsWith('harborline-install-icons-') && key !== CACHE)
      .map(key => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ICONS.includes(url.pathname)) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
