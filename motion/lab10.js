/* design-01-10 — مختبر العقل: ألغاز 02–10 على تصميم الحزمة المصحّحة (MindLab_Design_01-10_Reviewed_AR).
   Each board is built from the live generator and calls the existing rules, hint chain, win path and save:
     02 pz_river rvMake/rvPath   03 pz_rush rhMake + rushEngine   04 pz_stat stMake   05 pz_pipe ppMake/ppPowered/ppSolved
     06 pz_grid lgMake/lgText    07 pz_sudo sdMake/sdBox          08 pz_flow flMake   09 pz_tan tgMake/tgRot/tgFlip
     10 pz_tent tnMake
   Ids, levels, rules, keys (miran:v2) and the hint/restart/surrender chrome of pzPlay are unchanged.
   01 pz_rid uses several questions and renders crate artwork only for the matching question
   in the original layer. The crate-specific presentation below reuses the existing story riddle. */
(function () {
  'use strict';
  if (typeof GM === 'undefined' || typeof pzPlay !== 'function' || !window.MK) return;
  const A = 'motion/art10/', im = (k, c = '', alt = '') => `<img class="${c}" src="${A}${k}.webp" alt="${alt}" draggable="false">`;
  const N = v => (typeof XAR === 'function' ? XAR(v) : String(v));
  const DESIGNS = 'ui/designs_art/';
  const png = (path, cls = '') => `<img class="${cls}" src="${DESIGNS}${path}.png" alt="" aria-hidden="true" draggable="false">`;
  const piece = (board, asset, cls = '') => png(`four_puzzles/pz_${board}/sprites/${asset}`, cls);
  const riverPiece = (folder, asset, cls = '') => png(`river_stage1/${folder}/${asset}`, cls);

  const OPENINGS = {
    pz_river: ['rawaa', 'رواء', 'قبل ما نحرّك القارب، شوفي مين بيبقى على الضفة.'],
    pz_rush: ['rawaa', 'رواء', 'أي مركبة تفتح مجال للسيارة الحمراء إذا حرّكناها على مسارها؟'],
    pz_stat: ['nuha', 'نهى', 'لمسة وحدة تغيّر أكثر من تمثال. شوفي الروابط قبل ما تدوّرينه.'],
    pz_pipe: ['nuha', 'نهى', 'خلّينا نتتبّع الماء من المنبع. وين أول وصلة توقفه؟'],
    pz_grid: ['ward', 'ورد', 'كل قرينة تضيّق الخيارات. خلّينا نشوف مين يطابقها كلها.'],
    pz_sudo: ['ward', 'ورد', 'قبل ما تحطين الشكل، شيّكي صفّه وعموده ومجموعته.'],
    pz_flow: ['rawaa', 'رواء', 'كل زوج يحتاج طريقه، وكل خانة لازم تمر فيها وصلة.'],
    pz_tan: ['nuha', 'نهى', 'جرّبي تدوّرين القطعة عشان تناسب الحافة.'],
    pz_tent: ['ward', 'ورد', 'خلّينا نقرأ رقم الصف قبل ما نحط خيمة.']
  };
  const showIntro0 = showIntro;
  showIntro = function () {
    showIntro0.apply(this, arguments);
    const opening = OPENINGS[curGame()?.id];
    const intro = document.querySelector('#stage > .intro');
    const start = document.getElementById('go');
    if (!opening || !intro || !start) return;
    const [art, name, speech] = opening;
    const bubble = document.createElement('div');
    bubble.className = 'lb-intro';
    bubble.innerHTML = `${im('char_' + art, 'lb-intro-art')}<p><b>${name}</b><br>«${speech}»</p>`;
    intro.querySelector('.arthero')?.remove();
    intro.querySelector('.la-intro-art')?.remove();
    intro.prepend(bubble);
    start.textContent = 'ابدأ اللغز';
  };

  /* ---------------------------------------------------------------- shared frame
     lead line · board · bottom bar (تلميح + main action).
     The bottom «تلميح» and «إعادة اللغز» press the existing pzPlay buttons, so cost, count and remount stay the same. */
  function frame(api, o) {
    api.body.innerHTML = `<div class="lb" data-lb="${o.id}">
      ${o.lead ? `<p class="lb-lead">${o.lead}</p>` : ''}${o.top || ''}
      <div class="lb-board" id="lbb"></div>${o.under || ''}
      <div class="lb-bar"><button class="lb-hint" type="button">تلميح</button>${o.main ? `<button class="lb-main go" type="button" id="lbgo">${o.main}</button>` : `<button class="lb-main" type="button" id="lbre">إعادة اللغز</button>`}</div></div>`;
    const root = api.body.querySelector('.lb');
    root.querySelector('.lb-hint').onclick = () => { const h = document.getElementById('pzh'); if (h && !h.hidden && !h.disabled) h.click(); };
    const re = root.querySelector('#lbre'); if (re) re.onclick = () => { const r = document.getElementById('pzr'); if (r) r.click(); };
    return root;
  }
  const flash = (el, cls = 'lb-bad', ms = 900) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };

  /* The original riddle entry serves several different questions. Only the crate question uses the crate artwork. */
  if (GM.pz_rid) {
    const runRiddle = GM.pz_rid.run;
    GM.pz_rid.run = function () {
      const run = runRiddle.apply(this, arguments);
      return function (done) {
        const result = run(done), board = document.getElementById('pzb');
        if (board?.querySelector('.ridq')?.textContent === RIDDLES[0][0]) {
          const art = document.createElement('div');
          art.className = 'rid-crates';
          art.setAttribute('aria-hidden', 'true');
          const fruit = label => label === 'مختلط'
            ? piece('rid', 'fruit_apple') + piece('rid', 'fruit_orange')
            : piece('rid', label === 'تفاح' ? 'fruit_apple' : 'fruit_orange');
          art.innerHTML = ['تفاح', 'برتقال', 'مختلط'].map(label => `
            <span class="rid-crate">
              ${piece('rid', 'crate_base')}${piece('rid', 'crate_lid_closed', 'rid-lid')}
              <span class="rid-crate-label">${fruit(label)}<b>${label}</b></span>
            </span>`).join('');
          board.querySelector('.ridbanner')?.replaceWith(art);
          const options = board.querySelector('.ridopts');
          options.addEventListener('click', event => {
            const choice = event.target.closest('.ridopt');
            if (choice?.classList.contains('ok')) {
              art.classList.add('solved');
              art.lastElementChild.querySelector('.rid-lid').src = DESIGNS + 'four_puzzles/pz_rid/sprites/crate_lid_open.png';
            }
          });
        }
        return result;
      };
    };
  }

  /* ================================================================ 02 عبور النهر — pz_river */
  if (GM.pz_river && typeof rvMake === 'function') GM.pz_river.run = function () {
    return pzPlay('pz_river', api => {
      const P = rvMake(api.lv), n = P.it.length, F = 1 << n, goal = (1 << (n + 1)) - 1; let s = 0, boat = new Set(), moves = 0, busy = false;
      const eats = P.conf.map(([a, b]) => `${RVN[P.it[a]]} ${P.it[a] === 'hen' ? 'تأكل' : 'يأكل'} ${RVN[P.it[b]]}`).join('، ');
      const root = frame(api, { id: 'river', main: 'اعبر النهر',
        lead: `انقل الجميع إلى المرج الأخضر. أقل حل: ${N(P.min)} رحلات.`,
        top: `<p class="lb-rule">${eats}. حمولة القارب: المزارع ومعه حتى ${N(P.cap)}.</p>` });
      const layers = [
        ['01_background/01_sky_and_mountains', 'sky'], ['05_sky_anim/cloud_01', 'cloud one'],
        ['05_sky_anim/cloud_02', 'cloud two'], ['05_sky_anim/cloud_03', 'cloud three'],
        ['03_water/04_water_surface', 'water'], ['03_water/05_water_reflections', 'water reflections'],
        ['03_water/06_water_waves', 'water waves'], ['02_banks/02_bank_left', 'bank left'],
        ['02_banks/03_bank_right', 'bank right'], ['04_props/07_prop_cottage', 'cottage'],
        ['04_props/08_prop_tree_left', 'tree'], ['04_props/09_prop_trees_right', 'trees'],
        ['04_props/10_prop_stones', 'stones'], ['04_props/11_prop_wood_logs', 'logs'],
        ['04_props/12_prop_plants_flowers', 'flowers'], ['04_props/13_prop_reeds_bushes', 'reeds'],
        ...[1, 2, 3].map(n => [`05_sky_anim/bird_fly_0${n}`, `bird bird-${n}`])
      ];
      $('#lbb').innerHTML = `<div class="rv10">
        <div class="rv10-landscape" aria-hidden="true">${layers.map(([file, cls]) => png('river_v2/' + file, cls)).join('')}</div>
        <section class="rv10-bank" data-slot="bank0" aria-label="الضفة اليسرى"><h4>الضفة اليسرى</h4><div class="rv10-items" id="rvb0"></div></section>
        <section class="rv10-water"><h4>المزارع</h4><small id="rvside" role="status" aria-live="polite"></small></section>
        <section class="rv10-bank goal" data-slot="bank1" aria-label="المرج الأخضر"><h4>المرج الأخضر</h4><div class="rv10-items" id="rvb1"></div></section>
        <div class="rv10-boat" data-slot="boat" aria-label="القارب"><div class="rv10-rig" aria-hidden="true"></div><div class="rv10-load" id="rvld"></div></div></div>`;
      const fs = () => (s & F ? 1 : 0);
      const stageOne = ['wolf', 'sheep', 'grass'];
      const rig = root.querySelector('.rv10-rig');
      function boatArt() {
        const facing = fs() ? 'return' : 'go';
        rig.innerHTML = riverPiece('02_boat_and_farmer', 'boat_shadow_' + facing) +
          riverPiece('04_effects', 'fx_wake_' + facing, 'rv10-wake') +
          riverPiece('02_boat_and_farmer', 'boat_hull_' + facing) +
          (boat.size ? '' : riverPiece('02_boat_and_farmer', 'boat_seat_empty')) +
          riverPiece('02_boat_and_farmer', 'farmer_' + facing) +
          riverPiece('02_boat_and_farmer', 'boat_oar_' + facing) +
          riverPiece('04_effects', 'fx_rope', 'rv10-rope') +
          riverPiece('04_effects', 'fx_splash', 'rv10-splash');
      }
      function tok(i, on) {
        const animal = P.it[i], state = on ? (animal === 'grass' ? 'cargo' : 'seated') : 'bank';
        const art = stageOne.includes(animal) ? riverPiece('03_passengers', `${animal}_${state}`) : im('river_' + animal);
        return `<button class="mk-tok rv10-it${on ? ' inb' : ''}" data-tok="${i}" aria-label="${RVN[animal]}${on ? ' في القارب' : ''}">${art}</button>`;
      }
      function draw() { const f = fs();
        for (const side of [0, 1]) $('#rvb' + side).innerHTML = P.it.map((k, i) => (s >> i & 1) === side && !boat.has(i) ? tok(i, false) : '').join('');
        $('#rvld').innerHTML = [...boat].map(i => tok(i, true)).join(''); boatArt(); $('#rvside').textContent = f ? 'عند اليمين' : 'عند اليسار';
        root.querySelector('.rv10').classList.toggle('at1', !!f);
        root.querySelectorAll('.rv10-bank .rv10-it').forEach(e => { const i = +e.dataset.tok; e.setAttribute('aria-disabled', (s >> i & 1) !== f ? 'true' : 'false'); }); }
      function tap(i) { if (busy || api.ended) return; if (boat.has(i)) boat.delete(i); else { if ((s >> i & 1) !== fs()) { api.msg('القارب على الضفة الأخرى.'); return; }
          if (boat.size >= P.cap) { api.msg(`القارب يتسع للمزارع و${P.cap === 1 ? 'واحد فقط' : P.cap === 2 ? 'اثنين فقط' : 'ثلاثة فقط'}.`); sfx.bad(); flash(root.querySelector('.rv10-boat')); return; } boat.add(i); }
        sfx.pop(); draw();
        const key = P.it[i];
        if (boat.has(i) && stageOne.includes(key)) {
          const sprite = root.querySelector(`#rvld [data-tok="${i}"] img`);
          const seated = sprite.getAttribute('src');
          sprite.src = DESIGNS + `river_stage1/03_passengers/${key}_boarding.png`;
          later(() => { if (sprite.isConnected) sprite.src = seated; }, 180);
        } }
      const mk = MK.attach(root.querySelector('.rv10'), { canDrag: () => !busy && !api.ended, onPick: id => { mk.clear(); tap(+id); },
        drop: (id, slot) => { const i = +id; if (slot === 'boat' ? !boat.has(i) : boat.has(i)) tap(i); } });
      function cross() { if (busy || api.ended) return; let m = 0; boat.forEach(i => m |= 1 << i); const t = s ^ F ^ m; moves++; busy = true;
        const scene = root.querySelector('.rv10'), vessel = root.querySelector('.rv10-boat');
        scene.classList.add('sail'); vessel.setAttribute('aria-busy', 'true'); sfx.tick();
        later(() => { s = t; boat.clear(); busy = false; scene.classList.remove('sail'); vessel.removeAttribute('aria-busy'); const f = fs(), eat = P.conf.find(([a, c]) => (s >> a & 1) === (s >> c & 1) && (s >> a & 1) !== f); draw();
          if (eat) { busy = true; eat.forEach(i => { const e = root.querySelector(`.rv10-bank [data-tok="${i}"]`); if (e) e.classList.add('lb-bad', 'eat'); });
            api.msg(`${RVN[P.it[eat[0]]]} ${P.it[eat[0]] === 'hen' ? 'أكلت' : 'أكل'} ${RVN[P.it[eat[1]]]}! تُرك معه دون المزارع. نبدأ من جديد.`); api.wrong();
            later(() => { s = 0; moves = 0; busy = false; draw(); api.msg(`حاول مرة ثانية. أقل حل: ${N(P.min)} رحلات.`); }, 1700); return; }
          if (s === goal) { root.querySelector('.rv10').classList.add('won'); api.win(`عبرت الجميع في ${arN(moves, AN.trip)}، وأقل حل ممكن ${arN(P.min, AN.trip)}.`); }
          else api.msg(`الرحلات: ${N(moves)} · أقل حل: ${N(P.min)}`); }, 650); }
      $('#lbgo').onclick = cross; draw(); api.msg(`أقل حل: ${N(P.min)} رحلات.`); pzHook({ P, tap, cross, s: () => s, boat: () => [...boat], moves: () => moves });
      return { hint: k => { if (k === 1) return `أقل عدد رحلات للحل ${arN(P.min, AN.trip)}، والرجوع يُحسب رحلة. أحيانًا لازم ترجع بأحدهم معك.`; const p = rvPath(n, P.cap, P.conf, s); if (!p || p.length < 2) return 'أنت قريب جدًا!';
          const d = (p[0] ^ p[1]) & (F - 1), names = P.it.filter((_, i) => d >> i & 1).map(k => RVN[k]); return `الخطوة التالية من وضعك الحالي: ${names.length ? 'اعبر ومعك ' + names.join(' و') : 'اعبر وحدك بدون أحد'}.`; },
        reveal: () => `أقل حل كان ${arN(P.min, AN.trip)}.` };
    });
  };

  /* ================================================================ 03 موقف السيارات — pz_rush
     rushEngine keeps the moves, drag, tap + arrows, hint and win; only the vehicle art and the board frame change. */
  if (GM.pz_rush && typeof rushEngine === 'function' && typeof rhMake === 'function') {
    const paintCar = (v, red) => {
      const asset = red ? 'car_rescue_2x1' : v.len === 3 ? 'truck_heavy_3x1' : 'cart_cargo_2x1';
      return `<span class="rh10">${piece('rush', asset + (v.h ? '_h' : '_v'), 'rh10-img')}</span>`;
    };
    GM.pz_rush.run = function () {
      return pzPlay('pz_rush', api => {
        const P = rhMake(api.lv), oldPainter = window.carSVG;
        let R;
        window.carSVG = paintCar;
        try {
          R = rushEngine(api, P, m => api.win(`أخرجت السيارة في ${arN(m, AN.mv)}، والحل الأمثل ${arN(P.min, AN.mv)}.`));
        } finally {
          window.carSVG = oldPainter;
        }
        const lot = api.body.firstElementChild; const holder = document.createElement('div'); holder.className = 'lb'; holder.dataset.lb = 'rush';
        holder.innerHTML = `<p class="lb-lead">اسحب كل مركبة على محورها. المخرج يمين صف السيارة الحمراء. أقل حل: ${N(P.min)} حركة.</p><div class="lb-board" id="lbb"></div>
          <div class="lb-bar"><button class="lb-hint" type="button">تلميح</button><button class="lb-main" type="button" id="lbre">إعادة اللغز</button></div>`;
        api.body.prepend(holder); holder.querySelector('#lbb').append(lot);
        holder.querySelector('.lb-hint').onclick = () => { const h = document.getElementById('pzh'); if (h && !h.hidden && !h.disabled) h.click(); };
        holder.querySelector('#lbre').onclick = () => { const r = document.getElementById('pzr'); if (r) r.click(); };
        return R;
      });
    };
  }

  /* ================================================================ 04 التماثيل الدوّارة — pz_stat
     Same matrix R, same presses. Each statue is the guardian on its pedestal; the gold diamond marks its target
     direction, the green dot its current direction. */
  if (GM.pz_stat && typeof stMake === 'function') GM.pz_stat.run = function () {
    return pzPlay('pz_stat', api => {
      const P = stMake(api.lv), n = P.n; let s = P.s.slice(), presses = 0; const ang = P.s.map((d, i) => (P.tgt[i] + d) * 90);
      const rule = P.twist ? 'الضغط يدير التمثال يمينًا وجيرانه المرتبطين يسارًا ربع لفة' : P.R.some(v => v.includes(2)) ? 'الضغط يدير التمثال ربع لفة، وجاره المرتبط نصف لفة' : 'الضغط يدير التمثال وجيرانه المرتبطين ربع لفة في الاتجاه نفسه';
      frame(api, { id: 'stat', lead: `طابق مؤشر اتجاه التمثال الأخضر مع الماسة الذهبية. ${rule}${P.ring ? '، والتماثيل في حلقة مغلقة' : ''}.` });
      const Rr = 37, pos = [...Array(n)].map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [50 + Rr * Math.cos(a), 50 + Rr * Math.sin(a)]; }), sz = n <= 4 ? 26 : n <= 5 ? 24 : 21;
      const pairs = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && P.R[i][j]) { const k = i < j ? i + '-' + j : j + '-' + i; if (!pairs.includes(k)) pairs.push(k); }
      const links = pairs.map(k => {
        const [a, b] = k.split('-').map(Number), [x, y] = pos[a], [endX, endY] = pos[b];
        const length = Math.hypot(endX - x, endY - y);
        const angle = Math.atan2(endY - y, endX - x) * 180 / Math.PI;
        return `<image class="st10-stone-link" href="${DESIGNS}four_puzzles/pz_stat/sprites/fx_stone_link.png" x="${x}" y="${y - 3}"
          width="${length}" height="6" transform="rotate(${angle} ${x} ${y})" preserveAspectRatio="none"/>
          <line data-a="${a}" data-b="${b}" x1="${x}" y1="${y}" x2="${endX}" y2="${endY}"/>`;
      }).join('');
      $('#lbb').innerHTML = `<div class="st10" id="st10">${piece('stat', 'door_closed', 'st10-door')}${piece('stat', 'door_open', 'st10-open')}<svg class="st10-links" viewBox="0 0 100 100" aria-hidden="true">${links}</svg>
        ${pos.map(([x, y], i) => `<button class="st10-s" data-i="${i}" style="left:${x}%;top:${y}%;width:${sz}%" aria-label="تمثال ${N(i + 1)}"> ${piece('stat', 'guardian_body_' + ['sun', 'anchor', 'wave'][i % 3], 'st10-ped')}<i class="st10-tgt" style="--a:${P.tgt[i] * 90}deg"></i><span class="st10-head">${piece('stat', 'head_north', 'st10-g')}</span><span class="st10-current"><i class="st10-dot"></i></span></button>`).join('')}</div>`;
      const btns = [...$('#st10').querySelectorAll('.st10-s')], lines = [...$('#st10').querySelectorAll('line')];
      function draw() { btns.forEach((b, i) => {
        const heading = ((ang[i] / 90) % 4 + 4) % 4;
        const facing = ['north', 'east', 'south', 'west'][heading];
        b.querySelector('.st10-g').src = DESIGNS + `four_puzzles/pz_stat/sprites/head_${facing}.png`;
        b.querySelector('.st10-current').style.transform = `rotate(${ang[i]}deg)`;
        b.classList.toggle('ok', s[i] === 0); b.setAttribute('aria-label', `تمثال ${N(i + 1)}: ${s[i] === 0 ? 'يطابق ماسته' : 'لا يطابق'}`); }); $('#st10').classList.toggle('all', s.every(d => d === 0)); }
      function press(i) { if (api.ended) return; P.R[i].forEach((r, j) => { if (r) { s[j] = (s[j] + r) % 4; ang[j] += r * 90; } }); presses++;
        btns.forEach((b, j) => {
          b.classList.remove('hint');
          if (P.R[i][j]) {
            b.dataset.turn = P.R[i][j] === 2 ? 'half' : 'quarter';
            flash(b, j === i ? 'turned' : 'linked', 400);
          }
        }); lines.forEach(l => { if (+l.dataset.a === i || +l.dataset.b === i) flash(l, 'zap', 500); });
        tone(180 + i * 30, .18, 'triangle', .05); draw();
        if (s.every(d => d === 0)) api.win(`طابقت اتجاهات التماثيل في ${arN(presses, AN.press)}، والأقل ${arN(P.min, AN.press)}.`); else api.msg(`الضغطات: ${N(presses)} · أقل حل: ${N(P.min)}`); }
      btns.forEach((b, i) => b.onclick = () => press(i)); draw(); api.msg(`أقل حل: ${N(P.min)} ضغطات.`); pzHook({ P, press, s: () => s, presses: () => presses });
      return { hint: k => { if (k === 1) return `أقل حل ${arN(P.min, AN.press)}. ترتيب الضغطات لا يهم، المهم عدد مرات ضغط كل تمثال. الخطوط تريك من يحرّك من.`; const i = P.nxt[P.enc(s)]; if (i < 0) return null; btns[i].classList.add('hint'); return 'اضغط التمثال المضيء.'; },
        reveal: () => `كان أقل حل ${arN(P.min, AN.press)}.` };
    });
  };

  /* ================================================================ 05 الأنابيب — pz_pipe
     Same masks (ppMake), rotation (ppRot = a quarter turn clockwise), flow (ppPowered) and win (ppSolved). */
  if (GM.pz_pipe && typeof ppMake === 'function') GM.pz_pipe.run = function () {
    return pzPlay('pz_pipe', api => {
      const P = ppMake(api.lv), lock = new Set(), deg = m => [1, 2, 4, 8].filter(b => m & b).length, base = P.cur.slice(), turn = P.cur.map(() => 0); let taps = 0;
      // art and the clockwise quarter turns that bring its drawn mask onto the cell's starting mask
      const KIND = [[5, 'straight', 0], [6, 'corner', -90], [7, 'tee', -90], [15, 'cross', 0], [4, 'end', -90]];
      const fit = mask => {
        for (const [painted, shape, waterAngle] of KIND) {
          let rotated = painted;
          for (let k = 0; k < 4; k++, rotated = ppRot(rotated)) {
            if (rotated === mask) return [shape, k, waterAngle];
          }
        }
        throw new Error(`Unsupported pipe mask: ${mask}`);
      };
      frame(api, { id: 'pipe', lead: 'اضغط القطعة لتدويرها ربع لفة. تتحقق اللعبة تلقائيًا عند الاكتمال.' });
      $('#lbb').innerHTML = `<div class="pp10" id="pp10" style="--w:${P.w}">${base.map((m, i) => { const [shape, k, waterAngle] = fit(m), src = i === P.src, house = !src && deg(P.sol[i]) === 1;
        return `<button class="pp10-c${src ? ' src' : ''}${house ? ' house' : ''}" data-i="${i}" aria-label="${src ? 'النبع' : house ? 'بيت' : 'أنبوب'}"><span class="pp10-rot" style="--k:${k};--flow-angle:${waterAngle}deg">${piece('pipe', 'pipe_' + shape, 'pp10-pipe')}${piece('pipe', 'water_' + shape, 'pp10-flow')}</span>${src ? piece('pipe', 'spring_source', 'pp10-spring') : house ? piece('pipe', 'cottage_dry', 'pp10-house') + piece('pipe', 'cottage_watered', 'pp10-house wet') : ''}</button>`; }).join('')}</div>`;
      const cells = [...$('#pp10').children];
      const ports = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
      function hasLeak(i) {
        const x = i % P.w, y = Math.floor(i / P.w);
        return ports.some(([dx, dy, bit, reciprocal]) => {
          const nx = x + dx, ny = y + dy;
          return (P.cur[i] & bit) && (nx < 0 || nx >= P.w || ny < 0 || ny >= P.h || !(P.cur[ny * P.w + nx] & reciprocal));
        });
      }
      function draw() { const on = ppPowered(P); cells.forEach((b, i) => { b.querySelector('.pp10-rot').style.transform = `rotate(${(+b.querySelector('.pp10-rot').style.getPropertyValue('--k') + turn[i]) * 90}deg)`; b.classList.toggle('on', on.has(i)); b.classList.toggle('leak', on.has(i) && hasLeak(i)); b.classList.toggle('lock', lock.has(i)); });
        const homes = P.sol.filter((m, i) => deg(m) === 1 && i !== P.src).length, lit = P.sol.filter((m, i) => deg(m) === 1 && i !== P.src && on.has(i)).length; api.msg(`البيوت التي وصلها الماء: ${N(lit)} من ${N(homes)}`); }
      function rot(i) { if (api.ended || lock.has(i)) return; P.cur[i] = ppRot(P.cur[i]); turn[i]++; taps++; tone(500, .04); draw(); if (ppSolved(P)) { $('#pp10').classList.add('won'); api.win(`وصل الماء لكل البيوت بلا أطراف مفتوحة بعد ${arN(taps, AN.press)}.`); } }
      cells.forEach((b, i) => b.onclick = () => rot(i)); draw(); pzHook({ P, rot, turn: () => turn.slice() });
      return { hint: k => { if (k === 1) return 'ابدأ من الأطراف والزوايا: القطعة في الزاوية لها اتجاهات قليلة ممكنة، والبيت دائمًا نهاية طريق.'; const bad = P.cur.map((m, i) => i).filter(i => !lock.has(i) && P.cur[i] !== P.sol[i]), c = bad.length ? pick(bad) : -1; if (c < 0) return null;
          while (P.cur[c] !== P.sol[c]) { P.cur[c] = ppRot(P.cur[c]); turn[c]++; } lock.add(c); draw(); if (ppSolved(P)) api.win('اكتمل الماء.'); return 'ثبّتُّ لك قطعة في مكانها الصحيح (عليها إطار ذهبي).'; },
        reveal: () => 'المرة الجاية ابدأ من البيوت في الأطراف.' };
    });
  };

  /* ================================================================ 06 شبكة المنطق — pz_grid
     The clue list is the engine's own text (lgText). Tap a cell to cycle its value. «تحقق من الحل» = the same check;
     when it fails, the first broken clue and its cell are marked (or the repeated values in a column). */
  if (GM.pz_grid && typeof lgMake === 'function') GM.pz_grid.run = function () {
    return pzPlay('pz_grid', api => {
      const P = lgMake(api.lv), ans = [...Array(P.a)].map(() => Array(P.n).fill(-1)), fixed = new Set(); let mark = null;
      const root = frame(api, { id: 'grid', main: 'تحقق من الحل', lead: `اضغط الخانة لتغيير القيمة. لكل شخص قيمة واحدة من كل فئة، ولا تتكرر القيمة في العمود.` });
      $('#lbb').innerHTML = `<div class="lg10"><div class="lg10-clues"><h4>القرائن</h4><ol id="lgcl">${P.clues.map((c, i) => `<li data-c="${i}"><span>${lgText(c, P)}</span><i class="lg10-st"></i></li>`).join('')}</ol></div><div class="lg10-tw"><table class="lg10-t" id="lg10t"></table></div></div>`;
      const holds = c => { const g = (k, p) => ans[k][p], who = (k, v) => ans[k].indexOf(v);
        if (c.t === 'pos') return g(c.k, c.p) === c.v; if (c.t === 'neg') return g(c.k, c.p) !== c.v; const p1 = who(c.k1, c.v1); if (p1 < 0) return c.t === 'nlk'; return c.t === 'lnk' ? g(c.k2, p1) === c.v2 : g(c.k2, p1) !== c.v2; };
      const cellsOf = c => c.t === 'pos' || c.t === 'neg' ? [[c.k, c.p]] : (() => { const p1 = ans[c.k1].indexOf(c.v1); return p1 < 0 ? [] : [[c.k1, p1], [c.k2, p1]]; })();
      function draw() { const T = $('#lg10t');
        T.innerHTML = `<tr><th scope="col">الاسم</th>${P.cats.map(k => `<th scope="col">${LG_C[k].n}</th>`).join('')}</tr>` + LG_P.slice(0, P.n).map((nm, p) => `<tr><th scope="row">${nm}</th>${P.cats.map((k, ci) => { const v = ans[ci][p], bad = mark && mark.cells.some(([a, b]) => a === ci && b === p);
          return `<td><button class="lg10-c${fixed.has(ci + '.' + p) ? ' fix' : ''}${v >= 0 ? ' set' : ''}${bad ? ' lb-badc' : ''}" data-c="${ci}" data-p="${p}" aria-label="${nm}، ${LG_C[k].n}: ${v >= 0 ? LG_C[k].it[v] : 'فارغة'}">${v >= 0 ? LG_C[k].it[v] : '؟'}</button></td>`; }).join('')}</tr>`).join('');
        T.querySelectorAll('.lg10-c').forEach(b => b.onclick = () => { const c = +b.dataset.c, p = +b.dataset.p; if (api.ended || fixed.has(c + '.' + p)) return; mark = null; root.querySelectorAll('#lgcl li').forEach(l => l.className = ''); ans[c][p] = ans[c][p] + 1 >= P.n ? -1 : ans[c][p] + 1; tone(520, .04); draw(); }); }
      $('#lbgo').onclick = () => { if (api.ended) return; if (ans.some(r => r.includes(-1))) { api.msg('أكمل كل الخانات أولًا.'); return; }
        if (ans.every((r, c) => r.every((v, p) => v === P.sol[c][p]))) { root.querySelectorAll('#lgcl li').forEach(l => l.className = 'ok'); api.win('تطابق القيم جميع القرائن.'); return; }
        api.wrong(); const cl = [...root.querySelectorAll('#lgcl li')];
        const dup = []; ans.forEach((r, c) => r.forEach((v, p) => { if (r.indexOf(v) !== p || r.lastIndexOf(v) !== p) dup.push([c, p]); }));
        if (dup.length) { mark = { cells: dup }; cl.forEach(l => l.className = ''); draw(); api.msg('قيمة مكررة في العمود نفسه: لكل شخص قيمة مختلفة.'); return; }
        const bi = P.clues.findIndex(c => !holds(c)); cl.forEach((l, i) => l.className = i === bi ? 'bad' : holds(P.clues[i]) ? 'ok' : '');
        mark = { cells: bi >= 0 ? cellsOf(P.clues[bi]) : [] }; draw(); api.msg(bi >= 0 ? `القيمة المعلّمة تخالف القرينة ${N(bi + 1)}.` : 'فيه خطأ. ارجع للقرائن.'); };
      draw(); pzHook({ P, ans, draw, check: () => $('#lbgo').click() });
      return { hint: k => { if (k === 1) return 'ارسم في ذهنك جدول «نعم/لا»: كل قرينة «لا» تشطب خانة، وإذا بقي خيار واحد في الصف فهو الجواب.'; const c = []; ans.forEach((r, ci) => r.forEach((v, p) => { if (!fixed.has(ci + '.' + p) && v !== P.sol[ci][p]) c.push([ci, p]); })); if (!c.length) return null;
          const [ci, p] = pick(c); ans[ci][p] = P.sol[ci][p]; fixed.add(ci + '.' + p); draw(); const C = LG_C[P.cats[ci]]; return `${LG_P[p]} ${C.v} ${C.it[P.sol[ci][p]]} (ثبّتُّها لك).`; },
        reveal: () => { P.sol.forEach((r, c) => r.forEach((v, p) => ans[c][p] = v)); draw(); return 'هذا هو الحل الصحيح.'; } };
    });
  };

  /* ================================================================ 07 سودوكو الأشكال — pz_sudo
     SDS order: circle coral · square teal · triangle sage · diamond gold · hex plum · star amber. Givens are fixed. */
  if (GM.pz_sudo && typeof sdMake === 'function') GM.pz_sudo.run = function () {
    return pzPlay('pz_sudo', api => {
      const SH = ['sudo_circle_coral', 'sudo_square_teal', 'sudo_triangle_sage', 'sudo_diamond_gold', 'sudo_hex_plum', 'sudo_star_amber'], NM = ['دائرة', 'مربع', 'مثلث', 'ماسة', 'سداسي', 'نجمة'];
      const P = sdMake(api.lv), n = P.n, [bh, bw] = sdBox(n), g = P.puz.slice(), giv = new Set(P.puz.map((v, i) => v >= 0 ? i : -1).filter(i => i >= 0)), lock = new Set(); let sel = 0;
      const root = frame(api, { id: 'sudo', lead: `كل شكل مرة واحدة في كل صف وعمود ومجموعة ${N(bh)}×${N(bw)}. اختر شكلًا من الأسفل ثم اضغط الخانة الفارغة، أو اسحبه إليها.` });
      $('#lbb').innerHTML = `<div class="sd10" id="sd10" style="--n:${n}"></div><div class="sd10-pal" id="sd10p" data-tray="pal"></div>`;
      function dup() { const b = new Set(); for (let i = 0; i < n * n; i++) { if (g[i] < 0) continue; const r = i / n | 0, c = i % n; for (let j = 0; j < n * n; j++) { if (j === i || g[j] !== g[i]) continue; const r2 = j / n | 0, c2 = j % n; if (r === r2 || c === c2 || (Math.floor(r / bh) === Math.floor(r2 / bh) && Math.floor(c / bw) === Math.floor(c2 / bw))) b.add(i); } } return b; }
      function draw() { const d = dup();
        $('#sd10').innerHTML = [...Array(n * n).keys()].map(i => { const r = i / n | 0, c = i % n, v = g[i];
          return `<button class="sd10-c${giv.has(i) ? ' giv' : ''}${lock.has(i) ? ' lock' : ''}${d.has(i) && !giv.has(i) ? ' bad' : ''}${d.has(i) && giv.has(i) ? ' clash' : ''}${c % bw === bw - 1 && c < n - 1 ? ' br' : ''}${r % bh === bh - 1 && r < n - 1 ? ' bb' : ''}" data-i="${i}" data-slot="c${i}" aria-label="${v >= 0 ? NM[v] : 'خانة فارغة'}${giv.has(i) ? '، ثابتة' : ''}">${v >= 0 ? im(SH[v]) : ''}</button>`; }).join('');
        $('#sd10p').innerHTML = [...Array(n).keys()].map(v => `<button class="mk-tok sd10-p${v === sel ? ' on' : ''}" data-tok="${v}" aria-label="${NM[v]}" aria-pressed="${v === sel}">${im(SH[v])}</button>`).join(''); }
      function put(i, v = sel) { if (api.ended || giv.has(i) || lock.has(i)) return; g[i] = g[i] === v ? -1 : v; tone(560, .04); draw(); const d = dup(); if ([...d].some(x => !giv.has(x)) && g[i] >= 0) api.msg('تكرار في صف أو عمود أو مجموعة: الخانة المعلّمة بالأحمر.'); else api.msg('');
        if (g.every((x, k) => x === P.sol[k])) { $('#sd10').classList.add('won'); api.win(`أكملت سودوكو الأشكال ${N(n)}×${N(n)}.`); } }
      const mk = MK.attach(root.querySelector('.lb-board'), { canDrag: () => !api.ended, onPick: id => { mk.clear(); sel = +id; tone(600, .03); draw(); },
        drop: (id, slot) => { if (slot && slot[0] === 'c') { sel = +id; put(+slot.slice(1), +id); } } });
      $('#sd10').addEventListener('click', e => { const b = e.target.closest('.sd10-c'); if (b) put(+b.dataset.i); });
      draw(); pzHook({ P, put, sel: v => { sel = v; draw(); }, g: () => g.slice() });
      return { hint: k => { if (k === 1) return 'ابحث عن صف أو عمود أو مجموعة ينقصها شكل واحد أو اثنان، فهناك الجواب أسهل.'; const c = [...Array(n * n).keys()].filter(i => !giv.has(i) && !lock.has(i) && g[i] !== P.sol[i]); if (!c.length) return null; const i = pick(c); g[i] = P.sol[i]; lock.add(i); draw(); if (g.every((x, k) => x === P.sol[k])) api.win('اكتمل السودوكو.'); return 'وضعت لك شكلًا صحيحًا (بإطار ذهبي).'; },
        reveal: () => { P.sol.forEach((v, i) => g[i] = v); draw(); return 'هذا هو الحل.'; } };
    });
  };

  /* ================================================================ 08 وصّل الألوان — pz_flow
     Same ends and segs (flMake); every pair has its own colour and symbol (flow_node_0..8). Drag a path, or tap cell by cell. */
  if (GM.pz_flow && typeof flMake === 'function') GM.pz_flow.run = function () {
    return pzPlay('pz_flow', api => {
      const COL = ['#FF5F7A', '#3FD0E8', '#8BE36A', '#FFD45A', '#B48CFF', '#FF8A3D', '#5EE6C0', '#FF8FD1', '#7DA2FF'], ART = ['coral', 'teal', 'sage', 'gold', 'plum', 'amber', 'mint', 'pink', 'blue'];
      const P = flMake(api.lv), n = P.n, K = P.ends.length, paths = P.ends.map(() => []), endOf = new Map(); P.ends.forEach(([a, b], k) => { endOf.set(a, k); endOf.set(b, k); }); let cur = -1, drag = false; const lockK = new Set();
      frame(api, { id: 'flow', lead: 'وصّل كل رمزين متطابقين بخط متصل واملأ اللوحة كلها. الخطوط لا تتقاطع.' });
      $('#lbb').innerHTML = `<div class="fl10" id="fl10" style="--n:${n}"></div>`;
      const owner = c => paths.findIndex(p => p.includes(c)), adj = (a, b) => Math.abs(a % n - b % n) + Math.abs((a / n | 0) - (b / n | 0)) === 1;
      const done = k => { const p = paths[k]; return p.length > 1 && endOf.get(p[0]) === k && endOf.get(p[p.length - 1]) === k && p[0] !== p[p.length - 1]; };
      function start(c) { const e = endOf.get(c), o = owner(c); if (e != null) { if (lockK.has(e)) return false; cur = e; paths[e] = [c]; return true; } if (o >= 0 && !lockK.has(o)) { cur = o; paths[o] = paths[o].slice(0, paths[o].indexOf(c) + 1); return true; } return false; }
      function touch(c) { if (cur < 0) return; const p = paths[cur], last = p[p.length - 1]; if (c === last) return; const at = p.indexOf(c); if (at >= 0) { paths[cur] = p.slice(0, at + 1); return draw(); } if (!adj(last, c) || done(cur)) return;
        const e = endOf.get(c); if (e != null && e !== cur) { blocked(c); return; } const o = owner(c); if (o >= 0 && o !== cur) { if (lockK.has(o)) { blocked(c); return; } paths[o] = paths[o].slice(0, paths[o].indexOf(c)); } p.push(c); tone(400 + cur * 40, .03); draw(); }
      function blocked(c) { const b = $('#fl10').querySelector(`[data-i="${c}"]`); flash(b, 'lb-bad', 700); api.msg('الخطوط لا تتقاطع! المسار محجوز بلون آخر.'); }
      function draw() { const cellCol = new Map(); paths.forEach((p, k) => p.forEach(c => cellCol.set(c, k)));
        $('#fl10').innerHTML = [...Array(n * n).keys()].map(i => { const k = cellCol.get(i), e = endOf.get(i); return `<button class="fl10-c${e != null ? ' end' : ''}${k != null ? ' on' : ''}" data-i="${i}" style="${k != null ? `--fc:${COL[k]}` : ''}" aria-label="${e != null ? 'رمز' : 'خانة'}">${e != null ? im('flow_node_' + e + '_' + ART[e], 'fl10-node') : ''}</button>`; }).join('') +
          `<svg class="fl10-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths.map((p, k) => p.length > 1 ? `<polyline points="${p.map(c => `${(c % n + .5) * 100 / n},${((c / n | 0) + .5) * 100 / n}`).join(' ')}" stroke="${COL[k]}" fill="none" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:${Math.round(300 / n) / 10}px" vector-effect="non-scaling-stroke"/>` : '').join('')}</svg>`;
        const all = paths.reduce((a, p) => a + p.length, 0), nd = [...Array(K).keys()].filter(done).length; if (!api.ended) api.msg(`وصلت ${N(nd)} من ${N(K)} أزواج · ${N(all)} من ${N(n * n)} خانة`);
        if (!api.ended && all === n * n && paths.every((_, k) => done(k))) { $('#fl10').classList.add('won'); api.win(`وصّلت ${N(K)} أزواج وملأت اللوحة كلها.`); } }
      const G = $('#fl10'), cellAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest && el.closest('.fl10-c'); return b && G.contains(b) ? +b.dataset.i : null; };
      G.addEventListener('pointerdown', e => { const c = cellAt(e); if (c == null || api.ended) return; e.preventDefault(); if (start(c)) { drag = true; draw(); } else if (cur >= 0) touch(c); });
      G.addEventListener('pointermove', e => { if (!drag) return; const c = cellAt(e); if (c != null) touch(c); });
      const up = () => { drag = false; }; document.addEventListener('pointerup', up); if (typeof cleanup !== 'undefined' && cleanup.push) cleanup.push(() => document.removeEventListener('pointerup', up));
      G.addEventListener('click', e => { if (e.detail !== 0) return; const b = e.target.closest('.fl10-c'); if (!b) return; const c = +b.dataset.i; if (endOf.has(c) || owner(c) >= 0 && owner(c) !== cur) { start(c); draw(); } else touch(c); });
      draw(); pzHook({ P, paths, start, touch, draw });
      return { hint: k => { if (k === 1) return 'ابدأ بالأزواج التي رموزها على الحواف أو قريبة من بعض، والأطول اتركه للأخير.'; const c = [...Array(K).keys()].filter(k => !done(k) || paths[k].join() !== P.segs[k].join()).filter(k => !lockK.has(k)); if (!c.length) return null;
          const kk = pick(c); paths.forEach((p, j) => { if (j !== kk) paths[j] = p.filter(x => !P.segs[kk].includes(x)); }); paths[kk] = P.segs[kk].slice(); lockK.add(kk); draw(); return 'رسمت لك زوجًا كاملًا في مكانه الصحيح.'; },
        reveal: () => { P.segs.forEach((s, k) => paths[k] = s.slice()); draw(); return 'هذا أحد الحلول.'; } };
    });
  };

  /* ================================================================ 09 تانغرام المربعات — pz_tan
     Same pieces (tgMake), rotate (tgRot) and flip (tgFlip). Each piece keeps its own tile (tan_tile_0..7). A piece is
     placed by tapping the cell where its marked square goes, or by dragging it there from the tray. */
  if (GM.pz_tan && typeof tgMake === 'function') GM.pz_tan.run = function () {
    return pzPlay('pz_tan', api => {
      const TILE = ['tan_tile_0_coral', 'tan_tile_1_teal', 'tan_tile_2_gold', 'tan_tile_3_sage', 'tan_tile_4_plum', 'tan_tile_5_amber', 'tan_tile_6_navy', 'tan_tile_7_crimson'];
      const P = tgMake(api.lv), n = P.n, R = new Set(P.reg), pcs = P.pieces.map((p, i) => ({ i, shape: shuffle([p.shape, tgRot(p.shape), tgRot(tgRot(p.shape)), tgFlip(p.shape)])[0], at: null, lock: false })); let sel = 0;
      const root = frame(api, { id: 'tan', lead: 'غطِّ المحيط المنقّط كله بالقطع. اختر قطعة ودوّرها، ثم اسحبها أو اضغط الخانة التي يقع عليها مربعها المعلَّم.' });
      $('#lbb').innerHTML = `<div class="tg10" id="tg10" style="--n:${n}"></div><div class="tg10-ctl"><button type="button" id="tgf">قلب</button><button type="button" id="tgr">تدوير</button></div><div class="tg10-tray" id="tg10t" data-tray="tray"></div>`;
      const cellsOf = p => p.at == null ? [] : p.shape.map(([x, y]) => [x + p.at[0] - p.shape[0][0], y + p.at[1] - p.shape[0][1]]);
      const occ = () => { const m = new Map(); pcs.forEach(p => cellsOf(p).forEach(([x, y]) => m.set(y * n + x, p.i))); return m; };
      function draw() { const o = occ();
        $('#tg10').innerHTML = [...Array(n * n).keys()].map(i => { const k = o.get(i); return `<button class="tg10-c${R.has(i) ? ' reg' : ''}${k != null ? ' on' : ''}${k != null && pcs[k].lock ? ' lock' : ''}" data-i="${i}" data-slot="c${i}" aria-label="${k != null ? 'قطعة' : R.has(i) ? 'خانة من الشكل' : 'خارج الشكل'}">${k != null ? im(TILE[k % 8]) : ''}</button>`; }).join('');
        const left = pcs.filter(p => p.at == null);
        $('#tg10t').innerHTML = left.length ? left.map(p => { const w = Math.max(...p.shape.map(c => c[0])) + 1, h = Math.max(...p.shape.map(c => c[1])) + 1, S = new Set(p.shape.map(([x, y]) => y * w + x));
          return `<button class="mk-tok tg10-p${p.i === sel ? ' on' : ''}" data-tok="${p.i}" style="--w:${w}" aria-label="قطعة ${N(p.i + 1)}" aria-pressed="${p.i === sel}">${[...Array(w * h)].map((_, k) => `<i class="${S.has(k) ? 'f' : ''}${k === p.shape[0][1] * w + p.shape[0][0] ? ' a' : ''}">${S.has(k) ? im(TILE[p.i % 8]) : ''}</i>`).join('')}</button>`; }).join('') : '<p class="tg10-empty">الصينية فارغة، تم تركيب كل القطع!</p>'; }
      function tap(i, k = sel) { if (api.ended) return; const o = occ(); if (o.has(i) && k === sel) { const p = pcs[o.get(i)]; if (p.lock) return; p.at = null; sel = p.i; draw(); return; }
        const p = pcs[k]; if (!p || p.at != null) return; sel = k; p.at = [i % n, i / n | 0]; const cs = cellsOf(p);
        if (cs.some(([x, y]) => !inb(x, y, n, n) || !R.has(y * n + x) || o.has(y * n + x))) { const bad = cs.filter(([x, y]) => inb(x, y, n, n)).map(([x, y]) => y * n + x); p.at = null; sfx.bad(); api.msg('القطعة لا تدخل هنا! جرّب تدويرها أو مكانًا آخر.'); draw(); bad.forEach(c => flash($('#tg10').querySelector(`[data-i="${c}"]`), 'lb-bad', 800)); return; }
        tone(480, .06, 'triangle'); const nx = pcs.find(q => q.at == null); if (nx) sel = nx.i; api.msg(''); draw(); if (pcs.every(q => q.at != null)) { $('#tg10').classList.add('won'); api.win(`ركّبت الشكل بـ ${N(pcs.length)} قطع كاملة، وفرغت الصينية.`); } }
      const mk = MK.attach(root.querySelector('.lb-board'), { canDrag: () => !api.ended, onPick: id => { mk.clear(); sel = +id; tone(600, .03); draw(); },
        drop: (id, slot) => { if (slot && slot[0] === 'c') tap(+slot.slice(1), +id); } });
      $('#tg10').addEventListener('click', e => { const b = e.target.closest('.tg10-c'); if (b) tap(+b.dataset.i); });
      $('#tgr').onclick = () => { const p = pcs[sel]; if (p && p.at == null) { p.shape = tgRot(p.shape); tone(520, .03); draw(); } };
      $('#tgf').onclick = () => { const p = pcs[sel]; if (p && p.at == null) { p.shape = tgFlip(p.shape); tone(520, .03); draw(); } };
      draw(); pzHook({ P, pcs, tap, draw, sel: k => { sel = k; draw(); } });
      return { hint: k => { if (k === 1) return 'ابدأ بالأطراف الضيقة من الشكل: قطع قليلة فقط تدخلها.'; const c = pcs.filter(p => !p.lock); if (!c.length) return null; const p = pick(c); pcs.forEach(q => { if (q !== p && !q.lock && cellsOf(q).some(([x, y]) => P.pieces[p.i].sol.includes(y * n + x))) q.at = null; });
          const sol = P.pieces[p.i].sol.map(c => [c % n, c / n | 0]); p.shape = tgNorm(sol); p.at = [p.shape[0][0] + Math.min(...sol.map(c => c[0])), p.shape[0][1] + Math.min(...sol.map(c => c[1]))]; p.lock = true; draw(); if (pcs.every(q => q.at != null)) api.win('اكتمل الشكل.'); return 'ثبّتُّ لك قطعة في مكانها الصحيح.'; },
        reveal: () => 'جرّب المرة الجاية البدء من الزوايا.' };
    });
  };

  /* ================================================================ 10 الخيام والأشجار — pz_tent
     Same trees, sums and solution (tnMake). Tap once for grass, twice for a tent; touching tents are marked. */
  if (GM.pz_tent && typeof tnMake === 'function') GM.pz_tent.run = function () {
    return pzPlay('pz_tent', api => {
      const P = tnMake(api.lv), n = P.n, T = new Set(P.trees), S = new Set(P.sol), st = Array(n * n).fill(0), lock = new Set();
      frame(api, { id: 'tent', lead: 'اضغط مرة للعشب ومرتين للخيمة بجانب كل شجرة، دون تلامس ولو قطريًا. الأرقام عدد الخيام في كل صف وعمود.' });
      $('#lbb').innerHTML = `<div class="tn10" id="tn10" style="--n:${n}"><i class="tn10-corner"></i>${P.cols.map((v, j) => `<b class="tn10-h col" data-c="${j}">${v}</b>`).join('')}
        ${[...Array(n).keys()].map(r => `<b class="tn10-h row" data-r="${r}">${P.rows[r]}</b>${[...Array(n).keys()].map(c => { const i = r * n + c; return T.has(i) ? `<span class="tn10-c tree">${im('tent_tree')}</span>` : `<button class="tn10-c" data-i="${i}" aria-label="خانة"></button>`; }).join('')}`).join('')}</div>`;
      const cnt = (a, i) => [...Array(n).keys()].filter(j => st[a ? j * n + i : i * n + j] === 2).length;
      function cell(i) { const b = $(`#tn10 [data-i="${i}"]`); if (!b) return; b.className = 'tn10-c' + (st[i] === 2 ? ' tent' : st[i] === 1 ? ' grass' : '') + (lock.has(i) ? ' lock' : ''); b.innerHTML = st[i] === 2 ? im('tent_tent') : st[i] === 1 ? im('tent_grass') : ''; b.setAttribute('aria-label', st[i] === 2 ? 'خيمة' : st[i] === 1 ? 'عشب' : 'خانة فارغة'); }
      function marks() { const tent = new Set(st.map((v, i) => v === 2 ? i : -1).filter(i => i >= 0)); let touching = false;
        $('#tn10').querySelectorAll('button.tn10-c').forEach(b => { const c = +b.dataset.i, x = c % n, y = c / n | 0; let bad = false; if (tent.has(c)) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && inb(x + dx, y + dy, n, n) && tent.has((y + dy) * n + x + dx)) bad = true; b.classList.toggle('bad', bad); if (bad) touching = true; });
        $('#tn10').querySelectorAll('.tn10-h.col').forEach(e => { const j = +e.dataset.c, k = cnt(1, j); e.classList.toggle('done', k === P.cols[j]); e.classList.toggle('over', k > P.cols[j]); });
        $('#tn10').querySelectorAll('.tn10-h.row').forEach(e => { const r = +e.dataset.r, k = cnt(0, r); e.classList.toggle('done', k === P.rows[r]); e.classList.toggle('over', k > P.rows[r]); });
        return touching; }
      const won = () => { const tent = st.map((v, k) => v === 2 ? k : -1).filter(k => k >= 0); return tent.length === S.size && tent.every(k => S.has(k)); };
      function tap(i) { if (api.ended || lock.has(i)) return; st[i] = (st[i] + 1) % 3; tone(st[i] === 2 ? 520 : 340, .06, st[i] === 2 ? 'triangle' : 'sine'); cell(i); const t = marks();
        api.msg(t ? 'خيمتان تتلامسان! الخيام لا تتلامس ولو قطريًا.' : '');
        if (won()) { $('#tn10').classList.add('won'); api.win(`نصبت ${N(S.size)} خيمة بجانب الأشجار وطابقت كل الأرقام.`); } }
      $('#tn10').querySelectorAll('button.tn10-c').forEach(b => b.onclick = () => tap(+b.dataset.i)); marks(); pzHook({ P, tap, st });
      return { hint: k => { if (k === 1) return 'الصف أو العمود الذي رقمه 0 كله عشب. والشجرة التي لها جار واحد فارغ فقط، خيمتها هناك.'; const c = P.sol.filter(i => st[i] !== 2); if (!c.length) return null; const i = pick(c); st[i] = 2; lock.add(i); cell(i); marks(); if (won()) api.win('اكتمل المخيم.'); return 'نصبت لك خيمة صحيحة (بإطار ذهبي).'; },
        reveal: () => { P.sol.forEach(i => { st[i] = 2; cell(i); }); marks(); return 'هذا الحل.'; } };
    });
  };
})();
