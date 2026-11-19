'use strict';
importScripts('./offline-manifest.js');

const VERSION='5.5.28', PATCH='startup-cache-1', PREFIX='mindlab-';
const CORE = PREFIX+VERSION+'-'+PATCH+'-core';
const RUNTIME = PREFIX+VERSION+'-'+PATCH+'-images';
const BASE = new URL('./', self.location.href);
const HOME = new URL('index.html', BASE).href;
const ART = /\.(?:webp|png|jpe?g|svg|avif|gif)$/i;
const CACHEABLE = /\.(?:js|css|woff2|webmanifest|json|mp3|ogg|opus|m4a|wav)$/i;
const inFlight = new Map();

// Install the offline shell first. Puzzle art can be fetched independently.
const shell = self.MINDLAB_OFFLINE_FILES.filter(path => path !== './' && !ART.test(path));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CORE)
    .then(cache => cache.addAll([...new Set(shell)].map(path => new URL(path, BASE).href)))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CORE && name !== RUNTIME)
      .map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

function sharedFetch(url, request, cache) {
  let pending = inFlight.get(url);
  if (!pending) {
    const response = fetch(request);
    const stored = response.then(result => {
      if (result.ok) return cache.put(url, result.clone());
    }).catch(() => { /* Storage pressure and network failures must not block play. */ })
      .finally(() => inFlight.delete(url));
    pending = {response, stored};
    inFlight.set(url, pending);
  }
  return pending;
}

async function navigate(request, url, relative) {
  const core = await caches.open(CORE);
  const isHome = relative === '' || relative === 'index.html';
  if (isHome && !url.search) {
    const saved = await core.match(HOME);
    if (saved) return saved;
  }
  try {
    const response = await fetch(request);
    if (response.ok && !isHome) {
      try { await core.put(request, response.clone()); } catch (_) { /* The live response is still usable. */ }
    }
    return response;
  } catch (_) {
    const saved = await core.match(isHome ? HOME : request, {ignoreSearch: true});
    return saved || new Response('هذه الصفحة لم تُحفظ للعمل دون اتصال. افتحها أولًا أثناء الاتصال.',
      {status: 503, headers: {'Content-Type':'text/plain;charset=utf-8'}});
  }
}

async function resource(event, url, image) {
  const cache = await caches.open(image ? RUNTIME : CORE);
  const saved = await cache.match(url);
  if (saved) return saved;
  try {
    const pending = sharedFetch(url, event.request, cache);
    event.waitUntil?.(pending.stored);
    return (await pending.response).clone();
  } catch (_) {
    return new Response('', {status: 503});
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.headers?.has('range') || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const relative = url.pathname.slice(BASE.pathname.length);
  if (/^(?:tv|tools|qa)\//.test(relative)) return;
  if (request.mode === 'navigate') {
    event.respondWith(navigate(request, url, relative));
  } else if (ART.test(relative) || CACHEABLE.test(relative)) {
    event.respondWith(resource(event, url.href, ART.test(relative)));
  }
});

async function warmArt(files) {
  const cache = await caches.open(RUNTIME);
  for (const file of new Set(files)) {
    const url = new URL(file, BASE).href;
    try {
      if (await cache.match(url)) continue;
      await sharedFetch(url, url, cache).stored;
    } catch (_) { /* Retry after a later visit. */ }
  }
}

self.addEventListener('message', event => {
  if (!event.data) return;
  const {type, puzzleId} = event.data;
  if (type === 'warm-puzzle-art') {
    const files = self.MINDLAB_EXPEDITION_ART[puzzleId];
    if (Array.isArray(files)) event.waitUntil(warmArt(files));
    return;
  }
  if (event.data.type!=='warm-journey') return;
  event.waitUntil(warmArt([
    ...(self.MINDLAB_JOURNEY_ART||[]),
    ...(self.MINDLAB_GAME_ART||[]),
    ...(self.MINDLAB_CORRECTION_ART||[])
  ]));
});
