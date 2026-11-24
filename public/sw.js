const CACHE = 'harborline-install-icons-v4';
const ICONS = ['/icons/harborline-pwa-192-v4.png', '/icons/harborline-pwa-512-v4.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(ICONS.map(async path => {
    try {
      const response = await fetch(path, {cache: 'no-store'});
      if (response.ok && response.headers.get('content-type')?.startsWith('image/png')) await cache.put(path, response);
    } catch {}
  }))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('harborline-install-icons-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !ICONS.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.headers.get('content-type')?.startsWith('image/png')) {
        await cache.put(event.request, response.clone());
        return response;
      }
      return await cache.match(event.request) || response;
    } catch {
      return await cache.match(event.request) || Response.error();
    }
  })());
});
