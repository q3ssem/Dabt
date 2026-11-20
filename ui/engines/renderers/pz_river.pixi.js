/* عبور النهر — PixiJS 8 view. Everything visual comes from ui/engines/scenes/pz_river.json (files, painting frame,
   dock points, boat layers, timings). State comes from the board via update({side, sailing, passengers, won}).
   Taps, drag and drop, screen-reader labels and the rules stay in the DOM board; the DOM boat (passenger buttons,
   drop slot) is moved to where this view draws the boat. The frame loop runs only while something moves. */
(function () {
  'use strict';
  if (!window.mlScene) return;
  window.mlScene.renderers['pz_river.pixi'] = async function ({ lib: PIXI, spec, host, asset, state }) {
    const F = spec.frame, B = spec.boat, M = spec.motion;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const skin = () => (document.documentElement.dataset.skin === 'dark' ? 'dark' : 'light');
    const urls = { painting: asset('painting', skin()) };
    for (const L of [...B.layers, B.splash]) {
      if (L.facing) for (const f of ['go', 'return']) urls[`${L.key}/${f}`] = asset(L.key, f);
      else urls[L.key] = asset(L.key);
    }
    const tex = await PIXI.Assets.load(Object.values(urls));
    const T = k => tex[urls[k]];
    const app = new PIXI.Application();
    await app.init({ backgroundAlpha: 0, antialias: true, autoDensity: true, autoStart: false, preference: 'webgl',
      resolution: Math.min(window.devicePixelRatio || 1, 2), width: host.clientWidth || 300, height: host.clientHeight || 300,
      eventFeatures: { move: false, globalMove: false, click: false, wheel: false } });
    // not interactive (taps go to the DOM) and redrawn only on change: no per-frame system ticker
    app.stage.eventMode = 'none'; try { PIXI.Ticker.system.stop(); app.ticker?.stop(); } catch (_) {}
    const canvas = app.canvas; canvas.className = 'scene-canvas'; canvas.setAttribute('aria-hidden', 'true');
    host.prepend(canvas);

    const bg = new PIXI.Sprite(T('painting'));
    const boat = new PIXI.Container();
    const layers = B.layers.map(L => {
      const s = new PIXI.Sprite(T(L.facing ? `${L.key}/go` : L.key)); s.anchor.set(.5);
      if (L.scale) s.scale.set(L.scale); if (L.y) s.y = L.y; if (L.x) s.x = L.x;
      boat.addChild(s); return { L, s };
    });
    const splash = new PIXI.Sprite(T(B.splash.key)); splash.anchor.set(.5); splash.alpha = 0;
    app.stage.addChild(bg, boat, splash);
    const vessel = host.querySelector('.rv10-boat');

    let W = 0, H = 0, k = 1, ox = 0, oy = 0, bw = 0, side = state.side ? 1 : 0, passengers = state.passengers || 0;
    let sailing = false, from = null, to = null, t0 = 0, splashAt = 0, pos = null, raf = 0, dead = false;
    const toScreen = p => ({ x: ox + p.x * k, y: oy + p.y * k });
    const dock = s => toScreen(s ? F.docks.right : F.docks.left);
    function layout() {
      W = host.clientWidth; H = host.clientHeight; if (!W || !H) return;
      app.renderer.resize(W, H);
      const [pw, ph] = F.painting.size;
      k = Math.min(W * (F.painting.maxWidthOfBoard || 1) / pw, H / ph);
      const iw = pw * k, ih = ph * k;
      ox = (W - iw) / 2; oy = F.painting.anchor === 'bottom-center' ? H - ih : (H - ih) / 2;
      bg.x = ox; bg.y = oy; bg.width = iw; bg.height = ih;
      bw = Math.max(B.screenWidthClamp[0], Math.min(B.screenWidthClamp[1], B.widthOnPainting * k));
      boat.scale.set(bw / B.canvas[0]);
      if (!sailing) pos = dock(side);
    }
    const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function draw(now) {
      if (sailing) {
        const p = reduce ? 1 : Math.min(1, (now - t0) / M.sailMs), e = ease(p);
        pos = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e - Math.sin(Math.PI * e) * bw * M.hop };
        if (p >= 1) { sailing = false; splashAt = now; side = 1 - side; }
      }
      const facing = side ? 'return' : 'go', row = sailing ? Math.sin(now / M.rowPeriodMs) : 0;
      for (const { L, s } of layers) {
        if (L.facing) s.texture = T(`${L.key}/${facing}`);
        s.visible = L.show === 'sailing' ? sailing : L.show === 'docked' ? !sailing : L.show === 'empty' ? !passengers : true;
        if (L.row) s.rotation = row * L.row;
        if (L.pulse) s.alpha = .55 + .35 * Math.sin(now / 120);
      }
      boat.rotation = sailing ? Math.sin(now / 160) * M.sway : 0;
      boat.x = pos.x; boat.y = pos.y;
      if (vessel) { vessel.style.left = pos.x + 'px'; vessel.style.top = pos.y + 'px'; }
      const sp = splashAt ? Math.min(1, (now - splashAt) / M.splashMs) : 1;
      splash.alpha = splashAt ? 1 - sp : 0;
      splash.scale.set(bw / B.canvas[0] * B.splash.scale * (.85 + .5 * sp));
      splash.x = pos.x; splash.y = pos.y + bw * B.splash.offsetY;
      app.render();
      if (sailing || (splashAt && sp < 1)) raf = requestAnimationFrame(draw); else { raf = 0; splashAt = 0; }
    }
    const kick = () => { if (!raf && !dead) raf = requestAnimationFrame(draw); };
    layout(); pos = dock(side);
    host.classList.add('scene-on'); host.dataset.scene = 'pixi';
    draw(performance.now());
    const ro = new ResizeObserver(() => { if (!dead) { layout(); kick(); } }); ro.observe(host);
    const skinWatch = new MutationObserver(async () => {
      const u = asset('painting', skin()); if (u === urls.painting || dead) return;
      urls.painting = u; const t = await PIXI.Assets.load(u); if (!dead) { bg.texture = t; kick(); }
    });
    skinWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-skin'] });
    window.mlRiverPixiState = () => dead ? { on: false } : { on: true, side, sailing, boat: { x: Math.round(boat.x), y: Math.round(boat.y) }, W, H };
    return {
      update(s) {
        if (dead) return;
        if (typeof s.passengers === 'number') passengers = s.passengers;
        if (s.sailing && !sailing) { from = dock(side); to = dock(1 - side); t0 = performance.now(); sailing = true; }
        else if (!s.sailing && !sailing && typeof s.side === 'number' && s.side !== side) { side = s.side; pos = dock(side); }
        kick();
      },
      destroy() {
        dead = true; cancelAnimationFrame(raf); ro.disconnect(); skinWatch.disconnect();
        host.classList.remove('scene-on'); delete host.dataset.scene;
        try { app.destroy(true, { children: true }); } catch (_) {}
      }
    };
  };
})();
