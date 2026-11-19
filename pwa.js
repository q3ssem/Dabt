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

  const pending = new Set();
  function flushPuzzles() {
    const worker = serviceWorker.controller;
    if (!worker || navigator.connection?.saveData) return;
    for (const puzzleId of pending) worker.postMessage({type:'warm-puzzle-art', puzzleId});
    pending.clear();
  }
  serviceWorker.addEventListener('controllerchange', () => defer(flushPuzzles));
  function warmPuzzle(puzzleId) {
    if (!puzzleId || pending.has(puzzleId) || navigator.connection?.saveData) return;
    pending.add(puzzleId);
    defer(flushPuzzles);
  }
  window.mindlabOffline = {warmPuzzle};

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
