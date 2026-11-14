'use strict';
/* scene.js — محرك المشهد الجانبي: طبقات مستقلة الحركة، شخصية بتحريك وقفز فيزيائي، لمس متعدد، عناصر تفاعلية تغيّر المشهد. */
(function () {
  const INK = '#2b1d12', GOLD = '#ffd25a', TEAL = '#58d6d0';
  const IMG = {}; const img = src => IMG[src] || (IMG[src] = Object.assign(new Image(), { src: 'upgrade/art/' + src }));
  DX.preload = list => Promise.all(list.map(s => new Promise(res => { const i = img(s); if (i.complete && i.naturalWidth) return res(); i.addEventListener('load', res, { once: true }); i.addEventListener('error', res, { once: true }); })));
  const TINT = { day: null, dusk: ['rgba(255,120,60,.26)', 'rgba(60,20,70,.18)'], night: ['rgba(18,28,92,.52)', 'rgba(8,10,40,.3)'], cool: ['rgba(40,150,170,.25)', null], warm: ['rgba(255,190,80,.22)', null] };
  const H = 400, GROUND = 352;

  /* zone = { art, flip, tint, space, gravity, width, hero, ents:[…] } ; hooks = { interact(ent), touch(ent), say(text) } */
  DX.Scene = function (canvas, zone, hooks) {
    const ctx = canvas.getContext('2d'), W = zone.width || 1200, space = !!zone.space, sheet = img('heroes.png'), tile = img(zone.art);
    const g = 900 * Math.max(.3, Math.min(1.6, zone.gravity || 1));
    const hero = { x: zone.startX || 70, y: 0, vx: 0, vy: 0, ground: true, face: 1, walk: 0, land: 0, target: null };
    const input = { left: false, right: false, jump: false, jumpEdge: false }; let cam = 0, vw = 300, scale = 1, t = 0, raf = 0, dead = false, frozen = false, near = null, last = 0;
    const parts = [], motes = Array.from({ length: 26 }, (_, i) => ({ x: Math.random() * W, y: 40 + Math.random() * 250, p: Math.random() * 6, s: .4 + Math.random() }));
    const plats = () => zone.ents.filter(e => e.type === 'plat');
    const walls = () => zone.ents.filter(e => e.type === 'mech' && !e.open()).map(e => e.bx);

    function resize() { const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1); if (!r.width) return; canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); scale = canvas.height / H; vw = canvas.width / scale; }
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    const burst = (x, y, col, n = 12) => { if (!DX.motion()) return; for (let i = 0; i < n; i++)parts.push({ x, y, vx: (Math.random() - .5) * 160, vy: -40 - Math.random() * 140, life: .7 + Math.random() * .4, col }); };

    /* ---------- الفيزياء ---------- */
    function step(dt) {
      t += dt; if (frozen) { hero.vx = 0; return; }
      let dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (dir) hero.target = null; else if (hero.target != null) { const d = hero.target.x - hero.x; if (Math.abs(d) < 6) { const e = hero.target.ent; hero.target = null; if (e) hooks.interact(e); } else dir = Math.sign(d); }
      hero.vx += (dir * 165 - hero.vx) * Math.min(1, dt * (hero.ground ? 12 : 5)); if (dir) hero.face = dir;
      if (input.jumpEdge && hero.ground) { hero.vy = 330; hero.ground = false; sfx.pop && sfx.pop(); burst(hero.x, GROUND - hero.y, '#e8d9b0', 5); }
      input.jumpEdge = false; if (!input.jump && hero.vy > 120) hero.vy = 120;                 // قفزة قصيرة عند رفع الإصبع مبكرًا
      let nx = hero.x + hero.vx * dt;
      for (const bx of walls()) { if (hero.x <= bx - 18 && nx > bx - 18) { nx = bx - 18; if (hero.target) { hero.target = null; } if (!hero._bump || t - hero._bump > 2.5) { hero._bump = t; hooks.blocked && hooks.blocked(bx); } } }
      hero.x = Math.max(24, Math.min(W - 24, nx));
      const py = hero.y; hero.vy -= g * dt; hero.y += hero.vy * dt; let floor = 0;
      for (const p of plats()) if (hero.x > p.x - p.w / 2 - 10 && hero.x < p.x + p.w / 2 + 10) { if (py >= p.h - 1) floor = Math.max(floor, p.h); else if (hero.vx > 0 && hero.x < p.x) hero.x = Math.min(hero.x, p.x - p.w / 2 - 10); else if (hero.vx < 0 && hero.x > p.x) hero.x = Math.max(hero.x, p.x + p.w / 2 + 10); }
      if (hero.y <= floor) { if (!hero.ground && hero.vy < -150) { hero.land = .16; burst(hero.x, GROUND - floor, '#e8d9b0', 6); } hero.y = floor; hero.vy = 0; hero.ground = true; } else hero.ground = false;
      hero.land = Math.max(0, hero.land - dt); if (hero.ground && Math.abs(hero.vx) > 20) hero.walk += dt * 9;
      near = null; let best = 60;
      for (const e of zone.ents) {
        if (e.hidden && e.hidden()) continue;
        if (e.type === 'pick' && !e.got()) { if (Math.abs(e.x - hero.x) < 30 && Math.abs((e.y || 0) - (hero.y + 45)) < 62) { burst(e.x, GROUND - (e.y || 0), GOLD, 16); hooks.touch(e); } }
        else if (e.type === 'read' || e.type === 'mech' || e.type === 'exit') { const d = Math.abs(e.x - hero.x); if (d < best && hero.y < 30) { best = d; near = e; } }
      }
      const tc = Math.max(0, Math.min(W - vw, hero.x - vw * .42)); cam += (tc - cam) * Math.min(1, dt * 6);
    }

    /* ---------- الرسم ---------- */
    const ink = (w = 3) => { ctx.lineWidth = w; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; };
    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    function medallion(x, y, col, glyph, glow) {
      const bob = Math.sin(t * 2.4 + x) * 4; y += bob; if (glow) { const gr = ctx.createRadialGradient(x, y, 2, x, y, 34); gr.addColorStop(0, col + 'aa'); gr.addColorStop(1, col + '00'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 34, 0, 7); ctx.fill(); }
      ink(3); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffff66'; ctx.beginPath(); ctx.arc(x - 5, y - 6, 4, 0, 7); ctx.fill();
      ctx.fillStyle = INK; ctx.font = '700 17px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(glyph, x, y + 1);
    }
    function crate(e) {
      const x = e.x - e.w / 2, y = GROUND - e.h; ink(3); ctx.fillStyle = space ? '#7d8bb0' : '#b9793f'; rr(x, y, e.w, e.h, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff22'; ctx.fillRect(x + 4, y + 4, e.w - 8, 6); ink(2); ctx.beginPath(); if (space) { ctx.moveTo(x + 8, y + e.h / 2); ctx.lineTo(x + e.w - 8, y + e.h / 2); } else { ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + e.w - 4, y + e.h - 4); ctx.moveTo(x + e.w - 4, y + 4); ctx.lineTo(x + 4, y + e.h - 4); } ctx.stroke();
    }
    function scroll(e) {
      const x = e.x, y = GROUND - 26 + Math.sin(t * 2 + x) * 2, done = e.got && e.got(); ink(3);
      if (space) { ctx.fillStyle = '#39456e'; rr(x - 15, GROUND - 46, 30, 46, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = done ? '#7be08a' : TEAL; rr(x - 10, GROUND - 40, 20, 15, 3); ctx.fill(); ctx.stroke(); return; }
      ctx.fillStyle = done ? '#d8c9a0' : '#f6ecd2'; rr(x - 14, y - 10, 28, 22, 4); ctx.fill(); ctx.stroke(); ink(2); ctx.beginPath(); ctx.moveTo(x - 8, y - 3); ctx.lineTo(x + 8, y - 3); ctx.moveTo(x - 8, y + 3); ctx.lineTo(x + 4, y + 3); ctx.stroke(); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(x + 9, y + 9, 4, 0, 7); ctx.fill();
    }
    function mechProp(e) {
      const x = e.x, k = e.prog(), s = e.solved(); ink(3);
      ctx.fillStyle = space ? '#4a5685' : '#8d7a5f'; rr(x - 13, GROUND - 40, 26, 40, 5); ctx.fill(); ctx.stroke();           // قاعدة
      ctx.save(); ctx.translate(x, GROUND - 58);
      const col = s ? GOLD : (space ? TEAL : '#d9a441');
      if (e.kind === 'gears') { ctx.rotate(s ? t * 1.5 : 0); ctx.fillStyle = col; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-4, -21, 8, 8); ctx.strokeRect(-4, -21, 8, 8); } ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); }
      else if (e.kind === 'mirrors') { ctx.rotate(.5); ctx.fillStyle = s ? '#fff6c9' : '#bfe6ee'; rr(-6, -20, 12, 40, 4); ctx.fill(); ctx.stroke(); }
      else if (e.kind === 'pour') { ctx.rotate(s ? t : 0); ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.stroke(); ink(3); for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -14); ctx.stroke(); } }
      else if (e.kind === 'seals') { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.font = '700 18px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☀', 0, 1); }
      else if (e.kind === 'stroke') { ctx.fillStyle = col; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 8 : 19; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
      else if (e.kind === 'planks') { ctx.fillStyle = '#c98a3a'; for (let i = -1; i < 2; i++) { rr(-18, i * 11 - 5, 36, 9, 3); ctx.fill(); ctx.stroke(); } }
      else { ctx.fillStyle = '#1b2447'; rr(-20, -18, 40, 30, 5); ctx.fill(); ctx.stroke(); ctx.fillStyle = col; rr(-15, -13, 30, 20, 3); ctx.fill(); ctx.fillStyle = INK; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(DX.AR(e.idx + 1), 0, -2); }
      ctx.restore();
      /* العائق المرتبط بالآلية: يتغير فعليًا مع الحل */
      const bx = e.bx; ink(3.5);
      if (e.block === 'gap') {
        const w = 96, x0 = bx - 6; ctx.fillStyle = space ? '#070a1c' : '#1a2a33'; ctx.beginPath(); ctx.moveTo(x0, GROUND - 6); ctx.lineTo(x0 + w, GROUND - 6); ctx.lineTo(x0 + w - 10, H); ctx.lineTo(x0 + 10, H); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#7a5a3a'; rr(x0 - 9, GROUND - 40, 9, 40, 3); ctx.fill(); ctx.stroke(); rr(x0 + w, GROUND - 40, 9, 40, 3); ctx.fill(); ctx.stroke();
        const n = 6; for (let i = 0; i < n; i++) { const a = Math.max(0, Math.min(1, k * n - i)); if (!a) continue; const px = x0 + 2 + i * (w - 4) / n; ctx.globalAlpha = a; if (e.kind === 'stroke') { ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(px + 8, GROUND - 8 - (1 - a) * 30, 6, 0, 7); ctx.fill(); ctx.stroke(); if (i) { ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px - (w - 4) / n + 8, GROUND - 8); ctx.lineTo(px + 8, GROUND - 8); ctx.stroke(); ink(3.5); } } else { ctx.fillStyle = '#c98a3a'; rr(px, GROUND - 12 - (1 - a) * 40, (w - 4) / n - 2, 10, 3); ctx.fill(); ctx.stroke(); } ctx.globalAlpha = 1; }
      } else if (e.block === 'water') {
        const lvl = 70 * (1 - k); ctx.fillStyle = '#6b6f7a'; rr(bx - 8, GROUND - 78, 12, 78, 4); ctx.fill(); ctx.stroke(); rr(bx + 92, GROUND - 78, 12, 78, 4); ctx.fill(); ctx.stroke();
        if (lvl > 1) { ctx.fillStyle = 'rgba(63,208,232,.72)'; ctx.beginPath(); ctx.moveTo(bx + 4, GROUND); for (let i = 0; i <= 8; i++)ctx.lineTo(bx + 4 + i * 11, GROUND - lvl + Math.sin(t * 3 + i) * 2.5); ctx.lineTo(bx + 92, GROUND); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      } else {
        const up = 96 * k, dw = 30; ctx.fillStyle = space ? '#27305a' : '#6f6a62'; rr(bx - 10, GROUND - 128, 12, 128, 4); ctx.fill(); ctx.stroke(); rr(bx + dw - 2, GROUND - 128, 12, 128, 4); ctx.fill(); ctx.stroke(); rr(bx - 14, GROUND - 140, dw + 28, 16, 6); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.beginPath(); ctx.rect(bx - 2, GROUND - 124, dw + 2, 124); ctx.clip(); ctx.fillStyle = space ? '#5e6fa8' : '#9a8f7c'; rr(bx + 1, GROUND - 122 - up, dw - 4, 122, 4); ctx.fill(); ctx.stroke();
        ctx.fillStyle = s ? GOLD : (e.kind === 'mirrors' ? '#4b6f7c' : '#5b4a36'); const cy = GROUND - 78 - up; ctx.beginPath(); if (e.kind === 'mirrors') { ctx.moveTo(bx + dw / 2 - 1, cy - 14); ctx.lineTo(bx + dw / 2 + 8, cy); ctx.lineTo(bx + dw / 2 - 1, cy + 14); ctx.lineTo(bx + dw / 2 - 10, cy); ctx.closePath(); } else ctx.arc(bx + dw / 2 - 1, cy, 9, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore();
        if (e.kind === 'mirrors' && s) { ctx.strokeStyle = 'rgba(255,214,90,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(e.x + 6, GROUND - 60); ctx.lineTo(bx + dw / 2, GROUND - 78 - up); ctx.stroke(); }
      }
    }
    function exitProp(e) {
      const x = e.x, ok = e.ready(); ink(3.5);
      if (space) { ctx.save(); ctx.translate(x, GROUND - (ok ? Math.abs(Math.sin(t * 3)) * 3 : 0)); ctx.fillStyle = '#e9edf7'; ctx.beginPath(); ctx.moveTo(0, -112); ctx.quadraticCurveTo(24, -70, 20, -22); ctx.lineTo(-20, -22); ctx.quadraticCurveTo(-24, -70, 0, -112); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#e2574c'; ctx.beginPath(); ctx.moveTo(-20, -44); ctx.lineTo(-36, -8); ctx.lineTo(-18, -20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(20, -44); ctx.lineTo(36, -8); ctx.lineTo(18, -20); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = ok ? TEAL : '#55607f'; ctx.beginPath(); ctx.arc(0, -70, 10, 0, 7); ctx.fill(); ctx.stroke(); if (ok) { ctx.fillStyle = 'rgba(255,170,60,.85)'; ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(0, -2 + Math.sin(t * 20) * 4); ctx.lineTo(10, -20); ctx.fill(); } ctx.restore(); return; }
      ctx.fillStyle = '#857a6a'; ctx.beginPath(); ctx.moveTo(x - 34, GROUND); ctx.lineTo(x - 34, GROUND - 78); ctx.quadraticCurveTo(x, GROUND - 132, x + 34, GROUND - 78); ctx.lineTo(x + 34, GROUND); ctx.lineTo(x + 20, GROUND); ctx.lineTo(x + 20, GROUND - 72); ctx.quadraticCurveTo(x, GROUND - 106, x - 20, GROUND - 72); ctx.lineTo(x - 20, GROUND); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (ok) { const gr = ctx.createLinearGradient(0, GROUND - 100, 0, GROUND); gr.addColorStop(0, 'rgba(255,214,90,.85)'); gr.addColorStop(1, 'rgba(255,214,90,.15)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x - 20, GROUND); ctx.lineTo(x - 20, GROUND - 72); ctx.quadraticCurveTo(x, GROUND - 106, x + 20, GROUND - 72); ctx.lineTo(x + 20, GROUND); ctx.fill(); }
      else { ctx.fillStyle = 'rgba(10,14,30,.7)'; ctx.beginPath(); ctx.moveTo(x - 20, GROUND); ctx.lineTo(x - 20, GROUND - 72); ctx.quadraticCurveTo(x, GROUND - 106, x + 20, GROUND - 72); ctx.lineTo(x + 20, GROUND); ctx.fill(); }
    }
    function drawHero() {
      const moving = hero.ground && Math.abs(hero.vx) > 20, f = !hero.ground ? 2 : moving ? Math.floor(hero.walk) % 4 : 0, row = zone.hero === 'astro' ? 1 : 0;
      let sx = 1, sy = 1; if (!hero.ground) { const k = Math.max(-1, Math.min(1, hero.vy / 330)); sy = 1 + k * .09; sx = 1 - k * .06; } else if (hero.land > 0) { sy = 1 - hero.land * 1.1; sx = 1 + hero.land * .8; } else if (!moving) sy = 1 + Math.sin(t * 2.6) * .012;
      const hh = 98, ww = hh * 200 / 260, by = GROUND - hero.y, bob = moving ? Math.abs(Math.sin(hero.walk * Math.PI / 2)) * -2.5 : 0;
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(hero.x, GROUND - groundUnder() + 2, 22 * (1 - Math.min(.6, hero.y / 300)), 6, 0, 0, 7); ctx.fill();
      ctx.save(); ctx.translate(hero.x, by + bob); ctx.scale(hero.face * sx, sy); if (sheet.complete && sheet.naturalWidth) ctx.drawImage(sheet, f * 200, row * 260, 200, 260, -ww / 2, -hh, ww, hh); else { ctx.fillStyle = TEAL; rr(-16, -80, 32, 80, 10); ctx.fill(); } ctx.restore();
    }
    const groundUnder = () => { let f = 0; for (const p of plats()) if (hero.x > p.x - p.w / 2 - 10 && hero.x < p.x + p.w / 2 + 10 && hero.y >= p.h - 1) f = Math.max(f, p.h); return f; };
    function draw() {
      ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.clearRect(0, 0, vw, H); const mo = DX.motion();
      /* 1) الخلفية المرسومة (مستوى اللعب) */
      ctx.save(); ctx.translate(-cam, 0);
      if (tile.complete && tile.naturalWidth) for (let k = 0; k * H < W + H; k++) { const flip = (k % 2 === 1) !== !!zone.flip; ctx.save(); ctx.translate(k * H + (flip ? H : 0), 0); ctx.scale(flip ? -1 : 1, 1); ctx.drawImage(tile, 0, 0, tile.naturalWidth, tile.naturalHeight, 0, 0, H + .6, H); ctx.restore(); } else { ctx.fillStyle = space ? '#0b1030' : '#2c6f7a'; ctx.fillRect(0, 0, W, H); }
      ctx.restore();
      const tn = TINT[zone.tint || 'day']; if (tn) { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tn[0]; ctx.fillRect(0, 0, vw, H); ctx.globalCompositeOperation = 'source-over'; if (tn[1]) { ctx.fillStyle = tn[1]; ctx.fillRect(0, 0, vw, H); } }
      /* 2) طبقة جوية بعيدة: تتحرك أبطأ من مستوى اللعب */
      ctx.save(); ctx.translate(-cam * .45, 0);
      if (space) { for (let i = 0; i < 40; i++) { const x = (i * 211.7) % (W * .6 + vw), y = (i * 67.3) % 190, a = .35 + .35 * Math.sin(t * 2 + i); ctx.fillStyle = `rgba(255,255,255,${mo ? a : .5})`; ctx.fillRect(x, y, 1.6, 1.6); } }
      else { for (let i = 0; i < 5; i++) { const x = ((i * 290 + (mo ? t * (6 + i * 2) : 0)) % (W * .6 + vw + 200)) - 100, y = 34 + i * 23; const gr = ctx.createRadialGradient(x, y, 4, x, y, 70); gr.addColorStop(0, zone.tint === 'night' ? 'rgba(160,180,255,.20)' : 'rgba(255,255,255,.30)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y, 80, 22, 0, 0, 7); ctx.fill(); } }
      ctx.restore();
      /* 3) ظل تماس على الأرضية */
      const sh = ctx.createLinearGradient(0, GROUND - 20, 0, H); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.34)'); ctx.fillStyle = sh; ctx.fillRect(0, GROUND - 20, vw, H - GROUND + 20);
      /* 4) عناصر المشهد + الشخصية */
      ctx.save(); ctx.translate(-cam, 0);
      for (const e of zone.ents) {
        if (e.x < cam - 160 || e.x > cam + vw + 160 || (e.hidden && e.hidden())) continue;
        if (e.type === 'plat') crate(e); else if (e.type === 'mech') mechProp(e); else if (e.type === 'read') scroll(e); else if (e.type === 'exit') exitProp(e);
        else if (e.type === 'pick' && !e.got()) medallion(e.x, GROUND - (e.y || 0), e.col || GOLD, e.glyph || '✦', true);
      }
      drawHero();
      if (near && !frozen) { const y = GROUND - (near.type === 'exit' ? 150 : 104) + Math.sin(t * 5) * 3; ctx.fillStyle = GOLD; ink(3); rr(near.x - 34, y - 13, 68, 26, 13); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.font = '700 14px Tajawal, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(near.prompt || 'تفاعل', near.x, y + 1); }
      for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
      ctx.restore();
      /* 5) طبقة أمامية أسرع من مستوى اللعب */
      ctx.save(); ctx.translate(-cam * 1.45, 0); ink(3);
      for (let i = 0; i < 9; i++) { const x = i * 330 + 40; if (x < cam * 1.45 - 120 || x > cam * 1.45 + vw + 120) continue; const sway = mo ? Math.sin(t * 1.3 + i) * 3 : 0;
        if (space) { ctx.fillStyle = '#141a3a'; rr(x - 7, H - 62, 14, 70, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = `rgba(255,210,90,${.55 + .3 * Math.sin(t * 3 + i)})`; ctx.beginPath(); ctx.arc(x, H - 66, 6, 0, 7); ctx.fill(); ctx.stroke(); }
        else { ctx.fillStyle = i % 2 ? '#1f5a3c' : '#2a6b47'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x, H + 6); ctx.quadraticCurveTo(x + k * 16 + sway, H - 46, x + k * 30 + sway * 2, H - 62 + Math.abs(k) * 12); ctx.quadraticCurveTo(x + k * 12, H - 26, x, H + 6); ctx.fill(); ctx.stroke(); } } }
      ctx.restore();
      /* 6) جسيمات عائمة + تعتيم الأطراف */
      if (mo) { ctx.save(); ctx.translate(-cam * 1.15, 0); for (const m of motes) { const x = m.x + Math.sin(t * .6 + m.p) * 14, y = m.y + Math.cos(t * .8 + m.p) * 9; ctx.fillStyle = space ? `rgba(180,220,255,${.25 + .25 * Math.sin(t * 2 + m.p)})` : `rgba(255,236,150,${.3 + .3 * Math.sin(t * 2.4 + m.p)})`; ctx.beginPath(); ctx.arc(x, y, m.s * 1.8, 0, 7); ctx.fill(); } ctx.restore(); }
      const vg = ctx.createRadialGradient(vw / 2, H / 2, H * .45, vw / 2, H / 2, Math.max(vw, H) * .8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(4,6,20,.42)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, H);
    }
    function frame(ts) {
      if (dead) return; const dt = Math.min(.05, (ts - (last || ts)) / 1000); last = ts;
      step(dt); for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life <= 0) parts.splice(i, 1); }
      draw(); raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    /* النقر على عنصر في المشهد: امشِ إليه ثم تفاعل */
    canvas.addEventListener('pointerdown', ev => {
      if (frozen) return; const r = canvas.getBoundingClientRect(), wx = cam + (ev.clientX - r.left) / r.width * vw; let hit = null, d = 54;
      for (const e of zone.ents) if ((e.type === 'read' || e.type === 'mech' || e.type === 'exit') && !(e.hidden && e.hidden()) && Math.abs(e.x - wx) < d) { d = Math.abs(e.x - wx); hit = e; }
      hero.target = { x: hit ? hit.x - (hero.x < hit.x ? 26 : -26) : Math.max(24, Math.min(W - 24, wx)), ent: hit };
    });
    return {
      hero, input, burst, get near() { return near; }, get cam() { return cam; },
      press(k, on) { if (k === 'jump') { if (on && !input.jump) input.jumpEdge = true; input.jump = on; } else input[k] = on; },
      interact() { if (near && !frozen) hooks.interact(near); else if (!frozen) hooks.say && hooks.say('اقترب من عنصر متوهج ثم اضغط «تفاعل».'); },
      freeze(v) { frozen = v; if (v) { input.left = input.right = input.jump = false; hero.target = null; } },
      stop() { dead = true; cancelAnimationFrame(raf); ro.disconnect(); }, resize,
      state: () => ({ x: Math.round(hero.x), y: Math.round(hero.y), vx: Math.round(hero.vx), vy: Math.round(hero.vy), ground: hero.ground, cam: Math.round(cam), near: near && near.id }),
    };
  };
})();
