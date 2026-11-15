// Phaser 4: لعبة داخل div الساحة فقط؛ الواجهة والعدادات تبقى HTML. كائنات Arc لكل كرة، وحلقة Phaser تحدّث المواقع.
// ?pr=canvas يفرض عارض Canvas في Phaser، و?sleep=1 يوقف الحلقة في الشاشات الثابتة لتوفير البطارية.
export const needs = 'vendor/phaser.min.js';
export async function mount(field, ctx) {
  const W = field.clientWidth, dpr = window.devicePixelRatio || 1, S = W * dpr, sleepIdle = ctx.opt.get('sleep') === '1';
  const type = ctx.opt.get('pr') === 'canvas' ? Phaser.CANVAS : Phaser.WEBGL;
  let G, game;
  await new Promise(resolve => {
    class Arena extends Phaser.Scene {
      create() {
        const sc = this; this.items = [];
        this.focusRing = this.add.circle(0, 0, 1).setStrokeStyle(4 * dpr, 0xffffff).setFillStyle().setVisible(false);
        this.caption = this.add.text(S - 12 * dpr, S - 12 * dpr, '', { fontFamily: 'Tajawal', fontStyle: '800', fontSize: Math.round(W * .045 * dpr) + 'px', color: 'rgba(244,241,234,.55)', rtl: true }).setOrigin(1, 1);
        const view = {
          size: W, hud: ctx.hud,
          build(g) {
            sc.items.forEach(o => { o.body.destroy(); o.shine.destroy(); }); sc.items = [];
            for (const b of g.balls) sc.items.push({ b, body: sc.add.circle(0, 0, g.r * dpr, 0x5B66A0), shine: sc.add.circle(0, 0, g.r * .28 * dpr, 0xffffff, .35) });
            sc.children.bringToTop(sc.focusRing); sc.children.bringToTop(sc.caption);
            sc.caption.setText('ساحة التتبع · ' + g.balls.length + ' كرات');
          },
          draw: () => sc.sync(),
          onPhase(p) { if (!sleepIdle) return; if (p === 'move') game.loop.wake(); else setTimeout(() => { sc.sync(); game.loop.sleep(); }, 50); }
        };
        G = MOT.create(view);
        this.input.on('pointerdown', p => { if (G.phase === 'pick') G.pick(G.nearest(p.x / dpr, p.y / dpr), p.event.timeStamp); });
        G.setup(); this.sync(); resolve();
      }
      sync() {
        for (const it of this.items) {
          const b = it.b; it.body.setPosition(b.x * dpr, b.y * dpr).setFillStyle(G.color(b));
          if (G.ring(b)) it.body.setStrokeStyle(3 * dpr, 0x4BE08A); else it.body.isStroked = false;
          it.shine.setPosition((b.x - G.r * .3) * dpr, (b.y - G.r * .32) * dpr);
        }
        const f = ctx.tv && G.phase === 'pick' && G.balls[G.focus];
        this.focusRing.setVisible(!!f); if (f) this.focusRing.setPosition(f.x * dpr, f.y * dpr).setRadius(G.r * 1.35 * dpr);
      }
      update(time, delta) { if (!G) return; G.step(performance.now(), Math.min(40, delta)); if (G.phase === 'move' || G.phase === 'pick') this.sync(); }
    }
    game = new Phaser.Game({ type, parent: field, width: S, height: S, backgroundColor: '#151a33', banner: false, antialias: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.NO_CENTER }, audio: { noAudio: true }, input: { keyboard: false }, scene: Arena });
  });
  ctx.firstFrame();
  return { label: 'Phaser ' + Phaser.VERSION + ' · ' + (game.config.renderType === Phaser.CANVAS ? 'Canvas' : 'WebGL'), G, game, destroy() { G.destroy(); game.destroy(true); } };
}
