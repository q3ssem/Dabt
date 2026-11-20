/* priority-7 R4 — palace boards: الخريطتان الشفافتان (pz_pobs), أبواب القصر (pz_door), التماثيل المتكلمة (pz_pliar).
   Original generators and rules only: poMake, drMake + drVals + DR_RULES, pqMake + pqEval. Ids, levels, saves, palace
   progress (pWin) and the Atheran unlock are unchanged. Art: motion/art (R4 asset manifest, VERIFIED rows).

   Display keys are kept apart from generator fields:
     key position  → `keyAt`  (UI state: starts in the tray, moved by the player; never read from P.t)
     door badges   → display order 0..n-1 of drMake.n / pqMake.D
     inscriptions  → drMake.st (here/at/nothere/notat/side/either/liar/true) · pqMake.sts (door/ndoor/truth/liar/cnt/same)
     the rule      → drMake.rule (one/onef/two/none/lady/mix)
     the answer    → checked only on «ثبّت»: P.rule.ok(drVals(P,keyAt),keyAt) and every statue direction (pz_door);
                     pqMake.sol (pz_pliar). Nothing about the answer is shown before the player commits. */
(function () {
  'use strict';
  if (!window.MK || typeof GM === 'undefined' || typeof pzPlay !== 'function') return;
  const ART = 'ui/designs_art/priority7/', img = (k, cls = '', alt = '') => `<img class="${cls}" src="${ART}${k}.png" alt="${alt}" draggable="false">`;
  const statueAsset = pose => 'motion/art-polish/' + pose + '.webp';

  const AR = ['١', '٢', '٣', '٤', '٥'], LET = ['أ', 'ب', 'ج', 'د', 'هـ'];
  // door numbers use the approved numbered badges (badge_1..5 = display order of drMake.n); letters and counts use a drawn ring
  const badge = (lab, cls = '') => { const d = AR.indexOf(lab); return d >= 0 && !/cnt|xs/.test(cls) ? `<span class="pl-badge img ${cls}"><img src="${ART}badge_${d + 1}.png" alt="${lab}" draggable="false"></span>` : `<span class="pl-badge ${cls}"><b>${lab}</b></span>`; };
  const TICK = '<i class="pl-yes" aria-hidden="true">✓</i>', CROSS = '<i class="pl-no" aria-hidden="true">✗</i>';

  /* ================================================================ pz_pobs — الخريطتان الشفافتان (priority-7 R4)
     Two separate layers: the blue star map (P.bot) is fixed; the gold transparent sheet (P.top, poMake) is moved with a
     finger (drag snaps to cells), the arrow pad or the keyboard, and turned with ↻. Where a gold mark lies on a blue one
     both stay visible (triangle inside the disc). Same rule (every gold mark on a blue mark), same 24-move budget
     (a drag costs one move per cell crossed), same answer (poMake, unique, never aligned at the start), same pWin. */
  if (GM.pz_pobs && typeof poMake === 'function') {
    GM.pz_pobs.run = function runPObsMotion() {
      return pzPlay('pz_pobs', api => {
        const P = poMake(api.lv), n = P.n, bset = new Set(P.bot), lim = 24; let r = 0, dx = 0, dy = 0, moves = 0, busy = false, ghost = null;
        const cur = (rr = r, x0 = dx, y0 = dy) => paRot(P.top, rr).map(([x, y]) => [x + x0, y + y0]);
        const ok = () => cur().every(([x, y]) => inb(x, y, n, n) && bset.has(y * n + x));
        const ext = rr => { const s = paRot(P.top, rr); return [Math.max(...s.map(a => a[0])), Math.max(...s.map(a => a[1]))]; };
        const clampXY = (x, y, rr = r) => { const [w, h] = ext(rr); return [Math.max(0, Math.min(n - 1 - w, x)), Math.max(0, Math.min(n - 1 - h, y))]; };
        api.body.innerHTML = xSheet(`${xHead(`<img src="ui/designs_art/priority7/prop_starchart.png" alt="" width="30" height="30">`, 'الخريطتان الشفافتان')}
          <div class="po-top"><span class="po-key"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="#3E73B5"/></svg>نجوم الخريطة الزرقاء</span><span class="po-key"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3l7 13H3z" fill="#C8932F"/></svg>نجوم الشفافة الذهبية</span></div>
          <p class="mk-lead">اسحب الشفافة الذهبية ودوّرها حتى تقع كل نجمة ذهبية على نجمة زرقاء.</p>
          <div class="po-board" id="pob"><svg viewBox="-.5 -.5 ${n} ${n}" id="pos" role="img" aria-label="الخريطتان"><g id="pobot"></g><g id="potop"></g></svg></div>
          <div class="po-pad" dir="ltr">${[['t', '↻', 'دوّر الشفافة'], ['r', '→', 'يمين'], ['l', '←', 'يسار'], ['d', '↓', 'أسفل'], ['u', '↑', 'أعلى']].map(([m, g, a]) => `<button data-m="${m}" aria-label="${a}">${g}</button>`).join('')}</div>
          <div class="po-status" id="pom" aria-live="polite"></div>`, 800, 561);
        const grid = () => { let s = `<rect x="-.5" y="-.5" width="${n}" height="${n}" class="po-bg"/>`; for (let i = 0; i <= n; i++) s += `<path class="po-ln" d="M${i - .5} -.5V${n - .5}M-.5 ${i - .5}H${n - .5}"/>`;
          return s + P.bot.map(i => `<circle class="po-b" cx="${i % n}" cy="${(i / n) | 0}" r=".3"/>`).join(''); };
        $('#pobot').innerHTML = grid();
        const draw = () => { const [gx, gy] = ghost || [dx, dy], pts = cur(r, gx, gy), [w, h] = ext(r), on = pts.filter(([x, y]) => bset.has(y * n + x)).length;
          $('#potop').innerHTML = `<rect class="po-sheet${ghost ? ' moving' : ''}" x="${gx - .5}" y="${gy - .5}" width="${w + 1}" height="${h + 1}" rx=".18"/>` +
            pts.map(([x, y]) => `<path class="po-t${bset.has(y * n + x) ? ' on' : ''}" d="M${x} ${y - .26}L${x + .25} ${y + .2}H${x - .25}z"/>`).join('');
          $('#pom').innerHTML = `تنطبق <b>${XAR(on)}</b> من ${XAR(pts.length)} · الحركات <b>${XAR(moves)}</b>/${XAR(lim)}`; };
        const after = () => { draw(); if (ok()) { busy = true; $('#pob').classList.add('done'); $('#pom').innerHTML = '<b>تطابق كامل</b> · كل نجمة ذهبية فوق نجمة زرقاء.'; sfx.lvl(); later(() => pWin(api, 'pz_pobs', 'الخريطتان انطبقتا، وظهر رمز القصر بين النجوم.'), 800); return; }
          if (moves >= lim) { busy = true; api.over('خلصت الحركات. ابحث عن شكل مميز (زاوية أو خط) في الذهبية وطابقه أولًا.'); } };
        function mv(m) { if (api.ended || busy) return;
          if (m === 't') { r = (r + 1) % 4; [dx, dy] = clampXY(dx, dy); }
          else { const [x, y] = clampXY(dx + (m === 'r') - (m === 'l'), dy + (m === 'd') - (m === 'u')); if (x === dx && y === dy) { tone(200, .03); return; } dx = x; dy = y; }
          moves++; tone(500, .03); after(); }
        api.body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => mv(b.dataset.m));
        // finger drag of the transparent sheet, snapped to cells
        const svg = $('#pos'); let start = null;
        const cell = e => { const b = svg.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * n, (e.clientY - b.top) / b.height * n]; };
        svg.addEventListener('pointerdown', e => { if (api.ended || busy) return; const [cx, cy] = cell(e), [w, h] = ext(r);
          if (cx < dx - .2 || cy < dy - .2 || cx > dx + w + 1.2 || cy > dy + h + 1.2) return; e.preventDefault(); svg.setPointerCapture(e.pointerId); start = [cx, cy]; ghost = [dx, dy]; draw(); });
        // the sheet can only travel as many cells as the moves left: a drag never costs more than the budget allows
        const reach = g => { const left = lim - moves; let [x, y] = [dx, dy];
          for (let k = 0; k < left && (x !== g[0] || y !== g[1]); k++) { const ex = g[0] - x, ey = g[1] - y; if (Math.abs(ex) >= Math.abs(ey)) x += Math.sign(ex); else y += Math.sign(ey); }
          return [x, y]; };
        svg.addEventListener('pointermove', e => { if (!start) return; const [cx, cy] = cell(e); const g = reach(clampXY(Math.round(dx + cx - start[0]), Math.round(dy + cy - start[1]))); if (g[0] !== ghost[0] || g[1] !== ghost[1]) { ghost = g; tone(520, .02); draw(); } });
        const end = () => { if (!start) return; const [gx, gy] = ghost; start = null; ghost = null; const steps = Math.abs(gx - dx) + Math.abs(gy - dy);
          if (!steps || api.ended || busy) { draw(); return; } dx = gx; dy = gy; moves += steps; after(); };
        svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', () => { start = null; ghost = null; draw(); });
        $('#pob').tabIndex = 0; $('#pob').addEventListener('keydown', e => { const m = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', r: 't', ' ': 't' }[e.key]; if (m) { e.preventDefault(); mv(m); } });
        draw(); api.msg('طابق الخريطتين.');
        pzHook({ P, mv, state: () => ({ r, dx, dy, moves }), solve: () => { r = P.R; dx = P.ans[0]; dy = P.ans[1]; draw(); if (ok()) { busy = true; pWin(api, 'pz_pobs', 'الخريطتان انطبقتا.'); } } });
        // hints never leave the board solved-but-unscored: «one move left» only on a legal, unsolved neighbour of the answer
        // from which ONE pad move wins (a sheet as tall or as wide as the board has no neighbour on that axis, and
        // clamping is never allowed to pull it back onto the answer). Otherwise a descriptive hint, board untouched.
        const solvedAt = (rr, x, y) => cur(rr, x, y).every(([a, b]) => inb(a, b, n, n) && bset.has(b * n + a));
        const nearAnswer = () => [[0, -1, 'd'], [0, 1, 'u'], [1, 0, 'l'], [-1, 0, 'r']].map(([ox, oy, m]) => ({ x: P.ans[0] + ox, y: P.ans[1] + oy, m }))
          .filter(c => { const [cx, cy] = clampXY(c.x, c.y, P.R); if (cx !== c.x || cy !== c.y || solvedAt(P.R, c.x, c.y)) return false;
            const [tx, ty] = clampXY(c.x + (c.m === 'r') - (c.m === 'l'), c.y + (c.m === 'd') - (c.m === 'u'), P.R);
            return tx === P.ans[0] && ty === P.ans[1] && solvedAt(P.R, tx, ty); });
        const turnsLeft = () => (P.R - r + 4) % 4, turnTxt = t => t === 1 ? 'مرة واحدة' : t === 2 ? 'مرتين' : 'ثلاث مرات';
        const describe = () => `${turnsLeft() ? `دوّر الشفافة ${turnTxt(turnsLeft())}، ثم ` : ''}ضع زاويتها العليا على الصف ${XAR(P.ans[1] + 1)} من الأعلى والعمود ${XAR(P.ans[0] + 1)} من اليسار.`;
        return { hint: k => { if (k === 1) return 'ابدأ بالدوران: قارن شكل النجوم الذهبية بمجموعات النجوم الزرقاء، أيها يشبهها؟';
            if (busy || api.ended) return describe();
            if (k === 2) { const [x, y] = clampXY(dx, dy, P.R);
              if (!solvedAt(P.R, x, y)) { r = P.R; dx = x; dy = y; draw(); return 'دوّرت لك الشفافة للاتجاه الصحيح.'; }
              // turning in place would complete the map for the player: turn it and leave it one honest move away instead
              const c = nearAnswer()[0]; if (!c) return `الاتجاه الصحيح: دوّر الشفافة ${turnTxt(turnsLeft())}.`;
              r = P.R; dx = c.x; dy = c.y; draw(); return 'دوّرت لك الشفافة للاتجاه الصحيح، وباقي خطوة واحدة.'; }
            const c = nearAnswer()[0]; if (!c) return describe();
            r = P.R; dx = c.x; dy = c.y; draw(); return 'قرّبت لك الشفافة: باقي خطوة واحدة.'; },
          reveal: () => { r = P.R; dx = P.ans[0]; dy = P.ans[1]; draw(); return 'هذا الانطباق.'; } };
      });
    };
  }

  /* ================================================================ the statue hall (shared by pz_door and pz_pliar)
     opt: { D doors, labels[d], k statues, names[i], plaque(i) html, plaqueText(i), key: bool, busy() }
     dir[i]: -1 neutral (start) · 0..D-1 faces that door · D turned away.  One tap or one arrow = one step. */
  function hall(api, opt) {
    const D = opt.D, k = opt.k, BACK = D, dir = Array(k).fill(-1); let keyAt = -1;
    const el = document.createElement('div'); el.className = 'pl-hall';
    el.innerHTML = `${opt.key ? `<div class="pl-tray" data-tray="key"><button class="mk-tok pl-key" data-tok="key" aria-label="المفتاح">${img('key')}</button><span>المفتاح</span></div>` : ''}
      <div class="pl-doors" style="--d:${D}">${[...Array(D)].map((_, d) => `<div class="pl-door" data-slot="d${d}" data-door="${d}" tabindex="${opt.key ? 0 : -1}" aria-label="الباب ${opt.labels[d]}">
        ${img('door_closed', 'pl-dimg')}${badge(opt.labels[d], 'sm')}<i class="pl-lock">${img('padlock')}</i><span class="pl-keyspot"></span></div>`).join('')}</div>
      <div class="pl-statues">${[...Array(k)].map((_, i) => `<div class="pl-st" data-st="${i}">
        <div class="pl-sthead"><b>${opt.names[i]}</b><span class="pl-face" aria-live="polite">محايد</span></div>
        <button class="pl-turn" data-turn="${i}"><img class="pl-pose" src="${statueAsset('statue_front')}" alt="" draggable="false"></button>
        <div class="pl-strow"><button class="pl-rot" data-rot="${i}" data-by="1" aria-label="دوّر إلى الباب التالي">↻</button><button class="pl-rot" data-rot="${i}" data-by="-1" aria-label="دوّر إلى الباب السابق">↺</button></div>
        <div class="pl-plaque" role="note" data-k="${opt.kind ? opt.kind(i) : ''}" aria-label="${opt.plaqueText(i)}">${opt.plaque(i)}</div></div>`).join('')}</div>`;
    const doorEl = d => el.querySelector(`.pl-door[data-door="${d}"]`);
    // which way the statue has to look (front / left / right) for the door it faces, from the real layout
    const pose = i => { const d = dir[i]; if (d < 0) return 'statue_front'; if (d === BACK) return 'statue_back';
      const s = el.querySelector(`.pl-st[data-st="${i}"] .pl-turn`).getBoundingClientRect(), b = doorEl(d).getBoundingClientRect();
      if (!s.width || !b.width) return 'statue_front'; const dx = (b.left + b.width / 2) - (s.left + s.width / 2);
      return Math.abs(dx) < Math.max(28, b.width * .55) ? 'statue_front' : dx < 0 ? 'statue_side_right' : 'statue_side_left'; };  // art names are the statue's own side: side_left looks to the screen's right
    const paint = () => {
      dir.forEach((d, i) => { const c = el.querySelector(`.pl-st[data-st="${i}"]`); c.classList.toggle('neutral', d < 0); c.classList.toggle('back', d === BACK); c.classList.toggle('faces', d >= 0 && d < BACK);
        c.querySelector('.pl-pose').src = statueAsset(pose(i));
        const t = d < 0 ? 'محايد' : d === BACK ? 'يدير ظهره' : `يواجه ${opt.labels[d]}`; c.querySelector('.pl-face').textContent = t;
        c.querySelector('.pl-turn').setAttribute('aria-label', `${opt.names[i]}: ${t}. المس للتدوير.`); });
      for (let d = 0; d < D; d++) { const e = doorEl(d); e.classList.toggle('faced', dir.includes(d)); e.classList.toggle('haskey', keyAt === d);
        e.querySelector('.pl-keyspot').innerHTML = keyAt === d ? `<button class="mk-tok pl-key on" data-tok="key" aria-label="المفتاح على الباب ${opt.labels[d]}">${img('key')}</button>` : ''; }
      const tray = el.querySelector('.pl-tray'); if (tray) { tray.querySelector('.pl-key').style.visibility = keyAt < 0 ? '' : 'hidden'; tray.classList.toggle('empty', keyAt >= 0); }
    };
    const turn = (i, by) => {
      if (api.ended || opt.busy()) return;
      const cur = dir[i];
      dir[i] = cur < 0 ? (by > 0 ? 0 : BACK) : (cur + by + D + 1) % (D + 1);
      tone(460 + (dir[i] % 6) * 45, .04);
      paint();
      const statue = el.querySelector(`.pl-st[data-st="${i}"] .pl-pose`);
      if (statue.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        statue.getAnimations?.().forEach(animation => animation.cancel());
        statue.animate([
          { transform: `perspective(400px) rotateY(${-by * 62}deg)` },
          { transform: 'perspective(400px) rotateY(0deg)' }
        ], { duration: 290, easing: 'cubic-bezier(.2,.6,.3,1)' });
      }
    };
    // tap = one step; horizontal swipe on the statue turns it towards that side
    let sw = null;
    el.addEventListener('pointerdown', e => { const t = e.target.closest('.pl-turn'); if (t) sw = { x: e.clientX, i: +t.dataset.turn, id: e.pointerId }; });
    el.addEventListener('pointerup', e => { const s = sw; sw = null; if (!s || s.id !== e.pointerId) return; const dx = e.clientX - s.x;
      if (Math.abs(dx) > 26) { el.dataset.swiped = '1'; setTimeout(() => delete el.dataset.swiped, 60); turn(s.i, dx < 0 ? 1 : -1); } });
    el.addEventListener('pointercancel', () => { sw = null; });
    el.addEventListener('click', e => { const t = e.target.closest('[data-turn]'), r = e.target.closest('[data-rot]');
      if (t) { if (el.dataset.swiped) return; turn(+t.dataset.turn, 1); } else if (r) turn(+r.dataset.rot, +r.dataset.by); });
    if (opt.key) MK.attach(el, { canDrag: () => !api.ended && !opt.busy(), drop: (tok, slot) => { keyAt = slot ? +slot.slice(1) : -1; sfx.pop(); paint(); } });
    const onResize = () => { if (el.isConnected) paint(); else removeEventListener('resize', onResize); };
    addEventListener('resize', onResize, { passive: true });
    // perf-cleanup F: also drop it when the run ends — the self-removal above only happened on a later resize, so
    // every closed statue board (≈230 nodes + its listeners) stayed alive until the phone rotated.
    if (typeof cleanup !== 'undefined' && Array.isArray(cleanup)) cleanup.push(() => removeEventListener('resize', onResize));
    return { el, dir, BACK, paint, turn, get keyAt() { return keyAt; }, setKey: d => { keyAt = d; paint(); }, set: (a, kk) => { a.forEach((v, i) => dir[i] = v); if (kk != null) keyAt = kk; paint(); }, doorEl };
  }

  /* ---------------------------------------------------------------- pz_door pictograms (8 inscriptions, 6 rules) */
  const gem = img('treasure_gem', 'pl-ic', 'الكنز'), arrow = img('clue_arrow', 'pl-ic arr', 'عند'), stop = img('clue_prohibit', 'pl-ic', 'ليس عند');
  const statueMini = (lab, ok) => `<span class="pl-smini">${img('statue_front', 'pl-ic st')}${badge(lab, 'xs')}${ok ? TICK : CROSS}</span>`;
  const sideRow = (s, n) => `<span class="pl-range" aria-hidden="true">${[...Array(n)].map((_, d) => `<i class="${d === s.d ? 'ref' : (s.x < s.d ? d < s.d : d > s.d) ? 'in' : ''}">${d === s.d ? `<img src="${ART}badge_${d + 1}.png" alt="">` : ''}</i>`).join('')}</span>`;
  const drPlaque = (s, n) => { switch (s.k) {
    case 'here': return gem + arrow + badge(AR[s.d], 'self');            case 'at': return gem + arrow + badge(AR[s.x]);
    case 'nothere': return gem + stop + badge(AR[s.d], 'self');          case 'notat': return gem + stop + badge(AR[s.x]);
    case 'side': return gem + sideRow(s, n);                              case 'either': return gem + arrow + badge(AR[s.x]) + '<i class="pl-or">/</i>' + badge(AR[s.y]);
    case 'liar': return statueMini(AR[s.x], false);                      case 'true': return statueMini(AR[s.x], true); } return ''; };
  const drSay = s => { switch (s.k) {
    case 'here': return 'الكنز عند هذا الباب'; case 'at': return `الكنز عند الباب ${AR[s.x]}`; case 'nothere': return 'الكنز ليس عند هذا الباب'; case 'notat': return `الكنز ليس عند الباب ${AR[s.x]}`;
    case 'side': return s.x < s.d ? `الكنز عند باب قبل الباب ${AR[s.d]}` : `الكنز عند باب بعد الباب ${AR[s.d]}`; case 'either': return `الكنز عند الباب ${AR[s.x]} أو ${AR[s.y]}`;
    case 'liar': return `التمثال ${AR[s.x]} كاذب`; case 'true': return `التمثال ${AR[s.x]} صادق`; } return ''; };
  const countB = (c, ok) => `<span class="pl-count">${badge(['٠', '١', '٢'][c], 'cnt')}${ok ? TICK : CROSS}</span>`;
  const trapGroup = all => `<span class="pl-traps">${img('door_closed', 'pl-ic dr')}${img('door_closed', 'pl-ic dr')}${CROSS}<small>${all ? 'الكل' : '١ على الأقل'}</small></span>`;
  const RULE_PIC = {
    one: [countB(1, true), 'لافتة واحدة فقط صادقة'], onef: [countB(1, false), 'لافتة واحدة فقط كاذبة'], two: [countB(2, true), 'لافتتان فقط صادقتان'], none: [countB(0, true), 'لا صادق: كل اللافتات كاذبة'],
    lady: [`<span class="pl-count">${gem}${TICK}</span>${trapGroup(true)}`, 'لافتة باب الكنز صادقة، ولافتات أبواب الفخ كلها كاذبة'],
    mix: [`<span class="pl-count">${gem}${TICK}</span>${trapGroup(false)}`, 'لافتة باب الكنز صادقة، ولافتة باب فخ واحد على الأقل كاذبة'] };
  const KEY_ROWS = [[gem + arrow + badge('٣'), 'الكنز عند الباب ٣'], [gem + stop + badge('٣'), 'الكنز ليس عند الباب ٣'], [`<span class="pl-range"><i class="in"></i><i class="ref"><img src="${ART}badge_3.png" alt=""></i><i></i></span>`, 'الكنز في أحد الأبواب المضيئة (قبل الباب المرجعي أو بعده)'],
    [badge('٢') + '<i class="pl-or">/</i>' + badge('٤'), 'أحد البابين'], [statueMini('٢', true), 'التمثال ٢ صادق'], [statueMini('٢', false), 'التمثال ٢ كاذب'], [badge('٣', 'self'), 'رقم بإطار ذهبي: باب هذا التمثال نفسه']];

  /* a door board from drMake: rule strip + key + doors + statues */
  function doorBoard(api, P, busy) {
    const n = P.n, rp = RULE_PIC[P.rule.id];
    const h = hall(api, { D: n, k: n, key: true, labels: AR, names: AR.slice(0, n).map(a => `تمثال ${a}`), busy,
      plaque: i => drPlaque(P.st[i], n), plaqueText: i => drSay(P.st[i]), kind: i => P.st[i].k });
    const wrap = document.createElement('div'); wrap.className = 'pl-board';
    wrap.innerHTML = `<div class="pl-rule" role="note" data-rule="${P.rule.id}" aria-label="القاعدة: ${rp[1]}"><span class="pl-rpic">${rp[0]}</span><small>${rp[1]}</small></div>`;
    wrap.append(h.el);
    const key = document.createElement('details'); key.className = 'pl-legend'; key.innerHTML = `<summary>مفتاح الرموز</summary><ul>${KEY_ROWS.map(([p, t]) => `<li><span>${p}</span>${t}</li>`).join('')}<li><span>${img('statue_front', 'pl-ic st')}</span>الصادق يواجه باب المفتاح</li><li><span>${img('statue_back', 'pl-ic st')}</span>الكاذب يدير ظهره</li></ul>`;
    wrap.append(key);
    const target = t => drVals(P, t).map(v => v ? t : h.BACK);
    // the only place the answer is evaluated: after the player commits
    const check = () => { const t = h.keyAt; if (t < 0) return { ok: false, why: 'nokey' }; if (h.dir.some(d => d < 0)) return { ok: false, why: 'neutral' };
      const ruleOk = P.rule.ok(drVals(P, t), t), tg = target(t), off = h.dir.filter((d, i) => d !== tg[i]).length;
      return { ok: ruleOk && off === 0, ruleOk, off }; };
    return { el: wrap, h, check, target, solve: () => h.set(target(P.t), P.t) };
  }
  const why = (P, t) => { const v = drVals(P, t); return P.st.map((_, i) => `${AR[i]} ${v[i] ? 'صادق' : 'كاذب'}`).join('، '); };
  const openDoor = (h, d) => { const e = h.doorEl(d); e.querySelector('.pl-dimg').src = ART + 'door_open.png'; e.classList.add('open'); };

  /* ================================================================ pz_door — أبواب القصر */
  if (GM.pz_door && typeof drMake === 'function' && typeof drVals === 'function') {
    GM.pz_door.run = function runDoorsMotion() {
      return pzPlay('pz_door', api => {
        const P = drMake(api.lv), n = P.n, elim = new Set(); let busy = false, miss = 0;
        api.body.innerHTML = `<p class="mk-lead pl-lead">خلف باب واحد كنز، والباقي فخاخ. ضع المفتاح على باب، ودوّر كل تمثال: <b>الصادق</b> يواجه باب المفتاح، و<b>الكاذب</b> يدير ظهره. ثم ثبّت.</p><div id="plhost"></div><div class="xkbtns"><button class="go-btn xsm" id="plgo">ثبّت الاتجاهات</button></div>`;
        const B = doorBoard(api, P, () => busy); $('#plhost').append(B.el); B.h.paint();
        const go = () => { if (api.ended || busy) return; const r = B.check();
          if (r.why === 'nokey') { api.msg('ضع المفتاح على الباب الذي تفترض أن الكنز خلفه.'); const t = B.el.querySelector('.pl-tray'); t.classList.add('xbnudge'); later(() => t.classList.remove('xbnudge'), 400); return; }
          if (r.why === 'neutral') { api.msg('دوّر كل التماثيل أولًا: كل تمثال يواجه بابًا أو يدير ظهره.'); return; }
          if (r.ok) { busy = true; openDoor(B.h, P.t); sfx.lvl(); later(() => api.win(`الكنز خلف الباب ${AR[P.t]}. لو كان هناك: ${why(P, P.t)}، وهذا يطابق القاعدة.`), 700); return; }
          miss++; api.wrong();
          if (miss >= 3) { busy = true; B.solve(); openDoor(B.h, P.t); api.over(`الكنز كان خلف الباب ${AR[P.t]}: ${why(P, P.t)}.`); return; }
          api.msg(!r.ruleOk ? `لو كان الكنز خلف الباب ${AR[B.h.keyAt]}: ${why(P, B.h.keyAt)}، وهذا لا يطابق القاعدة.` : `مع المفتاح عند الباب ${AR[B.h.keyAt]}: ${XAR(r.off)} ${r.off === 1 ? 'تمثال لا يطابق' : 'تماثيل لا تطابق'} صدق نقشه.`); };
        $('#plgo').onclick = go; api.msg('ضع المفتاح، ودوّر التماثيل.');
        pzHook({ P, key: d => B.h.setKey(d), set: B.solve, setDirs: (a, kk) => B.h.set(a, kk), check: go, target: B.target, state: () => ({ keyAt: B.h.keyAt, dir: B.h.dir.slice() }) });
        return { hint: kk => { if (kk === 1) return 'افترض أن الكنز خلف باب: ضع المفتاح عليه، وانظر أي النقوش تصير صادقة. يجب أن يطابق عددها القاعدة.';
            const c = [...Array(n).keys()].filter(i => i !== P.t && !elim.has(i)); if (!c.length) return null; const i = pick(c); elim.add(i); B.h.doorEl(i).classList.add('ruled');
            return `الكنز ليس خلف الباب ${AR[i]}: لو كان هناك (${why(P, i)}) لما طابق القاعدة.`; },
          reveal: () => { B.solve(); return `الكنز كان خلف الباب ${AR[P.t]}.`; } };
      });
    };
  }

  /* ================================================================ pz_pliar — قاعة الأبواب ثم التماثيل المتكلمة
     The entrance is a drMake board (same pictures, key and statues). Passing it records nothing. The main hall is the
     original pqMake(lv) round; only its correct directions call pWin, once. */
  if (GM.pz_pliar && typeof pqMake === 'function') {
    const who = a => `<span class="pl-smini">${img('statue_front', 'pl-ic st')}${badge(AR[a], 'xs')}</span>`;
    const pqPlaque = (s, LBL) => { switch (s.t) {
      case 'door': return gem + arrow + badge(LBL[s.k]); case 'ndoor': return gem + stop + badge(LBL[s.k]);
      case 'truth': return statueMini(AR[s.a], true); case 'liar': return statueMini(AR[s.a], false);
      case 'cnt': return `<span class="pl-count">${badge(AR[s.k - 1], 'cnt')}${img('statue_back', 'pl-ic st')}${CROSS}</span>`;
      case 'same': return who(s.a) + '<i class="pl-eq">=</i>' + who(s.b); } return ''; };
    const pqSay = (s, LBL) => { switch (s.t) {
      case 'door': return `الطريق من الباب ${LBL[s.k]}`; case 'ndoor': return `لا تدخل الباب ${LBL[s.k]}`; case 'truth': return `التمثال ${AR[s.a]} صادق`; case 'liar': return `التمثال ${AR[s.a]} كاذب`;
      case 'cnt': return `بيننا ${s.k === 1 ? 'كاذب واحد' : XAR(s.k) + ' كذابين'} بالضبط`; case 'same': return `التمثالان ${AR[s.a]} و${AR[s.b]} من النوع نفسه`; } return ''; };
    const PQ_KEY = [[gem + arrow + badge('ب'), 'الطريق من الباب ب'], [gem + stop + badge('ب'), 'لا تدخل الباب ب'], [statueMini('٢', true), 'التمثال ٢ صادق'], [statueMini('٢', false), 'التمثال ٢ كاذب'],
      [`<span class="pl-count">${badge('٢', 'cnt')}${img('statue_back', 'pl-ic st')}${CROSS}</span>`, 'عدد الكذابين بالضبط'], [who(0) + '<i class="pl-eq">=</i>' + who(2), 'التمثالان من النوع نفسه: صادقان معًا أو كاذبان معًا']];
    GM.pz_pliar.run = function runPLiarMotion() {
      return pzPlay('pz_pliar', api => {
        const lvl = api.lv, I = drMake(Math.min(4, lvl)), P = pqMake(lvl), D = P.D, LBL = LET.slice(0, D);
        let round = 0, miss = 0, busy = false, B = null, H = null;
        const target2 = P.sol.tr.map(t => t ? P.sol.door : D);
        api.body.innerHTML = xSheet(`${xHead(img('statue_front', 'pl-hicon'), 'التماثيل المتكلمة')}
          <div class="pl-stage"><span class="pl-chip" id="plround">المدخل · قاعة الأبواب</span><span class="pl-chip ghost" id="plstep">١ من ٢</span></div>
          <p class="mk-lead pl-lead" id="pllead"></p><div id="plhost"></div>
          <div class="xkbtns"><button class="go-btn xsm" id="plgo">ثبّت الاتجاهات</button></div>`, 860, 311);
        const mount = () => { const host = $('#plhost'); host.innerHTML = '';
          if (round === 0) { B = doorBoard(api, I, () => busy); host.append(B.el); B.h.paint(); H = B.h;
            $('#pllead').innerHTML = 'ضع المفتاح على باب، ودوّر كل تمثال: <b>الصادق</b> يواجه باب المفتاح، و<b>الكاذب</b> يدير ظهره.'; }
          else { B = null; H = hall(api, { D, k: P.k, key: false, labels: LBL, names: AR.slice(0, P.k).map(a => `تمثال ${a}`), busy: () => busy,
              plaque: i => pqPlaque(P.sts[i], LBL), plaqueText: i => pqSay(P.sts[i], LBL), kind: i => P.sts[i].t });
            const legend = document.createElement('details'); legend.className = 'pl-legend'; legend.innerHTML = `<summary>مفتاح الرموز</summary><ul>${PQ_KEY.map(([p, t]) => `<li><span>${p}</span>${t}</li>`).join('')}</ul>`;
            host.append(H.el, legend); H.paint();
            $('#pllead').innerHTML = 'كل تمثال صادق دائمًا أو كاذب دائمًا. <b>الصادقون</b> يواجهون باب الطريق، و<b>الكاذبون</b> يديرون ظهورهم.'; }
          $('#plround').textContent = round === 0 ? 'المدخل · قاعة الأبواب' : 'القاعة الكبرى'; $('#plstep').textContent = round === 0 ? '١ من ٢' : '٢ من ٢'; };
        const go = () => { if (api.ended || busy) return;
          if (round === 0) { const r = B.check();
            if (r.why === 'nokey') { api.msg('ضع المفتاح على الباب الذي تفترض أن الطريق خلفه.'); return; } if (r.why === 'neutral') { api.msg('دوّر كل التماثيل أولًا.'); return; }
            if (r.ok) { busy = true; sfx.ok(2); openDoor(B.h, I.t); later(() => { busy = false; round = 1; mount(); api.msg('انفتح المدخل. في القاعة الكبرى تتكلم التماثيل عن بعضها أيضًا.'); }, 800); return; }
            miss++; api.wrong(); if (miss >= 3) { busy = true; B.solve(); api.over('هذا اتجاه التماثيل الصحيح في المدخل.'); return; }
            api.msg(!r.ruleOk ? `لو كان الطريق خلف الباب ${AR[B.h.keyAt]} لما طابقت النقوش القاعدة.` : `${XAR(r.off)} ${r.off === 1 ? 'تمثال لا يطابق' : 'تماثيل لا تطابق'} صدق نقشه.`); return; }
          if (H.dir.some(d => d < 0)) { api.msg('دوّر كل التماثيل أولًا.'); return; }
          if (H.dir.every((v, i) => v === target2[i])) { busy = true; sfx.ok(3); openDoor(H, P.sol.door); later(() => pWin(api, 'pz_pliar', 'عرفت الكذابين، وفتحت الباب الصحيح.'), 600); return; }
          miss++; api.wrong(); if (miss >= 3) { busy = true; H.set(target2); api.over('هذا هو الحل الصحيح.'); return; }
          const faced = new Set(H.dir.filter(v => v < D)); api.msg(faced.size > 1 ? 'الصادقون يواجهون بابًا واحدًا: اتجاهاتهم مختلفة الآن.' : 'الاتجاهات لا تحقق النقوش معًا.'); };
        mount(); $('#plgo').onclick = go; api.msg('من الصادق؟ ومن الكاذب؟');
        pzHook({ P, I, round: () => round, set: () => round === 0 ? B.solve() : H.set(target2), enter: go, check: go, key: d => H.setKey(d), setDirs: (a, kk) => H.set(a, kk), state: () => ({ round, dir: H.dir.slice(), keyAt: H.keyAt }) });
        return { hint: kk => { if (kk === 1) return 'افترض أن تمثالًا صادق، وتابع ما يلزم من نقشه. إذا وصلت لتناقض، فهو كاذب.';
            if (round === 0) { const c = [...Array(I.n).keys()].filter(i => i !== I.t); const i = pick(c); H.doorEl(i).classList.add('ruled'); return `الطريق ليس خلف الباب ${AR[i]}.`; }
            const i = target2.findIndex((v, j) => v === D && H.dir[j] !== D); if (kk === 2 && i >= 0) { H.set(H.dir.map((x, j) => j === i ? D : x)); return `أدرت لك ظهر التمثال ${AR[i]}: هو كاذب.`; }
            return `الطريق من الباب ${LBL[P.sol.door]}.`; },
          reveal: () => { round === 0 ? B.solve() : H.set(target2); return 'هذا الحل.'; } };
      });
    };
  }
  window.PALACE_MOTION = { drPlaque, RULE_PIC };
})();
