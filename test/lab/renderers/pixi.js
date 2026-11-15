// PixiJS 8: عارض فقط (بلا مشاهد أو فيزياء). رسم أبيض واحد لكل كرة ثم تلوين بالـtint.
export const needs = 'vendor/pixi.min.js';
export async function mount(field, ctx) {
  const W = field.clientWidth, dpr = window.devicePixelRatio || 1, sleepIdle = ctx.opt.get('sleep') === '1';
  const app = new PIXI.Application();
  await app.init({ width: W, height: W, resolution: dpr, autoDensity: true, antialias: true, background: '#151a33', preference: ctx.opt.get('pr') === 'canvas' ? 'canvas' : 'webgl' });
  field.append(app.canvas);
  let G, items = [];
  const ring = new PIXI.Graphics(), caption = new PIXI.Text({ text: '', style: { fontFamily: 'Tajawal', fontWeight: '800', fontSize: Math.round(W * .045), fill: 'rgba(244,241,234,.55)' } });
  caption.anchor.set(1, 1); caption.position.set(W - 12, W - 12);
  let disc, shineTex;
  const view = {
    size: W, hud: ctx.hud,
    build(g) {
      if (!disc) {
        // إطار صريح بهامش 2px وبكثافة الشاشة، وإلا قصّ generateTexture حافة الدائرة اليمنى والسفلى.
        const tex = (rad, fill) => { const p = 2, d = 2 * rad + 2 * p; return app.renderer.generateTexture({ target: new PIXI.Graphics().circle(rad + p, rad + p, rad).fill(fill), resolution: dpr, antialias: true, frame: new PIXI.Rectangle(0, 0, d, d) }); };
        disc = tex(g.r, 0xffffff); shineTex = tex(g.r * .28, { color: 0xffffff, alpha: .35 });
      }
      items.forEach(o => { o.body.destroy(); o.shine.destroy(); o.ring.destroy(); }); items = [];
      for (const b of g.balls) {
        const body = new PIXI.Sprite(disc), shine = new PIXI.Sprite(shineTex), rg = new PIXI.Graphics().circle(0, 0, g.r).stroke({ width: 3, color: 0x4BE08A });
        body.anchor.set(.5); shine.anchor.set(.5); rg.visible = false; app.stage.addChild(body, rg, shine); items.push({ b, body, shine, ring: rg });
      }
      app.stage.addChild(ring, caption); caption.text = 'ساحة التتبع · ' + g.balls.length + ' كرات';
    },
    draw: () => sync(),
    onPhase(p) { if (!sleepIdle) return; if (p === 'move') app.ticker.start(); else setTimeout(() => { sync(); app.render(); app.ticker.stop(); }, 50); }
  };
  function sync() {
    for (const it of items) { const b = it.b; it.body.position.set(b.x, b.y); it.body.tint = G.color(b); it.ring.position.set(b.x, b.y); it.ring.visible = G.ring(b); it.shine.position.set(b.x - G.r * .3, b.y - G.r * .32); }
    ring.clear(); const f = ctx.tv && G.phase === 'pick' && G.balls[G.focus]; if (f) ring.circle(f.x, f.y, G.r * 1.35).stroke({ width: 4, color: 0xffffff });
  }
  app.stage.eventMode = 'static'; app.stage.hitArea = app.screen;
  app.stage.on('pointerdown', e => { if (G.phase === 'pick') G.pick(G.nearest(e.global.x, e.global.y), e.nativeEvent.timeStamp); });
  G = MOT.create(view); G.setup(); sync();
  app.ticker.add(t => { G.step(performance.now(), Math.min(40, t.deltaMS)); if (G.phase === 'move' || G.phase === 'pick') sync(); });
  ctx.firstFrame();
  return { label: 'PixiJS ' + PIXI.VERSION + ' · ' + (app.renderer.type === 1 ? 'WebGL' : app.renderer.name || 'other'), G, app, destroy() { G.destroy(); app.destroy(true, { children: true, texture: true }); } };
}
