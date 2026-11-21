'use strict';
importScripts('./offline-manifest.js');

const VERSION='5.5.28', PATCH='intent-load-13', PREFIX='mindlab-';
const CORE = PREFIX+VERSION+'-'+PATCH+'-core';
const RUNTIME = PREFIX+VERSION+'-'+PATCH+'-images';
const SCENES = PREFIX+VERSION+'-'+PATCH+'-scenes';
const BASE = new URL('./', self.location.href);
const HOME = new URL('index.html', BASE).href;
const ART = /\.(?:webp|png|jpe?g|svg|avif|gif)$/i;
const CACHEABLE = /\.(?:js|css|woff2|webmanifest|json|mp3|ogg|opus|m4a|wav)$/i;
const inFlight = new Map();
const sceneURLs = new Set(Object.values(self.MINDLAB_SCENE_FILES)
  .flat().map(path => new URL(path, BASE).href));

// Install the offline shell first. Puzzle art can be fetched independently.
// Cache the usable entry shell; the optional "download all" action fetches every
// other JS/CSS/font/image. A fresh install should not download 3.8 MB before claiming the page.
const shell = [
  'index.html', 'manifest.webmanifest', 'pwa.js', 'ui/app.js',
  'ui/mini.js', 'release54.js', 'audio/mindlab-audio.js',
  'ds/light-auto.css', 'ds/mindlab-ds.css', 'ui/style.css',
  // Assessment dashboard remains usable offline after first installation.
  'assessment/dashboard.html', 'assessment/rule-switch.html',
  'assessment/dashboard.js', 'assessment/rule-switch.js',
  'assessment/style.css', 'assessment/common.js', 'assessment/sync.js',
  'qa/assessment-engine/Dabt_Assessment_Engine_v1.3.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CORE)
    .then(cache => cache.addAll([...new Set(shell)].map(path => new URL(path, BASE).href)))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(names => Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CORE && name !== RUNTIME && name !== SCENES)
      .map(name => caches.delete(name))))
    .then(() => self.clients.claim()));
});

// Storage policy: puzzle art is cached as it is used, and the image cache keeps at most MAX_IMAGES files
// (oldest first out), so a long session through every world cannot fill the phone. Code and the app shell are
// not trimmed. Player progress lives in localStorage and is never touched here.
const MAX_IMAGES = 2200;
let trimming = null;
function trimImages() {
  if (trimming) return trimming;
  trimming = caches.open(RUNTIME).then(async cache => {
    const keys = await cache.keys();
    for (const request of keys.slice(0, Math.max(0, keys.length - MAX_IMAGES))) await cache.delete(request);
  }).catch(() => {}).finally(() => { trimming = null; });
  return trimming;
}

function sharedFetch(url, request, cache) {
  let pending = inFlight.get(url);
  if (!pending) {
    const response = fetch(request);
    const stored = response.then(result => {
      if (result.ok) return cache.put(url, result.clone()).then(() => { if (ART.test(url)) trimImages(); });
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
  const cache = await caches.open(sceneURLs.has(url) ? SCENES : image ? RUNTIME : CORE);
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
  // qa/assessment-engine/ holds the assessment engine that index.html loads at start-up: it is part of the app.
  if (/^(?:tv|tools|qa)\//.test(relative) && !relative.startsWith('qa/assessment-engine/')) return;
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

async function warmScene(files) {
  const cache = await caches.open(SCENES);
  for (const file of files) {
    const url = new URL(file, BASE);
    try {
      if (await cache.match(url.href)) continue;
      await sharedFetch(url.href, new Request(url, {priority: 'low'}), cache).stored;
    } catch (_) { /* Opening the puzzle can retry a missed asset. */ }
  }
}

self.addEventListener('message', event => {
  if (!event.data) return;
  const {type, puzzleId} = event.data;
  if (type === 'preload-all') {
    const port = event.ports?.[0];
    if (port) event.waitUntil(preloadAll(port));
    return;
  }
  if (type === 'warm-puzzle-scene') {
    const files = self.MINDLAB_SCENE_FILES[puzzleId];
    if (Array.isArray(files)) event.waitUntil(warmScene(files));
    return;
  }
  if (type === 'warm-puzzle-art') {
    const files = self.MINDLAB_EXPEDITION_ART[puzzleId];
    if (Array.isArray(files)) event.waitUntil(warmArt(files));
    return;
  }

});

/* Prepare the complete active puzzle asset set once; subsequent launches verify the persistent CacheStorage. */
const PRELOAD_FILES = [...new Set([
  ...self.MINDLAB_OFFLINE_FILES,
  ...(self.MINDLAB_JOURNEY_ART || []),
  ...(self.MINDLAB_GAME_ART || []),
  ...(self.MINDLAB_CORRECTION_ART || []),
  ...Object.values(self.MINDLAB_EXPEDITION_ART || {}).flat()
].filter(file => file && file !== './' && !file.includes('/pz_stat/') && !file.includes('/pz_xbottle/')))];
let activePreload = null;
async function preloadAll(port) {
  if (activePreload) {
    // A new page can request a fresh cache check; do not run two competing downloads.
    try { await activePreload; } catch (_) {}
  }
  const job = (async () => {
    const core = await caches.open(CORE), images = await caches.open(RUNTIME);
    const scenes = await caches.open(SCENES);
    const cacheByType = {core, images, scenes};
    const stored = {};
    for (const [name, cache] of Object.entries(cacheByType))
      stored[name] = new Set((await cache.keys()).map(request => request.url));
    const tasks = PRELOAD_FILES.map(path => {
      const url = new URL(path, BASE).href;
      return {url, type: sceneURLs.has(url) ? 'scenes' : ART.test(path) ? 'images' : 'core'};
    });
    const total = tasks.length;
    let cursor = 0, done = 0, downloaded = 0, cached = 0, failed = 0;
    const failedFiles = [];
    const report = type => {
      try { port.postMessage({type, total, done, downloaded, cached, failed, failedFiles: type === 'complete' ? failedFiles.slice(0, 12) : undefined}); }
      catch (_) { /* The page may have closed. */ }
    };
    report('progress');
    async function runner() {
      while (cursor < total) {
        const task = tasks[cursor++];
        const cache = cacheByType[task.type];
        if (stored[task.type].has(task.url)) {
          cached++;
        } else {
          try {
            const response = await fetch(new Request(task.url, {credentials: 'same-origin'}));
            if (!response.ok || response.type === 'opaque') throw new Error('HTTP ' + response.status);
            await cache.put(task.url, response);
            stored[task.type].add(task.url);
            downloaded++;
          } catch (_) {
            failed++;
            failedFiles.push(task.url.slice(BASE.href.length));
          }
        }
        done++;
        if (done % 8 === 0 || done === total) report('progress');
      }
    }
    await Promise.all(Array.from({length: 4}, () => runner()));
    report('complete');
  })();
  activePreload = job;
  try { await job; } finally { if (activePreload === job) activePreload = null; }
}
