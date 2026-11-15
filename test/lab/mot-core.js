'use strict';
/* «تتبع الكرات» — منطق مستقل عن الرسم. نسخة مطابقة لقواعد runMOT في index.html (5.4.8):
   8 كرات، تضيء k منها 2.2 ث، تتحرك 6 ث مع انحراف عشوائي وارتداد وتبادل سرعات عند التصادم،
   ثم يلمس اللاعب k كرات. فوز: كل k صحيحة → +k*30+round*5، وكل فوزين k++ وإلا السرعة ×1.12.
   خطأ: تنقص حياة وتبطؤ السرعة. 10 جولات أو 3 أخطاء. الحفظ: lv.motK و lv.motS فقط داخل miran:v2.
   الرسم يأتي من عارض (renderer) خارجي: Canvas أو Phaser أو PixiJS — المنطق لا يعرف أيها. */
(function (root) {
  const Q = new URLSearchParams(location.search);
  const OPT = {
    n: +Q.get('n') || 8, stress: Q.get('mode') === 'stress', collide: Q.get('collide') !== '0',
    fast: Q.get('fast') === '1', seed: +Q.get('seed') || 7, tv: Q.get('tv') === '1'
  };
  // مولد عشوائي ثابت البذرة حتى تتساوى الحركة بين العارضات الثلاثة في القياس.
  let s = OPT.seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------- الحفظ: نفس المفتاح والبنية، ولا يُلمس غير الحقلين ---------- */
  const KEY = 'miran:v2';
  const Save = {
    read() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } },
    level() { const st = this.read(), L = (st && st.lv) || {}; return { k: L.motK || 3, s: L.motS || 0 }; },
    write(k, sp) {
      // يقرأ آخر نسخة كاملة ثم يغيّر motK/motS فقط، فلا يُفقد أي تقدم آخر (جزيرة الكنز، الأطفال…).
      let st = this.read(); if (!st || typeof st !== 'object') st = { v: 1, hist: [], best: {}, lv: {}, days: {} };
      st.lv = st.lv && typeof st.lv === 'object' ? st.lv : {}; st.lv.motK = k; st.lv.motS = sp; st.savedAt = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    }
  };

  /* ---------- القياس ---------- */
  const B = root.__bench = { renderer: '', firstFrame: null, frames: [], touch: [], phaseLog: [], ready: false };
  let lastT = 0, sampling = false;
  function frameTick(now) { if (sampling && lastT) B.frames.push(now - lastT); lastT = now; requestAnimationFrame(frameTick); }
  requestAnimationFrame(frameTick);
  B.start = () => { B.frames = []; sampling = true; };
  B.stop = () => { sampling = false; const f = B.frames.slice().sort((a, b) => a - b), n = f.length;
    if (!n) return null; const avg = f.reduce((a, b) => a + b, 0) / n;
    return { frames: n, fps: +(1000 / avg).toFixed(1), p50: +f[n >> 1].toFixed(2), p95: +f[Math.floor(n * .95)].toFixed(2), max: +f[n - 1].toFixed(2), longFrames: f.filter(x => x > 33.4).length }; };

  /* ---------- اللعبة ---------- */
  function create(view) {
    const W = view.size, r = W * .045, nB = OPT.stress ? OPT.n : 8;
    const lv = Save.level();
    let k = Math.min(6, Math.max(3, lv.k - 1)), sp = Math.max(0, lv.s - 1), speed = W * .00042 * Math.pow(1.12, sp);
    let lives = 3, round = 0, pts = 0, wins = 0, total = 0, balls = [], phase = '', picks = new Set(), focus = 0, timer = null, moveT0 = 0;
    const later = (f, ms) => { timer = setTimeout(f, OPT.fast ? Math.min(ms, 60) : ms); };
    const G = {
      get balls() { return balls; }, get phase() { return phase; }, get k() { return k; }, get picks() { return picks; },
      get focus() { return focus; }, r, W, get state() { return { k, sp, lives, round, pts, wins, phase }; },
      lit(b) { return (phase === 'show' && b.t) || (phase === 'pick' && picks.has(b)) || (phase === 'reveal' && b.t && picks.has(b)); },
      color(b) { return phase === 'reveal' && picks.has(b) && !b.t ? 0xFF5C6C : G.lit(b) ? 0xFFC34D : 0x5B66A0; },
      ring(b) { return phase === 'reveal' && b.t && !picks.has(b); }
    };
    function hud(msg) { view.hud({ round, lives, pts, msg }); }
    const setPhase = p => { phase = p; if (view.onPhase) view.onPhase(p); };
    function setup() {
      round++; picks = new Set(); balls = []; focus = 0;
      let guard = 0;
      while (balls.length < nB && guard++ < 200000) {
        const b = { x: r + rnd() * (W - 2 * r), y: r + rnd() * (W - 2 * r) };
        if (OPT.stress || balls.every(o => Math.hypot(o.x - b.x, o.y - b.y) > 2.6 * r)) { const a = rnd() * 6.283; b.vx = Math.cos(a); b.vy = Math.sin(a); b.id = balls.length; balls.push(b); }
      }
      balls.forEach((b, i) => b.t = i < k);
      if (OPT.stress) { setPhase('move'); view.build(G); hud('اختبار ضغط: ' + nB + ' كرة'); return; }
      view.build(G); setPhase('show'); hud(`احفظ الكرات المضيئة (${k})`); view.draw(G);
      later(() => { moveT0 = 0; setPhase('move'); hud('تابعها بعينك…'); }, 2200);
    }
    // خطوة فيزياء واحدة — نفس معادلات الأصل حرفيًا.
    function step(now, dt) {
      if (phase !== 'move') return;
      if (!moveT0) moveT0 = now;
      for (const b of balls) {
        if (rnd() < .02) { const a = Math.atan2(b.vy, b.vx) + (rnd() - .5) * .8; b.vx = Math.cos(a); b.vy = Math.sin(a); }
        b.x += b.vx * speed * dt; b.y += b.vy * speed * dt;
        if (b.x < r) { b.x = r; b.vx = Math.abs(b.vx); } if (b.x > W - r) { b.x = W - r; b.vx = -Math.abs(b.vx); }
        if (b.y < r) { b.y = r; b.vy = Math.abs(b.vy); } if (b.y > W - r) { b.y = W - r; b.vy = -Math.abs(b.vy); }
      }
      if (OPT.collide) for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d < 2 * r && d > 0) { [a.vx, b.vx] = [b.vx, a.vx]; [a.vy, b.vy] = [b.vy, a.vy]; const o = (2 * r - d) / 2, ux = dx / d, uy = dy / d; a.x -= ux * o; a.y -= uy * o; b.x += ux * o; b.y += uy * o; }
      }
      if (!OPT.stress && now - moveT0 >= (OPT.fast ? 300 : 6000)) { setPhase('pick'); hud(`المس الكرات الـ${k} التي تابعتها`); }
    }
    function pick(b, t0) {
      if (phase !== 'pick' || !b) return;
      picks.has(b) ? picks.delete(b) : picks.add(b);
      if (picks.size === k) {
        setPhase('reveal'); const hits = [...picks].filter(o => o.t).length; total += hits;
        if (hits === k) { wins++; pts += k * 30 + round * 5; hud('ممتاز!'); if (wins % 2 === 0 && k < 6) k++; else { sp++; speed *= 1.12; } }
        else { lives--; if (sp > 0) { sp--; speed /= 1.12; } hud(`أصبت ${hits} من ${k}`); }
        later(() => { if (lives <= 0 || round >= 10) end(); else setup(); }, 1400);
      }
      view.draw(G);
      // زمن الاستجابة: من حدث اللمس الأصلي حتى الإطار التالي المرسوم بعد التحديث.
      if (t0 != null) requestAnimationFrame(() => requestAnimationFrame(() => B.touch.push(performance.now() - t0)));
    }
    function nearest(x, y) { let b = null, bd = r * 1.6; for (const o of balls) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; b = o; } } return b; }
    function end() { setPhase('end'); Save.write(k, sp); hud(`انتهت: ${pts} نقطة · تتبعت ${total} كرة`); view.draw(G); B.ended = { k, sp, pts, total, round }; }
    // جهاز التحكم (التلفزيون) ولوحة المفاتيح: الأسهم تنقل التركيز لأقرب كرة في الاتجاه، OK/Enter يختار.
    function key(e) {
      if (phase !== 'pick') return;
      const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (dirs[e.key]) {
        const [dx, dy] = dirs[e.key], c = balls[focus]; let best = null, bd = Infinity;
        for (const o of balls) { if (o === c) continue; const vx = o.x - c.x, vy = o.y - c.y, along = vx * dx + vy * dy; if (along <= 0) continue; const d = along + 2 * Math.abs(vx * dy - vy * dx); if (d < bd) { bd = d; best = o; } }
        if (best) focus = best.id; view.draw(G); e.preventDefault();
      } else if (e.key === 'Enter' || e.key === ' ') { pick(balls[focus], e.timeStamp); e.preventDefault(); }
    }
    document.addEventListener('keydown', key);
    Object.assign(G, { setup, step, pick, nearest, end, destroy() { clearTimeout(timer); document.removeEventListener('keydown', key); } });
    return G;
  }
  root.MOT = { create, OPT, Save, rnd };
})(window);
