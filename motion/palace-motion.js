/* motion-batch-1 — «الأبواب والتماثيل»: the read-and-pick door puzzles rebuilt as statues you turn.
   Every statue is turned with a tap (or its two arrows): towards one of the doors, or with its back to the hall.
   A truthful statue faces the door that hides the way; a lying statue turns its back. What each statue says is
   carved as a pictogram plaque, not a sentence. The answer is read from all the statues' directions together.
   pz_door  — one hall of statues (generated per level, exactly one consistent answer).
   pz_pliar — the door hall first, then the talking statues (same generator pqMake, same rules), then pWin.
   Ids, levels, palace progress (pWin) and saves are unchanged. */
(function () {
  'use strict';
  if (!window.MK || typeof GM === 'undefined' || typeof pzPlay !== 'function') return;
  const { icon } = MK;
  const STATUE = 'treasure/art/story5/ch2_s3_piece_bird_statue.webp';
  const DOOR_SVG = c => `<svg viewBox="0 0 40 50" aria-hidden="true"><path d="M4 48V18q0-14 16-14t16 14v30z" fill="${c}" stroke="#3A2616" stroke-width="1.6"/><path d="M20 4v44" stroke="#3A2616" stroke-width="1.2" opacity=".5"/><circle cx="15" cy="29" r="1.6" fill="#F2C553"/><circle cx="25" cy="29" r="1.6" fill="#F2C553"/></svg>`;
  const DCOL = ['#C9493B', '#3F7CC0', '#5E9550', '#D99A1E', '#8E5F8E'];   // the door colours of the original card
  const DOOR = c => (typeof SPR !== 'undefined' && SPR.door) ? SPR.door(c) : DOOR_SVG(c);  // approved door art first
  const DNAME = ['الأيمن', 'الأوسط', 'الأيسر', 'البعيد'];
  const MASK = '<path d="M8 14q12-8 24 0v6q-12 12-24 0z"/><path d="M14 18h4M22 18h4"/>';
  const doorMini = d => `<span class="pm-door" style="--c:${DCOL[d]}">${DOOR(DCOL[d])}<b>${['١', '٢', '٣', '٤', '٥'][d]}</b></span>`;

  /* ---------------------------------------------------------- the hall: statues + doors + beams */
  function hall(api, opt) {
    // opt: { D, k, names[], plaque(i) html, solved(dir[]) -> bool, onWin(), title, lead }
    const D = opt.D, k = opt.k, dir = Array(k).fill(D);   // D = turned away
    const wrap = document.createElement('div'); wrap.className = 'pm-hall';
    wrap.innerHTML = `<div class="pm-doors" style="--d:${D}">${[...Array(D)].map((_, d) => `<div class="pm-dw" data-door="${d}">${DOOR(DCOL[d])}<small>${['١', '٢', '٣', '٤', '٥'][d]}</small></div>`).join('')}</div>
      <svg class="pm-beams" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="pm-statues" style="--k:${k}">${[...Array(k)].map((_, i) => `<div class="pm-st" data-st="${i}">
        <button class="pm-turn" data-turn="${i}" aria-label="دوّر ${opt.names[i]}"><img alt="" src="${STATUE}"><i class="pm-face"></i></button>
        <div class="pm-arrows"><button data-rot="${i}" data-by="-1" aria-label="دوّر لليمين">↻</button><button data-rot="${i}" data-by="1" aria-label="دوّر لليسار">↺</button></div>
        <b>${opt.names[i]}</b><div class="pm-plaque">${opt.plaque(i)}</div></div>`).join('')}</div>`;
    const paint = () => {
      const beams = wrap.querySelector('.pm-beams'); let s = '';
      dir.forEach((d, i) => { const rtl = getComputedStyle(wrap).direction === 'rtl', X = v => rtl ? 100 - v : v; const x1 = X((i + .5) * 100 / k); if (d < D) { const x2 = X((d + .5) * 100 / D); s += `<path d="M${x1} 40L${x2} 0" stroke="#F2C553" stroke-width="2.2" vector-effect="non-scaling-stroke" opacity=".9"/>`; } });
      beams.innerHTML = s;
      wrap.querySelectorAll('.pm-st').forEach(e => { const i = +e.dataset.st, d = dir[i]; e.classList.toggle('away', d === D);
        const rs = getComputedStyle(wrap).direction === 'rtl' ? -1 : 1, x1 = (i + .5) / k, x2 = d < D ? (d + .5) / D : x1; e.querySelector('.pm-turn img').style.transform = d === D ? 'scaleX(-1) rotate(0deg)' : `rotate(${Math.max(-40, Math.min(40, (x2 - x1) * 90))}deg)`;
        e.querySelector('.pm-face').textContent = d === D ? 'ظهره' : `← ${['١', '٢', '٣', '٤', '٥'][d]}`;
        e.querySelector('.pm-turn').setAttribute('aria-label', `${opt.names[i]}: ${d === D ? 'يدير ظهره' : 'يواجه الباب ' + (d + 1)}. اضغط لتدويره.`); });
      wrap.querySelectorAll('.pm-dw').forEach(e => e.classList.toggle('lit', dir.some(x => x === +e.dataset.door)));
    };
    const turn = (i, by) => { if (api.ended) return; dir[i] = (dir[i] + by + D + 1) % (D + 1); tone(480 + dir[i] * 40, .04); paint(); };
    wrap.addEventListener('click', e => { const t = e.target.closest('[data-turn]'), r = e.target.closest('[data-rot]'); if (t) turn(+t.dataset.turn, 1); else if (r) turn(+r.dataset.rot, +r.dataset.by); });
    // a horizontal swipe on a statue turns it too
    let sx = null; wrap.addEventListener('pointerdown', e => { if (e.target.closest('.pm-turn')) sx = [e.clientX, +e.target.closest('.pm-st').dataset.st]; });
    wrap.addEventListener('pointerup', e => { if (!sx) return; const dx = e.clientX - sx[0], i = sx[1]; sx = null; if (Math.abs(dx) > 26) { e.preventDefault(); turn(i, dx < 0 ? 1 : -1); wrap.dataset.swiped = '1'; setTimeout(() => delete wrap.dataset.swiped, 50); } });
    wrap.addEventListener('click', e => { if (wrap.dataset.swiped && e.target.closest('[data-turn]')) e.stopImmediatePropagation(); }, true);
    paint();
    return { el: wrap, dir, paint, set: a => { a.forEach((v, i) => dir[i] = v); paint(); } };
  }
  const plaqueDoor = (yes, d) => `<span class="pm-pq ${yes ? 'yes' : 'no'}">${yes ? '<i>➜</i>' : '<i>⊘</i>'}${doorMini(d)}</span>`;

  /* ---------------------------------------------------------- generator: a hall of door inscriptions */
  const DS_LV = [[3, 3, 1], [3, 3, 1], [3, 3, 1], [3, 4, 1], [4, 4, 1], [4, 4, 2], [4, 5, 1], [4, 5, 2]];
  function dsMake(lv) {
    const [D, k, L] = DS_LV[lv - 1];
    for (let t = 0; t < 2000; t++) {
      const ins = [...Array(k)].map(() => ({ yes: Math.random() < .55, d: rnd(D) }));
      const sols = [];
      for (let d = 0; d < D; d++) for (let m = 0; m < 1 << k; m++) { const liars = [...Array(k)].map((_, i) => !!(m >> i & 1)); if (liars.filter(Boolean).length !== L) continue;
        if (ins.every((s, i) => ((s.yes ? d === s.d : d !== s.d)) === !liars[i])) sols.push({ door: d, liars }); }
      if (sols.length === 1) return { D, k, L, ins, sol: sols[0] };
    }
    return dsMake(Math.max(1, lv - 1));
  }
  const solvedBy = (sol, D) => sol.liars.map(l => l ? D : sol.door);
  const NAMES = ['النسر', 'الصقر', 'الهدهد', 'البوم', 'الغراب'];

  function doorRound(api, P, onWin, msgWin) {
    const h = hall(api, { D: P.D, k: P.k, names: NAMES, plaque: i => plaqueDoor(P.ins[i].yes, P.ins[i].d) });
    const target = solvedBy(P.sol, P.D);
    const check = () => h.dir.every((v, i) => v === target[i]);
    return { h, target, check, onWin, msgWin };
  }

  /* ================================================================ pz_door — one hall */
  if (GM.pz_door) {
    GM.pz_door.run = function runDoorsMotion() {
      return pzPlay('pz_door', api => {
        const P = dsMake(api.lv); let miss = 0, busy = false;
        api.body.innerHTML = `<div class="pm-rules">${icon('<circle cx="20" cy="20" r="12"/><path d="M20 8v24M8 20h24" opacity=".4"/>')}<p>دوّر كل تمثال: <b>الصادق</b> يواجه باب الطريق، و<b>الكاذب</b> يدير ظهره. ${P.L === 1 ? 'بينها كاذب واحد.' : `بينها ${XAR(P.L)} كاذبان.`}<br><span class="pm-key"><span class="pm-pq yes"><i>➜</i>باب</span> «الطريق من هنا» · <span class="pm-pq no"><i>⊘</i>باب</span> «ليس من هنا»</span></p></div><div id="pmhost"></div><div class="xkbtns"><button class="go-btn xsm" id="pmgo">افتح الباب</button></div>`;
        const R = doorRound(api, P); $('#pmhost').append(R.h.el);
        const go = () => { if (api.ended || busy) return; if (R.check()) { busy = true; sfx.lvl(); api.body.querySelector(`.pm-dw[data-door="${P.sol.door}"]`).classList.add('open'); later(() => api.win(`انفتح الباب ${XAR(P.sol.door + 1)}: الصادقون أشاروا إليه، والكاذب أدار ظهره.`), 650); return; }
          miss++; api.wrong(); if (miss >= 3) { busy = true; R.h.set(R.target); api.over(`الطريق كان من الباب ${XAR(P.sol.door + 1)}.`); return; }
          const pointed = new Set(R.h.dir.filter(v => v < P.D)); api.msg(pointed.size > 1 ? 'الصادقون يشيرون إلى باب واحد: اتجاهاتهم مختلفة الآن.' : 'اتجاهات التماثيل لا تحقق نقوشها معًا. جرّب افتراضًا آخر.'); };
        $('#pmgo').onclick = go; api.msg('دوّر التماثيل حتى تتفق مع نقوشها.');
        pzHook({ P, set: () => R.h.set(R.target), check: go, turn: (i, v) => { R.h.dir[i] = v; R.h.paint(); } });
        return { hint: kk => { if (kk === 1) return 'افترض أن الطريق خلف باب، ثم انظر أي النقوش تصير صادقة: يجب أن يكون عدد الكاذبين كما في القاعدة.';
            if (kk === 2) { const i = P.sol.liars.indexOf(true); R.h.dir[i] = P.D; R.h.paint(); return `أدرت لك ظهر ${NAMES[i]}: هو كاذب.`; }
            return `الطريق من الباب ${XAR(P.sol.door + 1)}.`; },
          reveal: () => { R.h.set(R.target); return `الباب ${XAR(P.sol.door + 1)}.`; } };
      });
    };
  }

  /* ================================================================ pz_pliar — door hall, then the talking statues */
  if (GM.pz_pliar && typeof pqMake === 'function') {
    const PQN_ = typeof PQN !== 'undefined' ? PQN : ['الأسد', 'النسر', 'الحوت', 'التنين', 'الحصان'];
    const who = a => `<span class="pm-who">${a + 1}</span>`;
    const pqPlaque = s => { switch (s.t) {
      case 'door': return plaqueDoor(true, s.k); case 'ndoor': return plaqueDoor(false, s.k);
      case 'truth': return `<span class="pm-pq yes">${who(s.a)}<i>✓</i></span>`; case 'liar': return `<span class="pm-pq no">${who(s.a)}<i>✗</i></span>`;
      case 'cnt': return `<span class="pm-pq cnt">${[...Array(s.k)].map(() => `<i class="m">${icon(MASK)}</i>`).join('')}<small>${s.k === 1 ? 'كاذب واحد' : XAR(s.k) + ' كذابين'}</small></span>`;
      case 'same': return `<span class="pm-pq same">${who(s.a)}<i>=</i>${who(s.b)}</span>`; } return ''; };
    GM.pz_pliar.run = function runPLiarMotion() {
      return pzPlay('pz_pliar', api => {
        const lvl = api.lv, I = dsMake(Math.max(1, Math.min(4, lvl - 1))), P = pqMake(lvl), D = P.D; let round = 0, miss = 0, busy = false, R = null;
        const target2 = P.sol.tr.map(t => t ? P.sol.door : D);
        api.body.innerHTML = xSheet(`${xHead(XS_.giant.replace('viewBox="0 0 60 70"', 'viewBox="0 0 60 70" width="30"'), 'التماثيل المتكلمة')}
          <div class="pm-rules"><p><b id="pmround">المدخل · قاعة الأبواب</b><br>دوّر كل تمثال: <b>الصادق</b> يواجه باب الطريق، و<b>الكاذب</b> يدير ظهره.</p>
          <span class="pm-key"><span class="pm-pq yes"><i>➜</i>باب</span> الطريق من هنا · <span class="pm-pq no"><i>⊘</i>باب</span> ليس من هنا · <span class="pm-pq yes"><span class="pm-who">٢</span><i>✓</i></span> التمثال ٢ صادق · <span class="pm-pq no"><span class="pm-who">٢</span><i>✗</i></span> كاذب · <span class="pm-pq same"><span class="pm-who">١</span><i>=</i><span class="pm-who">٣</span></span> من النوع نفسه</span></div>
          <div id="pmhost"></div><div class="xkbtns"><button class="go-btn xsm" id="pmgo">افتح الباب</button></div>`, 860, 311);
        const mount = () => {
          const host = $('#pmhost'); host.innerHTML = '';
          if (round === 0) { R = doorRound(api, I); R.D = I.D; }
          else { const h = hall(api, { D, k: P.k, names: PQN_.slice(0, P.k).map((n, i) => `${XAR(i + 1)} · ${n}`), plaque: i => pqPlaque(P.sts[i]) }); R = { h, target: target2, check: () => h.dir.every((v, i) => v === target2[i]), D }; }
          host.append(R.h.el); $('#pmround').textContent = round === 0 ? 'المدخل · قاعة الأبواب' : 'القاعة الكبرى · التماثيل المتكلمة';
        };
        const go = () => { if (api.ended || busy) return;
          if (R.check()) { sfx.ok(2); if (round === 0) { round = 1; busy = true; api.body.querySelector('.pm-hall').classList.add('passed'); later(() => { busy = false; mount(); api.msg('انفتح المدخل. في القاعة الكبرى تتكلم التماثيل عن بعضها أيضًا.'); }, 700); return; }
            busy = true; later(() => pWin(api, 'pz_pliar', 'عرفت الكذابين، وفتحت الباب الصحيح.'), 500); return; }
          miss++; api.wrong(); if (miss >= 3) { busy = true; R.h.set(R.target); api.over(round === 0 ? 'هذا اتجاه التماثيل الصحيح في المدخل.' : 'هذا هو الحل الصحيح.'); return; }
          api.msg('الاتجاهات لا تحقق النقوش معًا. الصادقون يواجهون بابًا واحدًا، والكاذبون يديرون ظهورهم.'); };
        mount(); $('#pmgo').onclick = go; api.msg('من الصادق؟ ومن الكاذب؟ دوّر التماثيل.');
        pzHook({ P, I, round: () => round, set: () => R.h.set(R.target), enter: go, check: go });
        return { hint: kk => { if (kk === 1) return 'افترض أن تمثالًا صادق، وتابع ما يلزم من نقشه. إذا وصلت لتناقض، فهو كاذب.';
            const tg = R.target, i = tg.findIndex((v, j) => v === R.D && R.h.dir[j] !== v); if (kk === 2 && i >= 0) { R.h.dir[i] = R.D; R.h.paint(); return 'أدرت لك ظهر تمثال كاذب.'; }
            const door = tg.find(v => v < R.D); return `الطريق من الباب ${XAR(door + 1)}.`; },
          reveal: () => { R.h.set(R.target); return 'هذا الحل.'; } };
      });
    };
  }
  window.PALACE_MOTION = { dsMake };
})();
