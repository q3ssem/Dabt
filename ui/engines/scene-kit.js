/* Scene kit — one place that connects a puzzle's logic to a drawing engine.

   Separation of concerns:
   - The puzzle's rules, state, moves, hints and saves stay in the engine (index.html generators + the board code).
     The board code tells the view what changed through view.update(state); it never reads pixels back.
   - What the scene looks like comes from data: ui/engines/scenes/<puzzle id>.json declares the renderer
     ('pixi' | 'konva' | 'dom'), the art files (swappable by changing assetBase/assets only), the frame size,
     anchors, slots, layer order and timings. No coordinate or file name lives in the renderer code.
   - A renderer (ui/engines/renderers/<id>.<engine>.js) is loaded the first time that puzzle opens, and it loads
     only the engine it needs (PixiJS 8 or Konva), once. If anything fails the DOM board stays as it is.

   Art for the redesign is delivered by the art team (ChatGPT Work) against these scene files;
   see docs/SCENE_ASSET_SPEC_AR.md. */
(function () {
  'use strict';
  if (window.mlScene) return;
  const ENGINES = {
    pixi: { src: 'vendor/pixi/pixi.min.js', global: 'PIXI' },
    konva: { src: 'vendor/konva/konva.min.js?v=10.10.0', global: 'Konva' }
  };
  const loads = new Map(), specs = new Map();
  const base = () => document.baseURI;

  function script(src, test) {
    if (test()) return Promise.resolve();
    if (loads.has(src)) return loads.get(src);
    const p = new Promise((ok, bad) => {
      const s = document.createElement('script');
      s.src = new URL(src, base()).href; s.async = true;
      s.onload = () => { s.onload = s.onerror = null; test() ? ok() : bad(new Error('load ' + src)); };
      s.onerror = () => { s.onload = s.onerror = null; loads.delete(src); bad(new Error('load ' + src)); };
      document.head.append(s);
    });
    loads.set(src, p);
    return p;
  }
  function engine(name) {
    const e = ENGINES[name];
    if (!e) return Promise.reject(new Error('engine ' + name));
    return script(e.src, () => !!window[e.global]).then(() => window[e.global]);
  }
  function spec(id) {
    if (!specs.has(id)) specs.set(id, fetch(new URL(`ui/engines/scenes/${id}.json`, base()).href, { cache: 'no-cache' })
      .then(r => { if (!r.ok) throw new Error('spec ' + id); return r.json(); })
      .catch(e => { specs.delete(id); throw e; }));
    return specs.get(id);
  }
  /* asset(spec, key[, state]) → absolute URL. assets[key] is a file name or {state: file}. */
  function asset(sp, key, state) {
    let f = sp.assets && sp.assets[key];
    if (f && typeof f === 'object') f = f[state] ?? f.default;
    if (!f) throw new Error(`asset ${sp.id}:${key}${state ? '/' + state : ''}`);
    return new URL((sp.assetBase || '') + f, base()).href;
  }
  const renderers = {};
  /* mount(id, host, initialState) → view {update(state), destroy()} or null (DOM board stays). The view is
     returned at once; it starts drawing when its engine and art are ready, and queues updates until then. */
  function mount(id, host, state) {
    if (!host) return null;
    let real = null, dead = false, last = state || {};
    const view = {
      update(s) { last = Object.assign({}, last, s); if (real) real.update(last); },
      destroy() { dead = true; if (real) try { real.destroy(); } catch (_) {} real = null; }
    };
    if (typeof cleanup !== 'undefined' && Array.isArray(cleanup)) cleanup.push(() => view.destroy());
    (async () => {
      try {
        const sp = await spec(id);
        if (!sp.renderer || sp.renderer === 'dom' || sp.status === 'disabled') return;
        await script(`ui/engines/renderers/${id}.${sp.renderer}.js`, () => !!renderers[id + '.' + sp.renderer]);
        const lib = await engine(sp.renderer);
        if (dead || !host.isConnected) return;
        const r = await renderers[id + '.' + sp.renderer]({ lib, spec: sp, host, asset: (k, st) => asset(sp, k, st), state: last });
        if (dead || !host.isConnected) { r && r.destroy(); return; }
        real = r; real.update(last);
      } catch (e) {
        if (dead || !host.isConnected) return;
        host.dataset.scene = 'off';
        console.warn('Puzzle scene could not start:', id, e);
      }
    })();
    return view;
  }
  window.mlScene = { engine, spec, asset, mount, renderers };
})();
