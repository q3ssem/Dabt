'use strict';
(function () {
  if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;

  const serviceWorker = navigator.serviceWorker;
  function register() {
    serviceWorker.register(new URL('sw.js', document.baseURI).href, {updateViaCache: 'none'})
      .catch(() => { /* The online app is usable without a worker. */ });
  }
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, {once: true});

  function defer(callback) {
    if ('requestIdleCallback' in window) window.requestIdleCallback(callback, {timeout: 3000});
    else window.setTimeout(callback, 250);
  }

  const recentSceneKey = 'mindlab:recent-puzzle-scene';
  let pendingScene = false, sceneRequested = false;
  function flushScene() {
    const worker = serviceWorker.controller;
    const connection = navigator.connection;
    if (!pendingScene || sceneRequested || !worker || document.hidden || connection?.saveData ||
        /^(?:slow-2g|2g|3g)$/.test(connection?.effectiveType || '')) return;
    worker.postMessage({type: 'warm-puzzle-scene', puzzleId: 'pz_stat'});
    sceneRequested = true;
  }
  function queueRecentScene() {
    try { pendingScene = localStorage.getItem(recentSceneKey) === 'pz_stat'; } catch (_) {}
    defer(flushScene);
  }
  if (document.readyState === 'complete') queueRecentScene();
  else window.addEventListener('load', queueRecentScene, {once: true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) defer(flushScene); });

  const pending = new Set();
  function flushPuzzles() {
    const worker = serviceWorker.controller;
    if (!worker || navigator.connection?.saveData) return;
    for (const puzzleId of pending) worker.postMessage({type:'warm-puzzle-art', puzzleId});
    pending.clear();
  }
  serviceWorker.addEventListener('controllerchange', () => defer(() => {
    flushScene();
    flushPuzzles();
  }));
  function warmPuzzle(puzzleId) {
    if (!puzzleId || pending.has(puzzleId) || navigator.connection?.saveData) return;
    pending.add(puzzleId);
    defer(flushPuzzles);
  }
  function rememberPuzzle(id) {
    try {
      if (id === 'pz_stat') localStorage.setItem(recentSceneKey, id);
      else localStorage.removeItem(recentSceneKey);
    } catch (_) { /* Storage can be unavailable in restricted browser contexts. */ }
  }
  window.mindlabOffline = {warmPuzzle, rememberPuzzle};

  let journeyRequested = false;
  document.addEventListener('click', event => {
    const puzzle = event.target.closest?.('[data-legacy-puzzle]');
    if (puzzle) warmPuzzle(puzzle.dataset.legacyPuzzle);
    if (journeyRequested || navigator.connection?.saveData ||
        !event.target.closest?.('#mlj-journey-entry, #t7-homego')) return;
    if (/^[23]g$|^slow-2g$/.test(navigator.connection?.effectiveType || '')) return;
    journeyRequested = true;
    defer(() => {
      const worker = serviceWorker.controller;
      if (worker) worker.postMessage({type:'warm-journey'});
      else journeyRequested = false;
    });
  });
})();
