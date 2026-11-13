// V21 service worker: precaches the app shell, data and shared symbols listed in
// offline-manifest.json; section art is cached only by the in-app download button.
const SECTION_CACHE = 'dabt21-sections-v1';
let coreName = 'dabt21-core';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const r = await fetch('offline-manifest.json', { cache: 'no-cache' });
    const m = await r.json();
    coreName = 'dabt21-core-' + m.version;
    const c = await caches.open(coreName);
    await c.addAll(m.core);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const r = await caches.match('offline-manifest.json').catch(() => null);
    const keys = await caches.keys();
    const m = r ? await r.json() : null;
    const keep = new Set([SECTION_CACHE, m ? 'dabt21-core-' + m.version : null]);
    await Promise.all(keys.filter(k => k.startsWith('dabt21-core-') && !keep.has(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    try { return await fetch(req); }
    catch (e) {
      if (req.mode === 'navigate') { const shell = await caches.match('./', { ignoreVary: true }) || await caches.match('index.html', { ignoreVary: true }); if (shell) return shell; }
      throw e;
    }
  })());
});
