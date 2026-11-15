// العارض الحالي: Canvas 2D بنفس رسم runMOT (دائرة + لمعة لكل كرة)، وحلقة rAF تعمل أثناء الحركة فقط.
const hex = c => '#' + c.toString(16).padStart(6, '0');
export async function mount(field, ctx) {
  const W = field.clientWidth, dpr = window.devicePixelRatio || 1, cv = document.createElement('canvas');
  cv.width = W * dpr; cv.height = W * dpr; field.append(cv); const g = cv.getContext('2d'); g.scale(dpr, dpr);
  let raf = 0, last = 0, G;
  const view = { size: W, hud: ctx.hud, build() {}, draw, onPhase(p) { if (p === 'move' && !raf) { last = 0; raf = requestAnimationFrame(loop); } } };
  function draw() {
    g.clearRect(0, 0, W, W);
    for (const b of G.balls) {
      g.beginPath(); g.arc(b.x, b.y, G.r, 0, 6.283); g.fillStyle = hex(G.color(b)); g.fill();
      if (G.ring(b)) { g.lineWidth = 3; g.strokeStyle = '#4BE08A'; g.stroke(); }
      g.beginPath(); g.arc(b.x - G.r * .3, b.y - G.r * .32, G.r * .28, 0, 6.283); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill();
    }
    if (ctx.tv && G.phase === 'pick') { const b = G.balls[G.focus]; g.beginPath(); g.arc(b.x, b.y, G.r * 1.35, 0, 6.283); g.lineWidth = 4; g.strokeStyle = '#fff'; g.stroke(); }
    g.direction = 'rtl'; g.textAlign = 'right'; g.font = `800 ${Math.round(W * .045)}px Tajawal`; g.fillStyle = 'rgba(244,241,234,.55)';
    g.fillText('ساحة التتبع · ' + G.balls.length + ' كرات', W - 12, W - 12);
  }
  function loop(now) {
    const dt = Math.min(40, last ? now - last : 16); last = now; G.step(now, dt); draw();
    raf = G.phase === 'move' ? requestAnimationFrame(loop) : 0;
  }
  cv.onpointerdown = e => { if (G.phase !== 'pick') return; e.preventDefault(); const rc = cv.getBoundingClientRect(); G.pick(G.nearest((e.clientX - rc.left) * W / rc.width, (e.clientY - rc.top) * W / rc.height), e.timeStamp); };
  G = MOT.create(view); G.setup(); draw(); ctx.firstFrame();
  return { label: 'Canvas 2D (الحالي)', G, destroy() { cancelAnimationFrame(raf); G.destroy(); cv.remove(); } };
}
