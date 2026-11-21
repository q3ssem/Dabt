/* motion-batch-1 — Atheran word puzzles rebuilt as boards you move.
   Same generators (aarMake, alyMake, actMake, arlMake), same rules, same win path (aWin), same ids and saves.
   Only the way the player answers changes: pieces are dragged (or tapped, then placed) and every clue is a pictogram. */
(function () {
  'use strict';
  if (!window.MK || typeof GM === 'undefined') return;
  const { attach } = MK;
  const glyph = (value, color='currentColor') => `<span class="board70-glyph" style="color:${color}" aria-hidden="true">${value}</span>`;
  const has = id => GM[id] && typeof pzPlay === 'function';

  /* ---------------------------------------------------------------- pictograms */
  const CAP_SEAL=['☼','☾','☆','≈','♧','⊣'];
  const CAP_COLOR=['#B5523A','#3F6F8C','#a67425','#2F7F6A','#7A4E8C','#8A5A33'];
  /* ================================================================ 1. أرشيف الرحلات — pz_aarch */
  if (has('pz_aarch') && typeof aarMake === 'function') {
    GM.pz_aarch.run = function runAArchMotion() {
      return pzPlay('pz_aarch', api => {
        const P = aarMake(api.lv), n = P.n, uc = Array(n).fill(-1), uf = Array(n).fill(-1); let miss = 0, busy = false;
        // R4 art bound to generator values: ship picture by AAR_SHIP index (ship / rowboat), captain seal = scroll with the
        // captain's own seal mark, fate = rune by AAR_F index (rune_flame = AAR_F[4] per the manifest).
        const ART = 'ui/designs_art/priority7/', SHIP_ART = i => AAR_SHIP.indexOf(P.ships[i]) % 2 ? 'prop_rowboat' : 'prop_ship';
        const FATE_ART = { 'عادت': 'rune_wave', 'اختفت': 'rune_moon', 'بقيت هناك': 'rune_star', 'أنكرت ما رأت': 'rune_flame' };
        const capChip = (x, small) => `<span class="mk-chip cap aa-cap${small ? ' sm' : ''}" style="--c:${CAP_COLOR[AAR_CAP.indexOf(P.caps[x]) % 6]}"><span class="aa-scroll"><img src="${ART}prop_manifest.png" alt="" draggable="false">${glyph(CAP_SEAL[AAR_CAP.indexOf(P.caps[x]) % 6], CAP_COLOR[AAR_CAP.indexOf(P.caps[x]) % 6])}</span><small>${P.caps[x]}</small></span>`;
        const fateChip = (f, small) => { const a = FATE_ART[P.fates[f]]; return `<span class="mk-chip fate aa-fate${small ? ' sm' : ''}">${a ? `<img class="aa-rune" src="${ART}${a}.png" alt="" draggable="false">` : `<span class="aa-rune drawn">${glyph('↤','#7A4E2C')}</span>`}<small>${P.fates[f]}</small></span>`; };
        const shipChip = r => `<span class="mk-chip ship sm aa-shipc"><img src="${ART}${SHIP_ART(r)}.png" alt="" draggable="false"><small>${P.ships[r]}</small></span>`;
        // relations as pictures: = same row · ✗ not · dotted path = sailed earlier (older row first) · two touching slots = the very next ship
        const SEQ = '<span class="mk-rel aa-seq" title="أبحر قبل" aria-label="قبل">⇠</span>';
        const NEXT = '<span class="mk-rel aa-next" title="السفينة التالية مباشرة" aria-label="التالية مباشرة">▰▱</span>';
        const NOT = '<span class="mk-rel aa-not" title="ليس" aria-label="ليس">×</span>';
        const clueHTML = c => {
          switch (c.t) {
            case 'eq': return shipChip(c.r) + glyph('=') + capChip(c.c, 1);
            case 'cn': return shipChip(c.r) + NOT + capChip(c.c, 1);
            case 'cy': return capChip(c.a, 1) + SEQ + capChip(c.b, 1);
            case 'fc': return capChip(c.c, 1) + glyph('=') + fateChip(c.f, 1);
            case 'fn': return capChip(c.c, 1) + NOT + fateChip(c.f, 1);
            case 'fr': return shipChip(c.r) + glyph('=') + fateChip(c.f, 1);
            case 'fy': return shipChip(c.r) + SEQ + fateChip(c.f, 1);
            case 'adj': return fateChip(c.f, 1) + NEXT + capChip(c.c, 1);
          } return '';
        };
        const clueSay = c => aarText(c, P);
        api.body.innerHTML = board70Sheet('aarch',`${xHead(board70Image('aarch','seal'),'أرشيف الرحلات')}
          <p class="mk-lead">اسحب ختم كل قائد ورمز كل مصير إلى سفينته. السفن مرتبة بسنة إبحارها، الأقدم أولًا. كل قرينة تضيء أخضر حين تتحقق وأحمر حين تُخالَف.</p>
          <div class="aa-key">${glyph('=')}نفسه · ${NOT}ليس · ${SEQ}أقدم من · ${NEXT}التالية مباشرة</div>
          <div class="mk-clues" id="aarcl">${P.clues.map((c, i) => `<div class="mk-clue" data-cl="${i}" role="note" aria-label="${clueSay(c)}"><i class="mk-dot"></i>${clueHTML(c)}</div>`).join('')}</div>
          <div class="mk-board aar-board" id="aarboard">
            <div class="mk-rows">${P.ships.map((s, r) => `<div class="mk-row"><div class="mk-ship aa-ship"><img src="${ART}${SHIP_ART(r)}.png" alt="" draggable="false"><b>${s}</b><small>سنة ${XAR(P.years[r])}</small></div><div class="mk-slot" data-slot="c${r}" tabindex="0" aria-label="قائد ${s}"></div><div class="mk-slot" data-slot="f${r}" tabindex="0" aria-label="مصير ${s}"></div></div>`).join('')}</div>
            <div class="mk-tray" data-tray="c" aria-label="أختام القادة"></div><div class="mk-tray" data-tray="f" aria-label="رموز المصائر"></div>
          </div>
          <div class="xkbtns"><button class="go-btn xsm alt2" id="aarclr">أعد القطع</button><button class="go-btn xsm" id="aargo">رتّب الأرشيف</button></div>`);
        const board = api.body.querySelector('#aarboard');
        const tokHTML = id => id[0] === 'c' ? `<button class="mk-tok" data-tok="${id}">${capChip(+id.slice(1))}</button>` : `<button class="mk-tok" data-tok="${id}">${fateChip(+id.slice(1))}</button>`;
        const draw = () => {
          for (let r = 0; r < n; r++) {
            const sc = board.querySelector(`[data-slot="c${r}"]`), sf = board.querySelector(`[data-slot="f${r}"]`);
            sc.innerHTML = uc[r] < 0 ? '<em>القائد</em>' : tokHTML('c' + uc[r]); sf.innerHTML = uf[r] < 0 ? '<em>المصير</em>' : tokHTML('f' + uf[r]);
            sc.classList.toggle('full', uc[r] >= 0); sf.classList.toggle('full', uf[r] >= 0);
          }
          board.querySelector('[data-tray="c"]').innerHTML = [...Array(n).keys()].filter(x => !uc.includes(x)).map(x => tokHTML('c' + x)).join('');
          board.querySelector('[data-tray="f"]').innerHTML = [...Array(n).keys()].filter(x => !uf.includes(x)).map(x => tokHTML('f' + x)).join('');
          P.clues.forEach((c, i) => { const s = aarClueStatus(c, uc, uf), e = api.body.querySelector(`[data-cl="${i}"]`); e.classList.toggle('ok', s === true); e.classList.toggle('bad', s === false); });
        };
        attach(board, {
          canDrag: () => !api.ended && !busy,
          drop: (tok, slot) => {
            const kind = tok[0], v = +tok.slice(1), arr = kind === 'c' ? uc : uf, from = arr.indexOf(v);
            if (slot == null) { if (from >= 0) arr[from] = -1; }
            else { if (slot[0] !== kind) return; const r = +slot.slice(1); if (from >= 0) arr[from] = arr[r]; arr[r] = v; }
            tone(520, .03); draw();
          }
        });
        $('#aarclr').onclick = () => { if (api.ended || busy) return; uc.fill(-1); uf.fill(-1); draw(); };
        function check() {
          if (api.ended || busy) return; if (uc.includes(-1) || uf.includes(-1)) { api.msg('ضع كل الأختام والرموز أولًا.'); return; }
          if (uc.every((v, r) => v === P.cap[r]) && uf.every((v, r) => v === P.fat[r])) { busy = true; sfx.lvl(); later(() => aWin(api, 'pz_aarch', 'عاد الأرشيف إلى ترتيبه.'), 600); return; }
          miss++; api.wrong(); const bad = P.clues.filter(c => !aarSat(c, uc, uf)).length;
          if (miss >= 3) { busy = true; P.cap.forEach((v, r) => { uc[r] = v; uf[r] = P.fat[r]; }); draw(); api.over('هذا هو الترتيب الصحيح.'); return; }
          api.msg(bad ? `ترتيبك يخالف ${arN(bad, AN.clue)}: النقوش الحمراء.` : 'كل النقوش متحققة، لكن الترتيب ليس الوحيد الممكن بعد: راجع.');
        }
        $('#aargo').onclick = check; draw(); api.msg('اسحب الأختام والرموز إلى السفن.');
        pzHook({ P, set: () => { P.cap.forEach((v, r) => { uc[r] = v; uf[r] = P.fat[r]; }); draw(); }, check, place: (tok, slot) => { const kind = tok[0], v = +tok.slice(1), arr = kind === 'c' ? uc : uf, from = arr.indexOf(v); const r = +slot.slice(1); if (from >= 0) arr[from] = arr[r]; arr[r] = v; draw(); }, state: () => ({ uc: uc.slice(), uf: uf.slice() }) });
        return {
          hint: k => {
            if (k === 1) return 'ابدأ بالنقوش التي تربط سفينة بمصير أو قائد مباشرة، ثم استخدم «قبل» و«بعد»: السفن مرتبة من الأقدم.';
            const r = uc.findIndex((v, j) => v !== P.cap[j]); if (r >= 0) { const o = uc.indexOf(P.cap[r]); if (o >= 0) uc[o] = uc[r]; uc[r] = P.cap[r]; draw(); return `ثبّت لك قائد «${P.ships[r]}».`; }
            const q = uf.findIndex((v, j) => v !== P.fat[j]); if (q >= 0) { const o = uf.indexOf(P.fat[q]); if (o >= 0) uf[o] = uf[q]; uf[q] = P.fat[q]; draw(); return `ثبّت لك مصير «${P.ships[q]}».`; } return null;
          },
          reveal: () => { P.cap.forEach((v, r) => { uc[r] = v; uf[r] = P.fat[r]; }); draw(); return 'هذا الترتيب.'; }
        };
      });
    };
  }

  /* ================================================================ 2. طبقات الزمن — pz_alayer
     The rock section stays; the dropdown bench and the tap list are gone. Each event (layer / vein / fault) is a
     token with its own mark; the player drags them onto a time line, oldest first. */
  if (has('pz_alayer') && typeof alyMake === 'function') {
    GM.pz_alayer.run = function runALayerMotion() {
      return pzPlay('pz_alayer', api => {
        const P = alyMake(api.lv), k = P.k, W = 300, Hh = 40, H = k * Hh, N = P.items.length, u = Array(N).fill(-1); let miss = 0, busy = false;
        const lay = P.ev.filter(e => e.t === 'L'), fs = P.ev.filter(e => e.t === 'F');
        const off = (li, x) => fs.reduce((s, f) => s + (li <= f.top && x > f.x * W ? 10 : 0), 0);
        // anchors where a placed card's position number appears on the section itself
        const anc = {}; lay.forEach(e => anc['L' + e.i] = [16, H - (e.i + 1) * Hh + Hh / 2 - off(e.i, 16)]);
        P.ev.filter(e => e.t === 'V').forEach(v => anc['V' + v.i] = [v.x * W + 10, H - (v.top + 1) * Hh + Hh * .55]);
        fs.forEach(f => anc['F' + f.i] = [f.x * W + 12, H - (f.top + 1) * Hh + Hh * .55]);
        const mark = e => e.t==='L'
          ? `<span class="board70-rock-mark" style="--rock:${ALY_C[e.i]}">${'أبجدهوز'[e.i]}</span>`
          : glyph(e.t==='V'?'∿':'╱',e.t==='V'?ALY_V[e.i]:'#39271d');
        const tok = j => `<button class="mk-tok" data-tok="${j}"><span class="mk-chip ev">${mark(P.items[j])}<small>${alyName(P.items[j])}</small></span></button>`;
        api.body.innerHTML = board70Sheet('alayer',`${xHead(board70Image('alayer','slate'),'طبقات الزمن')}
          <div class="mk-rules"><span>${glyph('↑')}<small>الأعلى أحدث</small></span><span>${glyph('∿')}<small>العرق أحدث مما يشقه</small></span>${fs.length ? `<span>${glyph('╱')}<small>الشق أحدث مما أزاحه</small></span>` : ''}</div>
          <div class="aly-top"><img src="ui/designs_art/priority7/prop_strata.png" alt="" width="40" height="38"><span class="aly-stat" id="alystat" aria-live="polite"></span></div>
          <div class="board70-layer-map"><canvas class="alys mk-section" id="alyMotionCanvas" role="img" aria-label="مقطع الطبقات والعروق والشقوق"></canvas><div id="alynums" aria-hidden="true"></div></div>
          <div class="mk-time"><span class="mk-end">الأقدم</span><div class="mk-line">${[...Array(N).keys()].map(q => `<div class="mk-slot tl" data-slot="${q}" tabindex="0" aria-label="الموضع ${q + 1}"><i>${XAR(q + 1)}</i></div>`).join('')}</div><span class="mk-end">الأحدث</span></div>
          <div class="mk-tray" data-tray="t" aria-label="الأحداث"></div>
          <div class="xkbtns"><button class="go-btn xsm alt2" id="alyz">أعد القطع</button><button class="go-btn xsm" id="alygo">ثبّت الترتيب</button></div>`);
        board70Layers(P,$('#alyMotionCanvas'),W,Hh,H);
        const root = api.body.querySelector('.xpaper') || api.body;
        const draw = () => {
          root.querySelectorAll('[data-slot]').forEach(s => { const q = +s.dataset.slot; s.innerHTML = u[q] < 0 ? `<i>${XAR(q + 1)}</i>` : tok(u[q]); s.classList.toggle('full', u[q] >= 0); });
          root.querySelector('[data-tray="t"]').innerHTML = [...Array(N).keys()].filter(j => !u.includes(j)).map(tok).join('');
          // the time line updates the section as cards are placed, and shows whether it is complete (not whether it is right)
          root.querySelector('#alynums').innerHTML = u.map((j, q) => { if (j < 0) return ''; const e = P.items[j], a = anc[e.t + e.i]; return a ? `<span class="board70-layer-index" style="left:${a[0]/W*100}%;top:${a[1]/(H+8)*100}%">${XAR(q+1)}</span>` : ''; }).join('');
          const placed = u.filter(j => j >= 0).length, st = root.querySelector('#alystat');
          st.textContent = placed === N ? `الخط الزمني مكتمل · ${XAR(N)} من ${XAR(N)}` : `ترتيب ناقص · ${XAR(placed)} من ${XAR(N)}`; st.classList.toggle('done', placed === N);
          root.querySelector('.mk-line').style.setProperty('--fill', placed / N);
        };
        const flash = j => { const e = P.items[j], el = root.querySelector(`[data-ev="${e.t}${e.i}"]`); if (!el) return; el.classList.remove('mk-flash'); void el.offsetWidth; el.classList.add('mk-flash'); };
        attach(root, {
          canDrag: () => !api.ended && !busy, onPick: j => flash(+j),
          drop: (t, slot) => { const j = +t, from = u.indexOf(j); if (slot == null) { if (from >= 0) u[from] = -1; } else { const q = +slot; if (from >= 0) u[from] = u[q]; u[q] = j; } flash(j); tone(360 + u.filter(x => x >= 0).length * 30, .04); draw(); }
        });
        $('#alyz').onclick = () => { if (api.ended || busy) return; u.fill(-1); draw(); };
        function check() {
          if (api.ended || busy) return; if (u.includes(-1)) { api.msg('ضع كل الأحداث على خط الزمن.'); return; }
          if (u.every((j, q) => P.items[j] === P.ev[q])) { busy = true; sfx.lvl(); later(() => aWin(api, 'pz_alayer', 'قرأت تاريخ الجذع من أوله.'), 500); return; }
          miss++; api.wrong(); const f = u.findIndex((j, q) => P.items[j] !== P.ev[q]);
          root.querySelectorAll('.mk-slot.tl').forEach((s, q) => s.classList.toggle('mk-wrong', q === f));
          if (miss >= 3) { busy = true; P.ev.forEach((e, q) => u[q] = P.items.indexOf(e)); draw(); api.over('هذا الترتيب الصحيح.'); return; }
          api.msg(`أول خطأ عند الموضع ${XAR(f + 1)}.`);
        }
        $('#alygo').onclick = check; draw(); api.msg('اسحب الأحداث إلى خط الزمن، من الأقدم.');
        pzHook({ P, set: () => { P.ev.forEach((e, q) => u[q] = P.items.indexOf(e)); draw(); }, check, place: (j, q) => { const from = u.indexOf(j); if (from >= 0) u[from] = u[q]; u[q] = j; draw(); }, state: () => u.slice() });
        return {
          hint: kk => { if (kk === 1) return 'ابدأ بالطبقات من الأسفل إلى الأعلى، ثم أدخل كل عرق أو شق بعد آخر طبقة وصل إليها.';
            const q = u.findIndex((j, i) => j < 0 || P.items[j] !== P.ev[i]); if (q < 0) return null; const j = P.items.indexOf(P.ev[q]), from = u.indexOf(j); if (from >= 0) u[from] = u[q]; u[q] = j; draw(); flash(j); return `وضعت لك الحدث رقم ${XAR(q + 1)}.`; },
          reveal: () => { P.ev.forEach((e, q) => u[q] = P.items.indexOf(e)); draw(); return 'هذا الترتيب.'; }
        };
      });
    };
  }

  /* ================================================================ 3. المدينة الحية — pz_acity  (priority-7 R4)
     The food web is drawn from the generator itself (actMake: n = 5..8 species, P.req = needs, req.or = «any one is enough»).
     Food sits above the species that live on it. Solid line = it needs ALL of these; dashed line = ANY ONE of them is enough.
     Each species is its approved picture (ACT_SP index → R4 art). The scene shows which species are dark now.
     Tap a dark species to make it the hypothesis: the dimming spreads from it, generation by generation, and every
     species where the simulation and the scene disagree is ringed. Same rule and win path (actAudit exact → aWin). */
  if (has('pz_acity') && typeof actMake === 'function') {
    const ART = 'ui/designs_art/priority7/';
    const SP_ART = ['rune_leaf', 'rune_wave', 'prop_sporebone', 'rune_moon', 'prop_biolantern', 'prop_torch', 'prop_tent', 'rune_star']; // ACT_SP[0..7]
    GM.pz_acity.run = function runACityMotion() {
      return pzPlay('pz_acity', api => {
        const P = actMake(api.lv), n = P.n, nm = i => ACT_SP[P.ord[i]][0], col = i => ACT_SP[P.ord[i]][1];
        let sel = -1, miss = 0, busy = false, sim = null, view = 'scene';
        // layout: rank = longest chain of food below it. Food on top, dependants underneath.
        const depth = Array(n).fill(0); for (let pass = 0; pass < n; pass++) for (let i = 0; i < n; i++) for (const r of P.req[i]) depth[i] = Math.max(depth[i], depth[r] + 1);
        // rows of at most three, so names never collide on 320 (same rank never links to itself, so a split row keeps food above)
        const rows = []; for (let d = 0; d <= Math.max(...depth); d++) { const r = [...Array(n).keys()].filter(i => depth[i] === d); for (let q = 0; q < r.length; q += 3) rows.push(r.slice(q, q + 3)); }
        const D = rows.length, W = 300, rowH = D > 3 ? 86 : 98, R = n > 6 ? 25 : 28, H = D * rowH + 16, pos = [];
        rows.forEach((row, d) => { const gap = W / row.length; row.forEach((i, q) => pos[i] = [W - (q + .5) * gap + (row.length < 3 && d % 2 ? 14 : 0), 14 + R + d * rowH]); }); // RTL: first on the right
        const edge = (a,b,any)=>{
          const [x,y]=pos[a],[xx,yy]=pos[b],dx=xx-x,dy=yy-y;
          const angle=Math.atan2(dy,dx),distance=Math.hypot(dx,dy);
          const inset=R+3;
          return `<span aria-hidden="true" class="ae ${any?'any':'all'}" data-e="${a}-${b}" style="left:${(x+Math.cos(angle)*inset)/W*100}%;top:${(y+Math.sin(angle)*inset)/(H+22)*100}%;width:${Math.max(0,distance-2*inset)/W*100}%;transform:rotate(${angle}rad)"></span>`;
        };
        const web=()=>{
          const edges=P.req.flatMap((parents,i)=>parents.map(a=>edge(a,i,parents.or))).join('');
          const species=pos.map(([x,y],i)=>`<button type="button" class="mk-sp ${P.al[i]?'lit':'dark'}" data-sp="${i}" aria-label="${nm(i)}: ${P.al[i]?'مضيء':'منطفئ'}" style="left:${x/W*100}%;top:${y/(H+22)*100}%;--c:${col(i)};--size:${2*R/W*100}%"><span class="disc"><img src="${ART}${SP_ART[P.ord[i]]}.png" alt="" draggable="false"></span><span class="mk-lbl">${nm(i)}</span><span class="ac-mark"></span></button>`).join('');
          return `<div class="mk-web ac-web board70-food" id="actweb" role="group" aria-label="شبكة الغذاء" style="aspect-ratio:${W}/${H+22}">${edges}${species}</div>`;
        };
        api.body.innerHTML = board70Sheet('acity',`${xHead(board70Image('acity','mushroom'),'المدينة الحية')}
          <div class="ac-top"><b>${XAR(n)} أنواع</b><button class="ac-mode" id="acmode" type="button" aria-pressed="false">المشهد الآن</button></div>
          <div class="ac-key"><span><i class="board70-legend" aria-hidden="true"></i>يحتاج <b>الكل</b></span><span><i class="board70-legend any" aria-hidden="true"></i><b>أحدها</b> يكفي</span><span><i class="board70-legend dot" aria-hidden="true"></i>منطفئ</span></div>
          <p class="mk-lead">نوع واحد اختفى أولًا وأطفأ غيره. المس نوعًا منطفئًا لتحاكي اختفاءه، وقارن الانتشار بالمشهد.</p>
          ${web()}
          <div class="mk-simout" id="actsim" aria-live="polite">لا فرضية بعد.</div>
          <div class="xkbtns"><button class="go-btn xsm" id="actgo">هذا اختفى أولًا</button></div>`);
        const root = api.body.querySelector('.xpaper') || api.body;
        const paint = () => {
          const showSim = sim && view === 'sim';
          root.querySelectorAll('.mk-sp').forEach(g => { const i = +g.dataset.sp; g.classList.remove('sim-off', 'mis', 'cause');
            g.classList.toggle('dark', showSim ? !sim.predicted[i] : !P.al[i]); g.classList.toggle('lit', showSim ? sim.predicted[i] : P.al[i]);
            if (sim && (sim.extra.includes(i) || sim.missing.includes(i))) g.classList.add('mis');
            if (i === sel) g.classList.add('cause'); g.querySelector('.ac-mark').textContent = sim && (sim.extra.includes(i) || sim.missing.includes(i)) ? '!' : ''; });
          const al = showSim ? sim.predicted : P.al;
          root.querySelectorAll('.ae').forEach(e => { const [a] = e.dataset.e.split('-').map(Number); e.classList.toggle('cut', !al[a]); });
          const m = $('#acmode'); m.disabled = !sim; m.textContent = view === 'sim' ? 'بعد الانطفاء' : 'المشهد الآن'; m.setAttribute('aria-pressed', view === 'sim');
          m.classList.toggle('sim', view === 'sim');
          const out = $('#actsim'); out.classList.toggle('good', !!(sim && sim.exact)); out.classList.toggle('bad', !!(sim && !sim.exact));
          out.innerHTML = !sim ? 'لا فرضية بعد.' : sim.exact ? `<b>أول نوع اختفى: ${nm(sel)}</b> · الانتشار يطابق المشهد تمامًا.` : `<b>لو اختفى ${nm(sel)} أولًا</b> · ${XAR(sim.mismatch)} ${sim.mismatch === 1 ? 'نوع لا يطابق' : 'أنواع لا تطابق'} المشهد (عليها !).`;
        };
        const simulate = () => { if (sel < 0) { sim = null; view = 'scene'; paint(); return; } sim = actAudit(P, sel); view = 'sim'; paint();
          // the dimming spreads along the web, one generation at a time
          const gens = [], al = Array(n).fill(true); al[sel] = false; let cur = [sel];
          while (cur.length) { gens.push(cur); const nx = []; for (let i = 0; i < n; i++) { if (!al[i]) continue; const Rq = P.req[i]; const ok = !Rq.length || (Rq.or ? Rq.some(r => al[r]) : Rq.every(r => al[r])); if (!ok) { al[i] = false; nx.push(i); } } cur = nx; }
          root.querySelectorAll('.mk-sp').forEach(g => g.classList.remove('pulse'));
          gens.forEach((g, q) => later(() => g.forEach(i => { const el = root.querySelector(`[data-sp="${i}"]`); if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); } }), q * 340)); tone(240, .05); };
        const pick = i => { if (api.ended || busy) return; if (P.al[i]) { api.msg(`«${nm(i)}» ما زال مضيئًا في المشهد: الأول اختفى، فهو منطفئ.`); return; } sel = sel === i ? -1 : i; sfx.pop(); simulate(); };
        root.querySelector('#actweb').addEventListener('click', e => { const g = e.target.closest('.mk-sp'); if (g) pick(+g.dataset.sp); });
        $('#acmode').onclick = () => { if (!sim) return; view = view === 'sim' ? 'scene' : 'sim'; paint(); };
        function check() { if (api.ended || busy) return; if (sel < 0) { api.msg('المس نوعًا منطفئًا أولًا.'); return; } const audit = actAudit(P, sel);
          if (audit.exact) { busy = true; sfx.lvl(); view = 'scene'; paint(); root.querySelectorAll('.mk-sp.dark').forEach((g, q) => later(() => { if (+g.dataset.sp !== P.gone) g.classList.add('relit'); }, 300 + q * 250)); later(() => aWin(api, 'pz_acity', 'عرفت ما اختفى. وحين أعادت الفوانيس توزيع الضوء، فهمت: هذه ليست غابة… هذه مدينة.'), 1200); return; }
          miss++; api.wrong(); if (miss >= 3) { busy = true; sel = P.gone; simulate(); api.over(`اختفى أولًا: ${nm(P.gone)}.`); return; } simulate(); api.msg('الفرضية لا تعيد إنتاج سلسلة الانطفاء كاملة.'); }
        $('#actgo').onclick = check; paint(); api.msg('من اختفى أولًا؟');
        pzHook({ P, pick: i => { sel = i; simulate(); }, tap: pick, check, simulate, state: () => ({ sel, view, sim }) });
        return {
          hint: kk => { if (kk === 1) return 'الفرضية الصحيحة وحدها تطفئ الأنواع المنطفئة نفسها، ولا تطفئ أي نوع مضيء. الخط المتقطع: يكفي أن يبقى واحد منها.';
            if (kk >= 3) return `الفرض الصحيح: ${nm(P.gone)}.`;
            const ex = [...Array(n).keys()].filter(i => !P.al[i] && i !== P.gone).map(i => ({ i, d: actAudit(P, i).mismatch })).sort((a, b) => b.d - a.d)[0]; if (!ex) return null; return `لو كان ${nm(ex.i)} هو الأول، لاختلف ${XAR(ex.d)} من الأنواع عن المشهد: استبعده.`; },
          reveal: () => { sel = P.gone; simulate(); return `اختفى ${nm(P.gone)}.`; }
        };
      });
    };
  }

  /* ================================================================ 4. أرشيف الآثار الأولى — pz_arelic
     Each source is a strip of four pictures (who / when / why / where). Drag a source onto the comparison stone:
     every other source lights the pictures where it disagrees with it. The true source is the one that matches
     the hard evidence and differs from every other source in exactly one picture. Placing it seals the truth. */
  if (has('pz_arelic') && typeof arlMake === 'function') {
    GM.pz_arelic.run = function runARelicMotion() {
      return pzPlay('pz_arelic', api => {
        const P = arlMake(api.lv), u = Array(P.na).fill(-1); let miss = 0, busy = false, cmp = -1;
        // R4 art: every source is a diary page (prop_diary); each piece shows its value picture with the rune of its
        // attribute (arlMake.A[0] moon, A[1] wave, A[2] star per the manifest; A[3] keeps a drawn ring).
        const ART = 'ui/designs_art/priority7/', RUNE = ['rune_moon', 'rune_wave', 'rune_star'];
        const pic = (j, v, cls = '') => `<span class="mk-pic arl-pic ${cls}" title="${P.A[j].n}: ${P.A[j].v[v]}">${RUNE[j] ? `<img class="arl-rune" src="${ART}${RUNE[j]}.png" alt="" draggable="false">` : '<i class="arl-rune ring"></i>'}${glyph(['◇','○','△','□'][v])}<small>${P.A[j].v[v]}</small>${cls.includes('diff') ? '<em class="arl-x">تناقض</em>' : ''}</span>`;
        const strip = (i, diffMask) => `<span class="mk-strip" style="--na:${P.na}">${P.S[i].map((v, j) => pic(j, v, diffMask && diffMask[j] ? 'diff' : '')).join('')}</span>`;
        const LBL = ['أ', 'ب', 'ج', 'د', 'هـ'];
        const srcHead = (i, extra = '') => `<b class="arl-src"><img src="${ART}prop_diary.png" alt="" draggable="false"><span>المصدر ${LBL[i]}<small>${ARL_SRC[i]}</small></span>${extra}</b>`;
        const srcTok = (i, extra = '', mask) => `<button class="mk-tok src" data-tok="${i}"><span class="mk-chip src">${srcHead(i, extra)}${strip(i, mask)}</span></button>`;
        api.body.innerHTML = board70Sheet('arelic',`${xHead(board70Image('arelic','seal'),'أرشيف الآثار الأولى')}
          <div class="arl-top"><span class="arl-stat" id="arlstat">أضف مصدرًا</span></div>
          <div class="mk-rules"><span><small>مصدر واحد صادق في كل شيء · كل مصدر آخر يخطئ في قطعة واحدة فقط</small></span></div>
          <div class="mk-attr" style="--na:${P.na}">${P.A.map((a, j) => `<small>${RUNE[j] ? `<img src="${ART}${RUNE[j]}.png" alt="" width="16" height="16">` : ''}${a.n}</small>`).join('')}</div>
          ${P.ev.length ? `<div class="mk-evid"><b>${board70Image('arelic','seal')} دليل مؤكد</b>${P.ev.map(e => pic(e.k, e.v, 'fixed')).join('')}</div>` : ''}
          <div class="mk-tray srcs" data-tray="s" aria-label="المصادر"></div>
          <div class="mk-cmp"><div class="mk-slot cmp" data-slot="cmp" tabindex="0" aria-label="منصة المقارنة"><em>منصة المقارنة: اسحب مصدرًا هنا</em></div><div id="arlcmp" class="mk-cmpout" aria-live="polite"></div></div>
          <div class="mk-truth"><b>صف الحقيقة المعتمد</b><div class="mk-slot truth" data-slot="truth" tabindex="0" aria-label="الحقيقة"><em>اسحب المصدر الصادق من المنصة إلى هنا</em></div></div>
          <div class="xkbtns"><button class="go-btn xsm" id="arlgo">ثبّت الاستنتاج</button></div>`);
        const root = api.body.querySelector('.xpaper') || api.body;
        const truthSrc = () => P.S.findIndex(s => s.every((v, j) => v === u[j]));
        const draw = () => {
          const t = truthSrc(), slotT = root.querySelector('[data-slot="truth"]'), slotC = root.querySelector('[data-slot="cmp"]'), full = !u.includes(-1);
          slotT.innerHTML = !full ? '<em>اسحب المصدر الصادق من المنصة إلى هنا</em>' : `<span class="arl-tline">${t >= 0 ? `المصدر ${LBL[t]}` : ''}</span><span class="mk-strip big" style="--na:${P.na}">${u.map((v, j) => pic(j, v)).join('')}</span>`; slotT.classList.toggle('full', full);
          // the source on the stone shows its pieces large; every other source marks, inside its own story, where it contradicts it
          slotC.innerHTML = cmp < 0 ? '<em>منصة المقارنة: اسحب مصدرًا هنا</em>' : `<button class="mk-tok src on" data-tok="${cmp}"><span class="mk-chip src">${srcHead(cmp, '<i class="arl-added">على المنصة</i>')}<span class="mk-strip big" style="--na:${P.na}">${P.S[cmp].map((v, j) => pic(j, v)).join('')}</span></span></button>`; slotC.classList.toggle('full', cmp >= 0);
          root.querySelector('[data-tray="s"]').innerHTML = P.S.map((_, i) => i).filter(i => i !== cmp).map(i => {
            if (cmp < 0) return srcTok(i);
            const mask = P.S[i].map((v, j) => v !== P.S[cmp][j]), d = mask.filter(Boolean).length;
            return srcTok(i, `<i class="arl-n ${d === 1 ? 'one' : 'many'}">${XAR(d)} تناقض</i>`, mask).replace('mk-tok src"', `mk-tok src ${d === 1 ? 'one' : 'many'}"`);
          }).join('');
          const st = root.querySelector('#arlstat'); st.textContent = full ? `ثبّت الاستنتاج · المصدر ${t >= 0 ? LBL[t] : ''}` : cmp >= 0 ? `على المنصة · المصدر ${LBL[cmp]}` : 'أضف مصدرًا'; st.className = 'arl-stat ' + (full ? 'lock' : cmp >= 0 ? 'add' : '');
          const out = $('#arlcmp'); if (cmp < 0) { out.innerHTML = ''; out.className = 'mk-cmpout'; return; }
          const evBad = P.ev.filter(e => P.S[cmp][e.k] !== e.v).length, diffs = P.S.map((r, j) => j === cmp ? 0 : r.filter((v, k) => v !== P.S[cmp][k]).length).filter((_, j) => j !== cmp), ok = !evBad && diffs.every(d => d === 1);
          out.className = 'mk-cmpout ' + (ok ? 'good' : 'bad'); out.innerHTML = ok ? '<b>متسق</b> · يطابق الدليل، وكل مصدر آخر يناقضه في قطعة واحدة.' : `<b>غير متسق</b> · ${evBad ? 'يخالف الدليل المؤكد' : ''}${evBad && diffs.some(d => d !== 1) ? ' و' : ''}${diffs.some(d => d !== 1) ? 'بعض المصادر تناقضه في أكثر من قطعة' : ''}.`;
        };
        attach(root, {
          canDrag: () => !api.ended && !busy,
          drop: (t, slot) => { const i = +t; if (slot === 'cmp') cmp = i; else if (slot === 'truth') P.S[i].forEach((v, j) => u[j] = v); else if (slot == null && i === cmp) cmp = -1; tone(420, .04); draw(); }
        });
        function check() { if (api.ended || busy) return; if (u.includes(-1)) { api.msg('ضع مصدرًا في خانة الحقيقة أولًا.'); return; }
          if (u.every((v, j) => v === P.T[j])) { busy = true; sfx.lvl(); later(() => aWin(api, 'pz_arelic', `الحقيقة عند «${ARL_SRC[P.tr]}».`), 500); return; }
          miss++; api.wrong(); if (miss >= 3) { busy = true; P.T.forEach((v, j) => u[j] = v); cmp = P.tr; draw(); api.over(`المصدر الصادق: ${ARL_SRC[P.tr]}.`); return; }
          api.msg('هذا المصدر لا يصمد: ضعه على منصة المقارنة وانظر كم صورة يختلف فيها كل مصدر عنه.'); }
        $('#arlgo').onclick = check; draw(); api.msg('قارن المصادر على المنصة.');
        pzHook({ P, set: () => { P.T.forEach((v, j) => u[j] = v); draw(); }, check, compare: i => { cmp = i; draw(); }, toTruth: i => { P.S[i].forEach((v, j) => u[j] = v); draw(); } });
        return {
          hint: kk => { if (kk === 1) return 'ضع كل مصدر على منصة المقارنة: المصدر الصادق يجعل كل المصادر الأخرى تضيء صورة واحدة فقط.';
            if (kk === 2) { const bad = P.S.map((_, i) => i).filter(i => i !== P.tr); const i = bad[0]; cmp = i; draw(); return `ليس «${ARL_SRC[i]}»: انظر كم صورة تختلف عنه.`; }
            cmp = P.tr; draw(); return `جرّب «${ARL_SRC[P.tr]}» على المنصة.`; },
          reveal: () => { P.T.forEach((v, j) => u[j] = v); cmp = P.tr; draw(); return `المصدر الصادق: ${ARL_SRC[P.tr]}.`; }
        };
      });
    };
  }
  window.ATHRAN_MOTION = { CAP_SEAL, CAP_COLOR };
})();
