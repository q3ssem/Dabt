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

  function frame(api, { id, layout, lead, top, under, main }) {
    api.body.innerHTML = `<div class="lb" data-lb="${id}"${layout ? ` data-layout="${layout}"` : ''}>
      ${lead ? `<p class="lb-lead">${lead}</p>` : ''}${top || ''}
      <div class="lb-board" id="lbb"></div>${under || ''}
      ${main ? `<div class="lb-bar"><button class="lb-main go" type="button" id="lbgo">${main}</button></div>` : ''}</div>`;
    return api.body.querySelector('.lb');
  }
  const flash = (el, cls = 'lb-bad', ms = 900) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };

  /* Story clues stay in HTML. The illustrated first two scenes use stateful pieces. */
  if (GM.pz_rid) {
    const originalRiddle = GM.pz_rid.run;
    GM.pz_rid.run = function () {
      const i = RUN && RUN.rid != null ? RUN.rid
        : RUN && RUN.daily ? seeded(+dayKey().replace(/-/g, ''))() * RIDDLES.length | 0 : ridNext();
      if (i > 2) return originalRiddle.apply(this, arguments);
      return pzPlay('pz_rid', api => {
        const [question, answer, , hints, explanation] = RIDDLES[i];
        const finish = () => {
          pzState().rid[i] = 1;
          api.win(explanation);
        };
        api.body.innerHTML = `<section class="rid-act ${['rid-warehouse','rid-race','rid-measure'][i]}"><p class="rid-act-clue">${question}</p>
          <div class="rid-act-board"></div></section>`;
        const stage = api.body.querySelector('.rid-act-board');
        if (i === 0) {
          const labels = ['تفاح', 'برتقال', 'مختلط'];
          const truth = Math.random() < .5 ? [1,2,0] : [2,0,1];
          const placed = [-1,-1,-1];
          let opened = false;
          const fruits = kind => {
            const keys = kind === 2 ? ['apple','orange'] : [kind === 0 ? 'apple' : 'orange'];
            return keys.map(key => piece('rid','fruit_'+key)).join('');
          };
          const draw = () => {
            stage.innerHTML = `<div class="rid-act-crates">${labels.map((label,index)=>`<div class="rid-act-crate">
              <button type="button" data-open="${index}" ${opened ? 'disabled' : ''} aria-label="خذ ثمرة من صندوق ${label}">
                ${piece('rid','crate_base')}${piece('rid',opened&&index===2?'crate_lid_open':'crate_lid_closed','rid-act-lid')}
                <b>${label}</b></button>
              ${opened ? `<button type="button" class="rid-act-slot" data-slot="${index}" aria-label="التصنيف الجديد لصندوق ${label}">${placed[index]<0?'ضع بطاقة':fruits(placed[index])+labels[placed[index]]}</button>` : ''}
              </div>`).join('')}</div>
              ${opened ? `<div class="rid-act-sample" role="status">${fruits(truth[2])}<span>الثمرة المسحوبة</span></div>
                <div class="rid-act-labels" data-tray>${labels.map((label,index)=>placed.includes(index)?'':`<button type="button" data-tok="${index}">${fruits(index)}${label}</button>`).join('')}</div>
                <button type="button" class="go-btn" id="ridactcheck">افحص البطاقات</button>` : ''}`;
            stage.querySelectorAll('[data-open]').forEach(button => button.onclick = () => {
              if (opened || api.ended) return;
              if (+button.dataset.open !== 2) {
                api.wrong();
                api.msg('ثمرة واحدة من هذا الصندوق لا تكفي. تذكّر أن كل الملصقات خاطئة.');
                return;
              }
              opened = true;
              draw();
              api.msg('استعمل الثمرة لتصحيح البطاقات الثلاث.');
              stage.querySelector('[data-tok]')?.focus();
            });
            const check = stage.querySelector('#ridactcheck');
            if (check) check.onclick = () => {
              if (api.ended) return;
              if (placed.includes(-1)) {api.msg('ضع بطاقة على كل صندوق.');return;}
              if (placed.every((value,index)=>value===truth[index])) {finish();return;}
              api.wrong();
              api.msg('أحد التصنيفات لم يطابق القرائن. اضغط على بطاقة لإعادتها إلى الطاولة.');
            };
            stage.querySelectorAll('[data-slot]').forEach(slot => slot.onclick = () => {
              if (api.ended || stage.classList.contains('mk-picking') || placed[+slot.dataset.slot]<0) return;
              placed[+slot.dataset.slot] = -1;
              draw();
            });
          };
          MK.attach(stage, {canDrag:()=>opened&&!api.ended, drop:(token,slot)=>{
            if (!opened || api.ended || slot===null) return;
            placed[+slot]=+token;
            draw();
            stage.querySelector(`[data-slot="${slot}"]`)?.focus({preventScroll:true});
          }});
          draw();
          api.msg('اختر الصندوق الذي ستأخذ منه ثمرة واحدة.');
        } else if (i === 1) {
          const portraits=['char_rawaa','char_ward','char_nuha'];
          stage.innerHTML=`<div class="rid-act-track">${portraits.map((asset,index)=>`<button type="button" data-slot="${index}" aria-label="المركز ${N(index+1)}"><b>${N(index+1)}</b>${im(asset)}<span>${index===2?'أنت':'متسابق'}</span></button>`).join('')}</div>
            <div class="rid-act-labels" data-tray><button type="button" data-tok="runner">${im('char_nuha')} حرّك متسابقك</button></div>`;
          const enter = slot => {
            if (api.ended) return;
            if (slot!=='1') {api.wrong();api.msg('تجاوزت صاحب المركز الثاني فقط. جرّب موضعًا آخر.');return;}
            const track=stage.querySelector('.rid-act-track'), places=track.querySelectorAll('[data-slot]');
            const first=places[1].querySelector('img'), second=places[2].querySelector('img');
            const before = second.getBoundingClientRect(), after = first.getBoundingClientRect();
            [first.src,second.src]=[second.src,first.src];
            places[1].querySelector('span').textContent='أنت';
            places[2].querySelector('span').textContent='متسابق';
            if (!matchMedia('(prefers-reduced-motion: reduce)').matches) first.animate([
              {transform:`translateX(${before.left-after.left}px)`},{transform:'none'}
            ],{duration:420,easing:'ease-out'});
            later(finish,470);
            stage.querySelectorAll('button').forEach(button=>button.disabled=true);
          };
          MK.attach(stage,{canDrag:()=>!api.ended,drop:(_,slot)=>{if(slot!==null)enter(slot);}});
          api.msg('اسحب متسابقك إلى المركز الذي يصل إليه، أو اختره ثم اضغط المركز.');
        } else {
          const people = ['سارة','نورة','هند','ليلى'];
          const artwork = ['char_rawaa','char_ward','char_nuha','char_rawaa'];
          const expected = [3,0,1,2], rack = [-1,-1,-1,-1];
          const token = i => `<button type="button" data-tok="${i}" class="rid-portrait rid-person-${i}">${im(artwork[i])}<span>${people[i]}</span></button>`;
          const draw = () => {
            stage.innerHTML = `<div class="rid-lengths">${rack.map((i,j)=>`<div class="rid-length" data-slot="${j}" tabindex="0" role="button" aria-label="الموضع ${N(j+1)}">
              <b>${['الأطول','٢','٣','الأقصر'][j]}</b>${i<0?'<span class="rid-empty">ضع هنا</span>':`<span class="rid-person-${i}">${im(artwork[i])}${people[i]}</span>`}</div>`).join('')}</div>
              <div class="rid-act-labels" data-tray>${people.map((_,i)=>rack.includes(i)?'':token(i)).join('')}</div>
              <button type="button" class="go-btn" id="ridmeasurecheck">افحص الترتيب</button>`;
            stage.querySelectorAll('[data-slot]').forEach(slot => slot.onclick=()=>{
              if (api.ended || stage.classList.contains('mk-picking')) return;
              rack[+slot.dataset.slot] = -1;
              draw();
            });
            stage.querySelector('#ridmeasurecheck').onclick = () => {
              if (api.ended) return;
              if (rack.includes(-1)) {api.msg('رتّب الشخصيات الأربع أولًا.');return;}
              if (rack.every((i,j)=>i===expected[j])) {finish();return;}
              api.wrong();
              api.msg('راجع القرائن ومواضع الشخصيات. اضغط على أي موضع لإفراغه.');
            };
          };
          MK.attach(stage,{canDrag:()=>!api.ended,drop:(id,slot)=>{
            if (slot===null || api.ended) return;
            rack[+slot]=+id;
            draw();
            stage.querySelector(`[data-slot="${slot}"]`)?.focus({preventScroll:true});
          }});
          draw();
          api.msg('رتّب الشخصيات من الأطول إلى الأقصر بحسب القرائن.');
        }
        return {hint:n=>hints[n-1],reveal:()=>`${answer}. ${explanation}`};
      });
    };
  }

  /* ================================================================ 02 عبور النهر — pz_river */
  if (GM.pz_river && typeof rvMake === 'function') GM.pz_river.run = function () {
    return pzPlay('pz_river', api => {
      if (api.authored) return window.mlAuthoredStages.river(api, frame);
      const P = rvMake(api.lv), n = P.it.length, F = 1 << n, goal = (1 << (n + 1)) - 1; let s = 0, boat = new Set(), moves = 0, busy = false;
      const eats = P.conf.map(([a, b]) => `${RVN[P.it[a]]} ${P.it[a] === 'hen' ? 'تأكل' : 'يأكل'} ${RVN[P.it[b]]}`).join('، ');
      const root = frame(api, { id: 'river', layout: 'adventure',
        lead: `انقل الجميع إلى المرج الأخضر. أقل حل: ${N(P.min)} رحلات.`,
        top: `<p class="lb-rule">${eats}. حمولة القارب: المزارع ومعه حتى ${N(P.cap)}.</p>` });
      const sound = sfx.roundScene?.();
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
      $('#lbb').innerHTML = `<div class="rv10">
        <div class="rv10-landscape" aria-hidden="true"></div>
        <div class="rv10-nature" aria-hidden="true"><i class="rv10-glint"></i></div>
        <div class="rv10-flight" aria-hidden="true"></div>
        <section class="rv10-bank" data-slot="bank0" aria-label="ضفة البداية"><h4>ضفة البداية</h4><div class="rv10-items" id="rvb0"></div></section>
        <div class="rv10-water"><small id="rvside" role="status" aria-live="polite"></small></div>
        <button type="button" id="lbgo" class="pzhb rv10-cross" data-fit-primary aria-label="اعبر النهر" title="اعبر النهر"><span>اعبر النهر</span></button>
        <section class="rv10-bank goal" data-slot="bank1" aria-label="ضفة الوصول"><h4>ضفة الوصول</h4><div class="rv10-items" id="rvb1"></div></section>
        <div class="rv10-boat" data-slot="boat" aria-label="القارب"><div class="rv10-rig" aria-hidden="true"></div><div class="rv10-load" id="rvld"></div></div></div>`;
      const crossButton = $('#lbgo');
      const scene = root.querySelector('.rv10');
      const vessel = scene.querySelector('.rv10-boat');
      const flight = scene.querySelector('.rv10-flight');
      const crossingMs = () => reduceMotion.matches ? 80 : 820;
      const moor = side => vessel.style.setProperty('--dock-target', side ? 'var(--dock-right)' : 'var(--dock-left)');
      const fs = () => (s & F ? 1 : 0);
      const stageOne = ['wolf', 'sheep', 'grass'];
      const passengerPath = (animal, state) => DESIGNS + (stageOne.includes(animal)
        ? `river_stage1/03_passengers/${animal}_${state}.png`
        : `river_stage2/passengers/${animal}_${state}.png`);
      const rig = root.querySelector('.rv10-rig');
      function boatArt(side = fs()) {
        const facing = side ? 'return' : 'go';
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
        const art = `<img src="${passengerPath(animal, state)}" alt="" draggable="false">`;
        return `<button class="mk-tok rv10-it${on ? ' inb' : ''}" data-tok="${i}" aria-label="${RVN[animal]}${on ? ' في القارب' : ''}">${art}</button>`;
      }
      function draw() { const f = fs();
        for (const side of [0, 1]) $('#rvb' + side).innerHTML = P.it.map((k, i) => (s >> i & 1) === side && !boat.has(i) ? tok(i, false) : '').join('');
        $('#rvld').innerHTML = [...boat].map(i => tok(i, true)).join(''); boatArt(); $('#rvside').textContent = f ? 'عند اليمين' : 'عند اليسار';
        scene.classList.toggle('at1', !!f);
        moor(f);
        scene.querySelectorAll('.rv10-bank .rv10-it').forEach(e => {
          const i = +e.dataset.tok;
          e.setAttribute('aria-disabled', String((s >> i & 1) !== f));
        });
      }
      function animatePassenger(i, from, to) {
        if (reduceMotion.matches || !from || !to) return;
        const bounds = flight.getBoundingClientRect();
        const animal = P.it[i];
        const ghost = document.createElement('img');
        ghost.src = passengerPath(animal, 'boarding');
        ghost.alt = '';
        ghost.style.cssText = `left:${from.left-bounds.left}px;top:${from.top-bounds.top}px;width:${from.width}px;height:${from.height}px`;
        flight.append(ghost);
        const x = to.left - from.left + (to.width - from.width) / 2;
        const y = to.top - from.top + (to.height - from.height) / 2;
        const lift = Math.min(40, Math.max(12, Math.abs(x) * .33));
        const angle = x < 0 ? -12 : 12;
        const target = scene.querySelector(`[data-tok="${i}"] img`);
        target.classList.add('in-flight');
        const animation = ghost.animate([
          { transform: 'translate(0,0) scale(1.04,.91)' },
          { transform: `translate(${x*.48}px,${y*.48-lift}px) rotate(${angle}deg)`, offset: .48 },
          { transform: `translate(${x}px,${y}px) scale(1.04,.95)` }
        ], {duration: 340, easing: 'cubic-bezier(.28,.55,.52,1)'});
        cleanup.push(() => animation.cancel());
        animation.finished.catch(() => {}).then(() => {
          ghost.remove();
          target.classList.remove('in-flight');
        });
      }
      const passengerRect = i => scene.querySelector(`[data-tok="${i}"] img`)?.getBoundingClientRect();
      function tap(i) {
        if (busy || api.ended) return;
        const from = passengerRect(i);
        if (boat.has(i)) boat.delete(i);
        else {
          if ((s >> i & 1) !== fs()) { api.msg('القارب على الضفة الأخرى.'); return; }
          if (boat.size >= P.cap) {
            api.msg(`القارب يتسع للمزارع و${P.cap === 1 ? 'واحد فقط' : P.cap === 2 ? 'اثنين فقط' : 'ثلاثة فقط'}.`);
            sfx.bad();
            flash(vessel);
            return;
          }
          boat.add(i);
        }
        sound?.play(boat.has(i) ? 'river.board' : 'river.unboard');
        draw();
        animatePassenger(i, from, passengerRect(i));
      }
      scene.addEventListener('keydown', event => {
        const token = event.target.closest('.rv10-it');
        if (!token || (event.key !== 'Enter' && event.key !== ' ')) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat || token.getAttribute('aria-disabled') === 'true') return;
        tap(+token.dataset.tok);
        scene.querySelector(`[data-tok="${token.dataset.tok}"]`)?.focus({ preventScroll: true });
      }, true);
      const mk = MK.attach(scene, { canDrag: () => !busy && !api.ended, onPick: id => { mk.clear(); tap(+id); },
        drop: (id, slot) => { const i = +id; if (slot === 'boat' ? !boat.has(i) : boat.has(i)) tap(i); } });
      function cross() { if (busy || api.ended) return; let m = 0; boat.forEach(i => m |= 1 << i); const t = s ^ F ^ m; moves++; busy = true;
        boatArt(!!(t & F));
        moor(t & F);
        scene.classList.add('sail'); vessel.setAttribute('aria-busy', 'true'); crossButton.disabled = true;
        sound?.play('river.cross');
        later(() => { const arrived = [...boat]; const seats = arrived.map(passengerRect); s = t; boat.clear(); busy = false; scene.classList.remove('sail'); vessel.removeAttribute('aria-busy'); const f = fs(), eat = P.conf.find(([a, c]) => (s >> a & 1) === (s >> c & 1) && (s >> a & 1) !== f); draw();
          arrived.forEach((i, index) => animatePassenger(i, seats[index], passengerRect(i)));
          if (s !== goal) sound?.play('river.dock');
          if (eat) { busy = true; eat.forEach(i => { const e = root.querySelector(`.rv10-bank [data-tok="${i}"]`); if (e) e.classList.add('lb-bad', 'eat'); });
            api.msg(`${RVN[P.it[eat[0]]]} ${P.it[eat[0]] === 'hen' ? 'أكلت' : 'أكل'} ${RVN[P.it[eat[1]]]}! تُرك معه دون المزارع. نبدأ من جديد.`); api.wrong();
            later(() => { s = 0; moves = 0; busy = false; crossButton.disabled = false; draw(); api.msg(`حاول مرة ثانية. أقل حل: ${N(P.min)} رحلات.`); }, 1700); return; }
          if (s === goal) {
            root.querySelector('.rv10').classList.add('won');
            busy = true;
            later(() => api.win(`عبرت الجميع في ${arN(moves, AN.trip)}، وأقل حل ممكن ${arN(P.min, AN.trip)}.`), reduceMotion.matches ? 0 : 350);
            sfx.roundScene?.().play('river.dock');
          }
          else { crossButton.disabled = false; api.msg(`الرحلات: ${N(moves)} · أقل حل: ${N(P.min)}`); }
        }, crossingMs()); }
      crossButton.onclick = cross; draw(); api.msg(`أقل حل: ${N(P.min)} رحلات.`);
      pzHook({ P, tap, cross, s: () => s, boat: () => [...boat], moves: () => moves });
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
      const kind = red ? 'rescue' : v.len === 3 ? 'truck' : 'cargo';
      return `<span class="rh10" data-vehicle="${kind}">${im('rush-fitted/' + asset + (v.h ? '_h' : '_v'), 'rh10-img')}</span>`;
    };
    GM.pz_rush.run = function () {
      return pzPlay('pz_rush', api => {
        const P = api.authored ? window.mlAuthoredStages.parking(api.authored.board) : rhMake(api.lv);
        const sound = sfx.roundScene?.();
        const R = rushEngine(api, P, m => api.win(`أخرجت السيارة في ${arN(m, AN.mv)}، والحل الأمثل ${arN(P.min, AN.mv)}.`), {
          paintCar,
          play(event, vehicle, delay) {
            const clip = event === 'move' ? (vehicle.len === 3 ? 'rush.truck' : 'rush.car') : 'rush.' + event;
            sound?.play(clip, delay);
          }
        });
        const lot = api.body.firstElementChild;
        const holder = frame(api, { id: 'rush', layout: 'square',
          lead: `اسحب كل مركبة على محورها. المخرج يمين صف السيارة الحمراء. أقل حل: ${N(P.min)} حركة.` });
        holder.querySelector('#lbb').append(lot);
        return R;
      });
    };
  }

  /* ================================================================ 04 التماثيل الدوّارة — pz_stat
     Same matrix R, same presses. Each statue is the guardian on its pedestal; the gold diamond marks its target
     direction, the green dot its current direction. */
  if (GM.pz_stat && typeof stMake === 'function') GM.pz_stat.run = function () {
    return pzPlay('pz_stat', api => {
      const P = api.authored ? window.mlAuthoredStages.statues(api.authored.board) : stMake(api.lv);
      const n = P.n; let s = P.s.slice(), presses = 0, mode = 1; const ang = P.s.map((d, i) => (P.tgt[i] + d) * 90);
      const rule = P.twist ? 'الضغط يدير التمثال يمينًا وجيرانه المرتبطين يسارًا ربع لفة' : P.R.some(v => v.includes(2)) ? 'الضغط يدير التمثال ربع لفة، وجاره المرتبط نصف لفة' : 'الضغط يدير التمثال وجيرانه المرتبطين ربع لفة في الاتجاه نفسه';
      const sound = sfx.roundScene?.();
      const poses = ['north', 'east', 'south', 'west'].map(pose => DESIGNS + `work_review/pz_stat/guardian--${pose}.png`);
      poses.forEach(path => { new Image().src = path; });
      const compassRules = P.reversible ? ' بدّل اتجاه البوصلة في الوسط لعكس دوران التماثيل المرتبطة.' : '';
      frame(api, { id: 'stat', layout: 'mechanical', lead: api.authored ? 'طابق مؤشر اتجاه كل تمثال مع ماسته الذهبية. تضيء التماثيل التي تتأثر بكل ضغطة.' + compassRules : `طابق مؤشر اتجاه التمثال الأخضر مع الماسة الذهبية. ${rule}${P.ring ? '، والتماثيل في حلقة مغلقة' : ''}.` });
      const radius = 32;
      const pos = Array.from({length: n}, (_, i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / n;
        return [50 + radius * Math.cos(a), 55 + radius * .78 * Math.sin(a)];
      });
      const sz = n <= 4 ? 26 : n <= 5 ? 24 : 21;
      const pairs = []; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && P.R[i][j]) { const k = i < j ? i + '-' + j : j + '-' + i; if (!pairs.includes(k)) pairs.push(k); }
      const links = pairs.map(k => {
        const [a, b] = k.split('-').map(Number), [x, y] = pos[a], [endX, endY] = pos[b];
        const length = Math.hypot(endX - x, endY - y);
        const angle = Math.atan2(endY - y, endX - x) * 180 / Math.PI;
        return `<span class="st10-link" data-a="${a}" data-b="${b}"
          style="left:${x}%;top:${y}%;width:${length}%;transform:rotate(${angle}deg)"></span>`;
      }).join('');
      $('#lbb').innerHTML = `<div class="st10" id="st10">${P.reversible ? '<button type="button" class="st-compass" aria-pressed="false" aria-label="عكس اتجاه الدوران"><img src="motion/pirate-revised/compass/bezel.webp" alt=""><span aria-hidden="true">↻</span></button>' : piece('stat', 'door_closed', 'st10-door')}${piece('stat', 'door_open', 'st10-open')}<div class="st10-links" aria-hidden="true">${links}</div>
        ${pos.map(([x, y], i) => `<button class="st10-s" data-i="${i}" style="left:${x}%;top:${y}%;width:${sz}%" aria-label="تمثال ${N(i + 1)}"> <i class="st10-tgt" style="--a:${P.tgt[i] * 90}deg"></i><img class="st10-g" src="${poses[0]}" alt="" draggable="false"><span class="st10-current"><i class="st10-dot"></i></span></button>`).join('')}</div>`;
      const stage = $('#st10');
      const snapshot = () => ({angles: ang.map(angle => angle / 90)});
      const view = window.mlScene?.mount('pz_stat', stage, snapshot());
      const btns = [...stage.querySelectorAll('.st10-s')], lines = [...stage.querySelectorAll('.st10-link')];
      const compass = stage.querySelector('.st-compass');
      if (compass) compass.onclick = () => {
        if (api.ended) return;
        mode *= -1;
        compass.setAttribute('aria-pressed', String(mode === -1));
        compass.querySelector('span').textContent = mode === 1 ? '↻' : '↺';
        stage.dataset.reverse = String(mode === -1);
        compass.classList.remove('hint');
        sound?.play('stat.match', .12);
        api.msg(mode === 1 ? 'البوصلة على الحركة الأصلية.' : 'البوصلة تعكس حركة كل حارس مرتبط.');
      };
      function draw() { btns.forEach((b, i) => {
        const heading = ((ang[i] / 90) % 4 + 4) % 4;
        b.querySelector('.st10-g').src = poses[heading];
        b.querySelector('.st10-current').style.transform = `rotate(${ang[i]}deg)`;
        b.classList.toggle('ok', s[i] === 0); b.setAttribute('aria-label', `تمثال ${N(i + 1)}: ${s[i] === 0 ? 'يطابق ماسته' : 'لا يطابق'}`); }); stage.classList.toggle('all', s.every(d => d === 0)); view?.update(snapshot()); }
      function press(i) { if (api.ended) return; const matchedBefore = s.filter(d => d === 0).length;
        if (P.turn) s = P.turn(s, i, mode);
        P.R[i].forEach((r, j) => { if (r) { if (!P.turn) s[j] = (s[j] + r) % 4; ang[j] += mode * (r === 3 ? -90 : r * 90); } });
        compass?.classList.remove('hint');
        presses++;
        btns.forEach((b, j) => {
          b.classList.remove('hint');
          if (P.R[i][j]) {
            b.dataset.turn = P.R[i][j] === 2 ? 'half' : 'quarter';
            flash(b, j === i ? 'turned' : 'linked', 400);
          }
        }); lines.forEach(l => { if (+l.dataset.a === i || +l.dataset.b === i) flash(l, 'zap', 500); });
        draw();
        const matched = s.filter(d => d === 0).length;
        if (matched === n) {
          api.win(`طابقت اتجاهات التماثيل في ${arN(presses, AN.press)}، والأقل ${arN(P.min, AN.press)}.`);
          sfx.roundScene?.().play('stat.open');
        } else {
          sound?.play('stat.turn');
          if (matched > matchedBefore) sound?.play('stat.match', .14);
          api.msg(`الضغطات: ${N(presses)} · أقل حل: ${N(P.min)}`);
        }
      }
      btns.forEach((b, i) => b.onclick = () => press(i)); draw(); api.msg(`أقل حل: ${N(P.min)} ضغطات.`); pzHook({ P, press, s: () => s, presses: () => presses });
      return { hint: k => {
          if (k === 1) return `أقل حل ${arN(P.min, AN.press)}. الخطوط تريك من يحرّك من.${compassRules}`;
          const state = P.enc(s), i = P.nxt[state];
          if (i < 0) return null;
          btns[i].classList.add('hint');
          if (compass && P.nextMode[state] !== mode) {
            compass.classList.add('hint');
            return 'بدّل اتجاه البوصلة، ثم اضغط التمثال المضيء.';
          }
          return 'اضغط التمثال المضيء.';
        },
        reveal: () => `كان أقل حل ${arN(P.min, AN.press)}.` };
    });
  };

  /* ================================================================ 05 الأنابيب — pz_pipe
     Same masks (ppMake), rotation (ppRot = a quarter turn clockwise), flow (ppPowered) and win (ppSolved). */
  if (GM.pz_pipe && typeof ppMake === 'function') GM.pz_pipe.run = function () {
    return pzPlay('pz_pipe', api => {
      const P = api.authored ? window.mlAuthoredStages.pipes(api.authored.board) : ppMake(api.lv);
      const lock = new Set(P.fixed), deg = m => [1, 2, 4, 8].filter(b => m & b).length;
      const base = P.cur.slice(), turn = P.cur.map(() => 0); let taps = 0;
      // Every layer uses the same centre and reaches the active cell edges.
      function channel(mask) {
        const arms = ['n', 'e', 's', 'w'].map((side, i) =>
          mask & (1 << i) ? `<i class="pp10-arm ${side}"></i>` : '').join('');
        return `<span class="pp10-pipe" aria-hidden="true">
          ${['stone', 'rim', 'water', 'glint'].map(layer =>
            `<span class="pp10-layer pp10-${layer}">${arms}</span>`).join('')}
        </span>`;
      }
      const home = wet => `<img class="pp10-house${wet ? ' wet' : ''}" src="motion/revised/cottage-${wet ? 'wet' : 'dry'}.webp" alt="" draggable="false">`;
      frame(api, { id: 'pipe', lead: 'اضغط القطعة لتدويرها ربع لفة. تتحقق اللعبة تلقائيًا عند الاكتمال.' });
      $('#lbb').innerHTML = `<div class="pp10" id="pp10" style="--w:${P.w};--h:${P.h}">${base.map((m, i) => {
        const src = i === P.src, house = !src && deg(P.sol[i]) === 1;
        return `<button class="pp10-c${src ? ' src' : ''}${house ? ' house' : ''}" data-i="${i}" aria-label="${src ? 'النبع' : house ? 'بيت' : 'أنبوب'}، الصف ${N(Math.floor(i/P.w)+1)}، العمود ${N(i%P.w+1)}"><span class="pp10-rot">${channel(m)}</span>${src ? piece('pipe', 'spring_source', 'pp10-spring') : house ? home(false) + home(true) + '<i class="pp10-intake" aria-hidden="true"></i>' : ''}${lock.has(i) ? '<img class="pp10-pin" src="ui/designs_art/priority7/padlock.png" alt="">' : ''}</button>`;
      }).join('')}</div>`;
      const cells = [...$('#pp10').children];
      const ports = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
      function hasLeak(i) {
        const x = i % P.w, y = Math.floor(i / P.w);
        return ports.some(([dx, dy, bit, reciprocal]) => {
          const nx = x + dx, ny = y + dy;
          return (P.cur[i] & bit) && (nx < 0 || nx >= P.w || ny < 0 || ny >= P.h || !(P.cur[ny * P.w + nx] & reciprocal));
        });
      }
      function draw() { const on = ppPowered(P); cells.forEach((b, i) => { b.querySelector('.pp10-rot').style.transform = `rotate(${turn[i] * 90}deg)`; b.classList.toggle('on', on.has(i)); b.classList.toggle('leak', on.has(i) && hasLeak(i)); b.classList.toggle('lock', lock.has(i));
          if (b.classList.contains('house')) b.style.setProperty('--intake-angle', Math.log2(P.cur[i]) * 90 + 'deg');
          b.setAttribute('aria-disabled', String(lock.has(i)));
        });
        const homes = P.sol.filter((m, i) => deg(m) === 1 && i !== P.src).length, lit = P.sol.filter((m, i) => deg(m) === 1 && i !== P.src && on.has(i)).length; api.msg(`البيوت التي وصلها الماء: ${N(lit)} من ${N(homes)}${P.min ? ' · أقل حل: ' + N(P.min) : ''}`); }
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
      const table = $('#lg10t');
      table.innerHTML = `<tr><th scope="col">الاسم</th>${P.cats.map(k => `<th scope="col">${LG_C[k].n}</th>`).join('')}</tr>` +
        LG_P.slice(0, P.n).map((name, p) => `<tr><th scope="row">${name}</th>${P.cats.map((_, c) =>
          `<td><button type="button" class="lg10-c" data-c="${c}" data-p="${p}"></button></td>`).join('')}</tr>`).join('');
      const cells = [...table.querySelectorAll('.lg10-c')];
      function draw() {
        cells.forEach(button => {
          const c = +button.dataset.c, p = +button.dataset.p, category = LG_C[P.cats[c]], v = ans[c][p];
          const isFixed = fixed.has(c + '.' + p), value = v >= 0 ? category.it[v] : 'فارغة';
          button.classList.toggle('fix', isFixed);
          button.classList.toggle('set', v >= 0);
          button.classList.toggle('lb-badc', !!mark?.cells.some(([a, b]) => a === c && b === p));
          button.setAttribute('aria-disabled', String(isFixed));
          button.setAttribute('aria-label', `${LG_P[p]}، ${category.n}: ${value}${isFixed ? '، ثابتة' : ''}`);
          button.textContent = v >= 0 ? value : '؟';
        });
      }
      cells.forEach(button => {
        button.onclick = () => {
          const c = +button.dataset.c, p = +button.dataset.p;
          if (api.ended || fixed.has(c + '.' + p)) return;
          mark = null;
          root.querySelectorAll('#lgcl li').forEach(item => item.className = '');
          ans[c][p] = ans[c][p] + 1 >= P.n ? -1 : ans[c][p] + 1;
          tone(520, .04);
          draw();
        };
      });
      $('#lbgo').onclick = () => { if (api.ended) return; if (ans.some(r => r.includes(-1))) { api.msg('أكمل كل الخانات أولًا.'); return; }
        if (ans.every((r, c) => r.every((v, p) => v === P.sol[c][p]))) { root.querySelectorAll('#lgcl li').forEach(l => l.className = 'ok'); api.win('تطابق القيم جميع القرائن.'); return; }
        api.wrong(); const cl = [...root.querySelectorAll('#lgcl li')];
        const dup = []; ans.forEach((r, c) => r.forEach((v, p) => { if (r.indexOf(v) !== p || r.lastIndexOf(v) !== p) dup.push([c, p]); }));
        if (dup.length) { mark = { cells: dup }; cl.forEach(l => l.className = ''); draw(); api.msg('قيمة مكررة في العمود نفسه: لكل شخص قيمة مختلفة.'); return; }
        const bi = P.clues.findIndex(c => !holds(c)); cl.forEach((l, i) => l.className = i === bi ? 'bad' : holds(P.clues[i]) ? 'ok' : '');
        mark = { cells: bi >= 0 ? cellsOf(P.clues[bi]) : [] };
        if (bi >= 0) $('#lgcl').dispatchEvent(new CustomEvent('mindlab:clue', { detail: bi }));
        draw(); api.msg(bi >= 0 ? `القيمة المعلّمة تخالف القرينة ${N(bi + 1)}.` : 'فيه خطأ. ارجع للقرائن.'); };
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
      const SH = ['circle', 'square', 'triangle', 'diamond', 'hexagon', 'star'];
      const NM = ['دائرة', 'مربع', 'مثلث', 'ماسة', 'سداسي', 'نجمة'];
      const shapeArt = v => `<img src="motion/logic-revised/sudo/${SH[v]}.webp" alt="" draggable="false">`;
      const P = sdMake(api.lv), n = P.n, [bh, bw] = sdBox(n), g = P.puz.slice(), giv = new Set(P.puz.map((v, i) => v >= 0 ? i : -1).filter(i => i >= 0)), lock = new Set(); let sel = 0;
      const root = frame(api, { id: 'sudo', lead: `كل شكل مرة واحدة في كل صف وعمود ومجموعة ${N(bh)}×${N(bw)}. اختر شكلًا من الأسفل ثم اضغط الخانة الفارغة، أو اسحبه إليها.` });
      $('#lbb').innerHTML = `<div class="sd10" id="sd10" style="--n:${n}">${Array.from({length:n*n}, (_, i) => {
        const r = Math.floor(i/n), c = i%n;
        return `<button type="button" class="sd10-c${giv.has(i) ? ' giv' : ''}${c % bw === bw-1 && c < n-1 ? ' br' : ''}${r % bh === bh-1 && r < n-1 ? ' bb' : ''}" data-i="${i}" data-slot="c${i}"></button>`;
      }).join('')}</div><div class="sd10-pal" id="sd10p" data-tray="pal">${Array.from({length:n}, (_, v) =>
        `<button type="button" class="mk-tok sd10-p" data-tok="${v}" aria-label="${NM[v]}">${shapeArt(v)}</button>`).join('')}</div>`;
      const cells = [...$('#sd10').children], palette = $('#sd10p');
      function dup() { const b = new Set(); for (let i = 0; i < n * n; i++) { if (g[i] < 0) continue; const r = i / n | 0, c = i % n; for (let j = 0; j < n * n; j++) { if (j === i || g[j] !== g[i]) continue; const r2 = j / n | 0, c2 = j % n; if (r === r2 || c === c2 || (Math.floor(r / bh) === Math.floor(r2 / bh) && Math.floor(c / bw) === Math.floor(c2 / bw))) b.add(i); } } return b; }
      function draw() {
        const conflicts = dup();
        cells.forEach((cell, i) => {
          const v = g[i], fixed = giv.has(i) || lock.has(i);
          if (+cell.dataset.value !== v) {
            cell.innerHTML = v < 0 ? '' : shapeArt(v);
            cell.dataset.value = v;
          }
          cell.classList.toggle('lock', lock.has(i));
          cell.classList.toggle('bad', conflicts.has(i) && !giv.has(i));
          cell.classList.toggle('clash', conflicts.has(i) && giv.has(i));
          cell.setAttribute('aria-disabled', String(fixed));
          cell.setAttribute('aria-label', `${NM[v] || 'خانة فارغة'}، صف ${N(Math.floor(i/n)+1)}، عمود ${N(i%n+1)}${fixed ? '، ثابتة' : ''}`);
        });
        [...palette.children].forEach((button, v) => {
          button.classList.toggle('on', v === sel);
          button.setAttribute('aria-pressed', String(v === sel));
        });
      }
      function put(i, v = sel) { if (api.ended || giv.has(i) || lock.has(i)) return; g[i] = g[i] === v ? -1 : v; tone(560, .04); draw(); const d = dup(); if ([...d].some(x => !giv.has(x)) && g[i] >= 0) api.msg('تكرار في صف أو عمود أو مجموعة: الخانة المعلّمة بالأحمر.'); else api.msg('');
        if (g.every((x, k) => x === P.sol[k])) { $('#sd10').classList.add('won'); api.win(`أكملت سودوكو الأشكال ${N(n)}×${N(n)}.`); } }
      function select(value) {
        if (api.ended) return;
        mk.clear();
        sel = value;
        tone(600, .03);
        draw();
      }
      const mk = MK.attach(root.querySelector('.lb-board'), { canDrag: () => !api.ended, onPick: id => select(+id),
        drop: (id, slot) => { if (slot && slot[0] === 'c') { sel = +id; put(+slot.slice(1), +id); } } });
      palette.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
      });
      palette.addEventListener('click', e => {
        const button = e.target.closest('.sd10-p');
        if (e.detail === 0 && button) select(+button.dataset.tok);
      });
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
      const P = api.authored?.board || flMake(api.lv);
      const n = P.n, K = P.ends.length, paths = P.ends.map(() => []), endOf = new Map(); P.ends.forEach(([a, b], k) => { endOf.set(a, k); endOf.set(b, k); }); let cur = -1, drag = false; const lockK = new Set();
      frame(api, { id: 'flow', lead: 'وصّل كل رمزين متطابقين بخط متصل واملأ اللوحة كلها. الخطوط لا تتقاطع.' });
      $('#lbb').innerHTML = `<div class="fl10" id="fl10" style="--n:${n}">${Array.from({ length: n * n }, (_, i) => {
        const e = endOf.get(i);
        return `<button class="fl10-c${e != null ? ' end' : ''}" type="button" data-i="${i}" aria-label="${e != null ? 'رمز ' + N(e + 1) : 'خانة'}"><span class="fl10-track" hidden aria-hidden="true"></span>${e != null ? im('flow_node_' + e + '_' + ART[e], 'fl10-node') : ''}</button>`;
      }).join('')}</div>`;
      const G = $('#fl10'), cells = [...G.children];
      function markPath(from, to) {
        if (to == null) return '';
        const side = to === from - n ? 'n' : to === from + n ? 's' : to < from ? 'w' : 'e';
        return `<i class="fl10-arm ${side}"></i>`;
      }
      const owner = c => paths.findIndex(p => p.includes(c)), adj = (a, b) => Math.abs(a % n - b % n) + Math.abs((a / n | 0) - (b / n | 0)) === 1;
      const done = k => { const p = paths[k]; return p.length > 1 && endOf.get(p[0]) === k && endOf.get(p[p.length - 1]) === k && p[0] !== p[p.length - 1]; };
      function start(c) { const e = endOf.get(c), o = owner(c); if (e != null) { if (lockK.has(e)) return false; cur = e; paths[e] = [c]; return true; } if (o >= 0 && !lockK.has(o)) { cur = o; paths[o] = paths[o].slice(0, paths[o].indexOf(c) + 1); return true; } return false; }
      function touch(c) { if (cur < 0) return; const p = paths[cur], last = p[p.length - 1]; if (c === last) return; const at = p.indexOf(c); if (at >= 0) { paths[cur] = p.slice(0, at + 1); return draw(); } if (!adj(last, c) || done(cur)) return;
        const e = endOf.get(c); if (e != null && e !== cur) { blocked(c); return; } const o = owner(c); if (o >= 0 && o !== cur) { if (lockK.has(o)) { blocked(c); return; } paths[o] = paths[o].slice(0, paths[o].indexOf(c)); } p.push(c); tone(400 + cur * 40, .03); draw(); }
      function blocked(c) { const b = $('#fl10').querySelector(`[data-i="${c}"]`); flash(b, 'lb-bad', 700); api.msg('الخطوط لا تتقاطع! المسار محجوز بلون آخر.'); }
      function draw() {
        cells.forEach(cell => {
          cell.classList.remove('on');
          cell.firstElementChild.hidden = true;
        });
        paths.forEach((path, k) => path.forEach((cellIndex, i) => {
          const cell = cells[cellIndex], track = cell.firstElementChild;
          cell.classList.add('on');
          cell.style.setProperty('--fc', COL[k]);
          track.hidden = path.length < 2;
          track.innerHTML = markPath(cellIndex, path[i - 1]) + markPath(cellIndex, path[i + 1]);
        }));
        const all = paths.reduce((a, p) => a + p.length, 0), nd = [...Array(K).keys()].filter(done).length; if (!api.ended) api.msg(`وصلت ${N(nd)} من ${N(K)} أزواج · ${N(all)} من ${N(n * n)} خانة`);
        if (!api.ended && all === n * n && paths.every((_, k) => done(k))) { $('#fl10').classList.add('won'); api.win(`وصّلت ${N(K)} أزواج وملأت اللوحة كلها.`); } }
      const finishes = c => cur >= 0 && endOf.get(c) === cur && !done(cur) &&
        c !== paths[cur][0] && adj(paths[cur].at(-1), c);
      const cellAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY), b = el && el.closest && el.closest('.fl10-c'); return b && G.contains(b) ? +b.dataset.i : null; };
      G.addEventListener('pointerdown', e => { const c = cellAt(e); if (c == null || api.ended) return; e.preventDefault(); if (finishes(c)) touch(c); else if (start(c)) { drag = true; draw(); } else if (cur >= 0) touch(c); });
      G.addEventListener('pointermove', e => { if (!drag) return; const c = cellAt(e); if (c != null) touch(c); });
      G.addEventListener('pointercancel', () => { drag = false; });
      const up = () => { drag = false; }; document.addEventListener('pointerup', up); if (typeof cleanup !== 'undefined' && cleanup.push) cleanup.push(() => document.removeEventListener('pointerup', up));
      G.addEventListener('click', e => { if (e.detail !== 0 || api.ended) return; const b = e.target.closest('.fl10-c'); if (!b) return; const c = +b.dataset.i; if (finishes(c)) touch(c); else if (endOf.has(c) || owner(c) >= 0 && owner(c) !== cur) { start(c); draw(); } else touch(c); });
      draw(); pzHook({ P, paths, start, touch, draw });
      return { hint: k => { if (k === 1) return 'ابدأ بالأزواج التي رموزها على الحواف أو قريبة من بعض، والأطول اتركه للأخير.'; const c = [...Array(K).keys()].filter(k => !done(k) || paths[k].join() !== P.segs[k].join()).filter(k => !lockK.has(k)); if (!c.length) return null;
          const kk = pick(c); paths.forEach((p, j) => { if (j === kk) return; const collision = p.findIndex(x => P.segs[kk].includes(x)); if (collision >= 0) paths[j] = p.slice(0, collision); }); paths[kk] = P.segs[kk].slice(); lockK.add(kk); draw(); return 'رسمت لك زوجًا كاملًا في مكانه الصحيح.'; },
        reveal: () => { P.segs.forEach((s, k) => paths[k] = s.slice()); draw(); return 'هذا أحد الحلول.'; } };
    });
  };

  /* ================================================================ 09 تانغرام المربعات — pz_tan
     Same pieces (tgMake), rotate (tgRot) and flip (tgFlip). Each piece keeps its own tile (tan_tile_0..7). A piece is
     placed by tapping the cell where its marked square goes, or by dragging it there from the tray. */
  if (GM.pz_tan && typeof tgMake === 'function') GM.pz_tan.run = function () {
    return pzPlay('pz_tan', api => {
      const TILE = ['tan_tile_0_coral', 'tan_tile_1_teal', 'tan_tile_2_gold', 'tan_tile_3_sage', 'tan_tile_4_plum', 'tan_tile_5_amber', 'tan_tile_6_navy', 'tan_tile_7_crimson'];
      const P = api.authored?.board || tgMake(api.lv), n = P.n, R = new Set(P.reg);
      const pcs = P.pieces.map((p, i) => {
        let shape;
        if (p.mask == null) shape = shuffle([p.shape, tgRot(p.shape), tgRot(tgRot(p.shape)), tgFlip(p.shape)])[0];
        else {
          shape = p.mask & 4 ? tgFlip(p.shape) : p.shape;
          for (let turns = p.mask & 3; turns > 0; turns--) shape = tgRot(shape);
        }
        return { i, shape, at: null, lock: false };
      });
      let sel = 0;
      const root = frame(api, { id: 'tan', lead: 'غطِّ المحيط المنقّط كله بالقطع. اختر قطعة ودوّرها، ثم اسحبها أو اضغط الخانة التي يقع عليها مربعها المعلَّم.' });
      $('#lbb').innerHTML = `<div class="tg10" id="tg10" style="--n:${n}"></div><div class="tg10-ctl"><button type="button" id="tgf">قلب</button><button type="button" id="tgr">تدوير</button></div><div class="tg10-tray" id="tg10t" data-tray="tray"></div>`;
      const cellsOf = p => p.at == null ? [] : p.shape.map(([x, y]) => [x + p.at[0] - p.shape[0][0], y + p.at[1] - p.shape[0][1]]);
      const occ = () => { const m = new Map(); pcs.forEach(p => cellsOf(p).forEach(([x, y]) => m.set(y * n + x, p.i))); return m; };
      function edgeClass(i, w, source, id) {
        const same = j => source.get(j) === id;
        const edge = [i < w || !same(i-w), i%w === w-1 || !same(i+1), !same(i+w), i%w === 0 || !same(i-1)];
        return edge.map((has, j) => has ? ' tg-edge-' + j : '').join('');
      }
      const silhouette = new Map(P.reg.map(i => [i, true]));
      function draw() { const o = occ();
        $('#tg10').innerHTML = [...Array(n * n).keys()].map(i => { const k = o.get(i); return `<button class="tg10-c${R.has(i) ? ' reg' : ''}${k != null ? ' on' + edgeClass(i, n, o, k) : R.has(i) ? edgeClass(i, n, silhouette, true) : ''}${k != null && pcs[k].lock ? ' lock' : ''}" data-i="${i}" data-slot="c${i}" aria-label="${k != null ? 'قطعة' : R.has(i) ? 'خانة من الشكل' : 'خارج الشكل'}">${k != null ? im(TILE[k % 8]) : ''}</button>`; }).join('');
        const left = pcs.filter(p => p.at == null);
        $('#tg10t').innerHTML = left.length ? left.map(p => { const w = Math.max(...p.shape.map(c => c[0])) + 1, h = Math.max(...p.shape.map(c => c[1])) + 1, S = new Map(p.shape.map(([x, y]) => [y * w + x, p.i]));
          return `<button class="mk-tok tg10-p${p.i === sel ? ' on' : ''}" data-tok="${p.i}" style="--w:${w}" aria-label="قطعة ${N(p.i + 1)}" aria-pressed="${p.i === sel}">${[...Array(w * h)].map((_, k) => `<i class="${S.has(k) ? 'f' + edgeClass(k, w, S, p.i) : ''}${k === p.shape[0][1] * w + p.shape[0][0] ? ' a' : ''}">${S.has(k) ? im(TILE[p.i % 8]) : ''}</i>`).join('')}</button>`; }).join('') : '<p class="tg10-empty">الصينية فارغة، تم تركيب كل القطع!</p>'; }
      function tap(i, k) { if (api.ended) return; const o = occ(); if (o.has(i) && k == null) { const p = pcs[o.get(i)]; if (p.lock) return; p.at = null; sel = p.i; draw(); return; }
        k ??= sel; const p = pcs[k]; if (!p || p.at != null) return; sel = k; p.at = [i % n, i / n | 0]; const cs = cellsOf(p);
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
