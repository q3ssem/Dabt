/* Fixed challenge tracks. The library's original levels and the journey keep their own progress. */
(function () {
  'use strict';
  const directory = new URL('./', document.currentScript.src);
  const saveKey = 'mindlab:authored-stages:v1';
  let tracks;
  let styles;
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(saveKey)) || {}; } catch {}

  function loadStyle() {
    if (styles) return styles;
    styles = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL('play.css', directory);
      link.onload = resolve;
      link.onerror = () => { link.remove(); styles = null; reject(new Error('Stage stylesheet unavailable')); };
      document.head.append(link);
    });
    return styles;
  }

  async function load() {
    if (tracks) return;
    const [data] = await Promise.all([
      fetch(new URL('boards.json', directory)).then(response => {
        if (!response.ok) throw new Error('Stage boards unavailable');
        return response.json();
      }),
      loadStyle()
    ]);
    tracks = data;
  }

  function getProgress(id) {
    return progress[id] ||= { last: 1, cleared: 0 };
  }

  function save() {
    try { localStorage.setItem(saveKey, JSON.stringify(progress)); } catch {}
  }

  function play(id, number) {
    const track = tracks[id];
    RUN.authoredStage = { id, number, total: track.length, board: track[number - 1] };
    getProgress(id).last = number;
    save();
    countdown();
  }

  function choose(id) {
    stopAll();
    const track = tracks[id];
    const { last, cleared } = getProgress(id);
    const available = Math.min(track.length, cleared + 1);
    const host = document.querySelector('#stage');
    host.innerHTML = `<section class="ml-authored-picker"><header><h2>اختر مرحلة</h2>
      <p>أنجزت ${XAR(cleared)} من ${XAR(track.length)} · ${esc(GM[id].name)}</p></header>
      <button type="button" class="go-btn" data-level="${last}">تابع المرحلة ${XAR(last)}</button>
      <div class="ml-authored-levels">${track.map((board, i) => `<button type="button" data-level="${i + 1}" ${i >= available ? 'disabled' : ''} ${i + 1 === last ? 'aria-current="step"' : ''}
        aria-label="المرحلة ${XAR(i + 1)}${i < cleared ? ' · محلولة' : i >= available ? ' · مقفلة' : ''}">
        <b>${XAR(i + 1)}</b>${board.title ? `<span>${esc(board.title)}</span>` : ''}</button>`).join('')}</div>
      <button type="button" class="cta ghost" data-back>رجوع إلى المكتبة</button></section>`;
    host.querySelectorAll('[data-level]').forEach(button => {
      button.onclick = () => play(id, Number(button.dataset.level));
    });
    host.querySelector('[data-back]').onclick = () => closePlay();
    const resume = host.querySelector('.go-btn');
    puzzleAction(resume, 'start');
    puzzleAction(host.querySelector('[data-back]'), 'back');
    resume.focus();
  }

  function complete({ id, number }) {
    const state = getProgress(id);
    state.cleared = Math.max(state.cleared, number);
    if (state.last <= number) state.last = Math.min(tracks[id].length, number + 1);
    save();
  }

  function result({ id, number, total }, won) {
    const again = document.querySelector('#ag');
    const buttons = document.querySelector('.rbtns');
    if (!again || !buttons) return;
    const hasNext = won && number < total;
    puzzleAction(again, hasNext ? 'next' : 'retry', hasNext ? 'المرحلة التالية' : 'أعد المرحلة');
    again.onclick = () => play(id, number + Number(hasNext));
    document.querySelector('#rpl')?.remove();
    document.querySelector('#shch')?.remove(); // Legacy challenge links cannot address an authored board.
    document.querySelector('#stage .rank')?.remove();
    const picker = document.createElement('button');
    picker.type = 'button';
    picker.className = 'cta ghost';
    puzzleAction(picker, 'levels', 'اختيار مرحلة');
    picker.onclick = () => choose(id);
    buttons.append(picker);
  }

  function parking({ grid, min }) {
    return { vs: rhDecode(grid), min };
  }

  function pipes({ w, h, sol, cur, src, fixed, min }) {
    return { w, h, sol, cur: cur.slice(), src, fixed, min };
  }

  function ice({ w, h, start, goal, rocks, min }) {
    const blockers = new Set(rocks);
    return { w, h, start, goal, min, rock: Array.from({ length: w * h }, (_, i) => blockers.has(i)) };
  }

  function riverRules(board) {
    const captainStage = board.number === 16;
    const grainStage = board.number === 17;
    const names = captainStage ? [...board.items, 'مزارع'] : board.items;
    const goal = board.goals || names.map(() => 1);
    const index = name => names.indexOf(name);
    const farmer = index('مزارع');
    const rower = index('مجدف');
    const initial = { bank: 0, loc: board.initial ? [...board.initial] : names.map(() => 0), flags: 0, phase: 0, captain: farmer };
    if (captainStage) initial.loc.push(0);
    const edges = board.edges || [[0, 1], [1, 0]];
    const places = Array.from({ length: Math.max(...edges.flatMap(([from, to]) => [from, to])) + 1 }, (_, i) => i);
    const walking = (from, to) => board.walking?.some(([start, end]) => start === from && end === to);
    const split = state => Boolean(state.flags & 1);
    const won = state => state.loc.every((place, i) => place === goal[i]) &&
      ((state.flags & (board.required || 0)) === (board.required || 0) ||
        (grainStage && !split(state)));

    function groups(state) {
      return names.map((name, i) => ({ name, indices: [i], weight: board.weights?.[name] || 1 }))
        .filter(({ indices: [i] }) => i !== state.captain && (!grainStage || split(state) || i >= 2))
        .concat(grainStage && !split(state) ? [{ name: 'كيس الحبوب', indices: [0, 1], weight: 2 }] : []);
    }

    function operations(state) {
      const actions = (board.tasks || []).filter(task => state.bank === task.bank && !(state.flags & task.bit) &&
        (state.flags & (task.needs || 0)) === (task.needs || 0) &&
        task.items.every(name => state.loc[index(name)] === state.bank)).map(task => ({
        label: task.name, state: { ...state, flags: state.flags | task.bit }
      }));
      if (captainStage && state.loc[rower] === state.bank && state.loc[farmer] === state.bank) {
        const captain = state.captain === farmer ? rower : farmer;
        actions.push({ label: 'سلّم الدفة إلى ' + names[captain], state: { ...state, captain } });
      }
      return actions;
    }

    function travel(state, edge, cargo) {
      const [from, bank, phase = -1, flag = 0] = edge;
      const walk = walking(from, bank);
      const indices = cargo.flatMap(group => group.indices);
      const carries = name => indices.includes(index(name));
      if (phase >= 0 && state.phase !== phase) return { error: 'الممر مفتوح في الجزر فقط.' };
      if ((state.flags & flag) !== flag && !(grainStage && !split(state) && carries('نصف-أ') && carries('نصف-ب'))) {
        return { error: 'نفّذ المهمة على الرصيف أولًا.' };
      }
      if (cargo.some(group => group.indices.some(i => state.loc[i] !== from))) return { error: 'حمّل القطع من موقعك الحالي.' };
      if (cargo.reduce((sum, group) => sum + group.weight, 0) > board.capacity) return { error: 'الحمولة تتجاوز الحد.' };
      if (board.travel?.some(name => !carries(name))) return { error: 'أضف ' + board.travel.join(' و') + ' إلى القارب.' };
      if (board.separators?.some(([a, b, partition]) => carries(a) && carries(b) && !carries(partition))) {
        return { error: 'ضع الحاجز بين الراكبين أولًا.' };
      }
      const loc = state.loc.map((place, i) => indices.includes(i) || i === state.captain ? bank : place);
      if (board.limits?.some(([place, limit]) => loc.filter(position => position === place).length > limit)) {
        return { error: 'لا يتّسع هذا الرصيف للحمولة.' };
      }
      for (const [a, b, guard, exempt] of board.conflicts || []) {
        const place = loc[index(a)];
        if (place === bank || place !== loc[index(b)] || (exempt && state.flags & exempt && place === 0)) continue;
        if ((guard && loc[index(guard)] === place) || (captainStage && loc[farmer] === place)) continue;
        return { error: `لا تترك ${a} و${b} معًا من دون حراسة.` };
      }
      return { edge, cargo, walk, state: { ...state, bank, loc, phase: board.tide && !walk ? 1 - state.phase : state.phase } };
    }

    function best(start) {
      const queue = [{ state: start, crossings: 0, steps: 0, first: null }];
      const seen = new Set();
      // Prefer fewer crossings, then fewer actions.
      while (queue.length) {
        queue.sort((a, b) => a.crossings - b.crossings || a.steps - b.steps);
        const { state, crossings, steps, first } = queue.shift();
        const key = [state.bank, state.loc.join(''), state.flags, state.phase, state.captain].join(':');
        if (seen.has(key)) continue;
        seen.add(key);
        if (won(state)) return { crossings, steps, first };
        const available = groups(state).filter(group => state.loc[group.indices[0]] === state.bank);
        const actions = operations(state);
        for (const edge of edges.filter(([from]) => from === state.bank)) {
          for (let mask = 0; mask < 2 ** available.length; mask++) {
            const cargo = available.filter((_, i) => mask & (1 << i));
            const action = travel(state, edge, cargo);
            if (!action.error) actions.push(action);
          }
        }
        actions.forEach(action => queue.push({
          state: action.state, crossings: crossings + Number(Boolean(action.edge && !action.walk)),
          steps: steps + 1, first: first || action
        }));
      }
      return null;
    }
    return { initial, places, goal, groups, operations, travel, best, won, edges, walking, names };
  }

  const riverArt = 'ui/designs_art/river_stage1/';
  const portraits = {
    'ذئب': riverArt + '03_passengers/wolf_bank.png',
    'خروف': riverArt + '03_passengers/sheep_bank.png',
    'توأم': riverArt + '03_passengers/sheep_bank.png',
    'صغير': riverArt + '03_passengers/sheep_bank.png',
    'عشب': riverArt + '03_passengers/grass_bank.png',
    'كلب': 'ui/designs_art/river_stage2/passengers/dog_bank.png',
    'قط': 'ui/designs_art/river_stage2/passengers/cat_bank.png',
    'فأر': 'ui/designs_art/river_stage2/passengers/mouse_bank.png',
    'مجدف': riverArt + '02_boat_and_farmer/farmer_go.png',
    'سمكة': 'treasure/art/story5/ch1_s2_piece_fish.webp',
    'صندوق': 'expedition10/art/props/16-cargo-chest.webp',
    'فانوس': 'motion/art/prop_biolantern.webp',
    'حبل': 'treasure/art/story5/tool_rope.webp',
    'ماء': 'expedition10/art/props/22-water-jugs.webp',
    'زاد': 'motion/pirate-revised/loot/sack.webp',
    'علف': riverArt + '03_passengers/grass_bank.png',
    'حطب': 'motion/pirate-revised/bridge/plank.webp',
    'حاجز': 'motion/pirate-revised/bridge/plank.webp',
    'لوح-أ': 'motion/pirate-revised/bridge/plank.webp',
    'لوح-ب': 'motion/pirate-revised/bridge/plank.webp',
    'سلة': 'motion/pirate-revised/loot/sack.webp',
    'كيس الحبوب': 'motion/pirate-revised/loot/sack.webp',
    'نصف-أ': 'motion/pirate-revised/loot/sack.webp',
    'نصف-ب': 'motion/pirate-revised/loot/sack.webp',
    'مفتاح': 'watercolor/art/icons54/key.webp',
    'عجلة': 'watercolor/art/icons54/wheel.webp'
  };

  const ward = 'expedition10/art/crew/poses/ward-curious.webp';
  const classicSprites = { 'ذئب': 'wolf', 'خروف': 'sheep', 'توأم': 'sheep', 'صغير': 'sheep', 'عشب': 'grass' };
  const showName = name => name.replace(/المزارع|مزارع/g, 'ورد');

  function river(api, frame) {
    const board = api.authored.board;
    const rules = riverRules(board);
    let state = rules.initial;
    let crossings = 0;
    let busy = false;
    let boatBank = state.bank;
    let selected = new Set();
    const minimum = rules.best(state).crossings;
    const sound = sfx.roundScene?.();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const crossingTime = 780;
    const labels = board.walking
      ? ['ضفة البداية', 'رصيف الوصول', 'الممر الداخلي', 'الحظيرة الأولى', 'الحظيرة الثانية']
      : ['ضفة البداية', 'ضفة الوصول', 'المرسى الثالث'];
    const icon = (src, cls = '') => `<img src="${src}" class="${cls}" alt="" draggable="false">`;
    const holder = frame(api, { id: 'authored-river', layout: 'information',
      lead: esc(showName(board.title)), top: `<details class="ml-river-rules"><summary>قواعد المرحلة</summary>
        <p>${esc(showName(board.description))} المس الراكب على الضفة ليصعد، أو المسه في القارب ليعود. اختر وجهتك للإبحار.</p><ul>
        ${rules.names.map((name, i) => `<li>${esc(showName(name))} ← ${labels[rules.goal[i]]}</li>`).join('')}</ul></details>` });
    const panel = holder.querySelector('#lbb');
    panel.innerHTML = `<div class="ml-river-scene"><div class="ml-river-board" data-docks="${rules.places.length}" data-walking="${Boolean(board.walking)}">
      <div class="ml-river-places"></div>
      <div class="ml-river-vessel" data-heading="right">
        <div class="ml-river-rig">
          ${icon(riverArt + '04_effects/fx_wake_go.png', 'ml-river-wake')}
          ${icon(riverArt + '02_boat_and_farmer/boat_hull_go.png', 'ml-river-hull')}
          <div class="ml-river-seats"></div>
          <img class="ml-river-captain" alt="">
          ${icon(riverArt + '02_boat_and_farmer/boat_oar_go.png', 'ml-river-oar')}
        </div>
      </div></div></div>
      <div class="ml-river-controls">
        <small class="ml-river-cargo" aria-live="polite"></small>
        <div class="ml-river-actions"></div>
      </div>`;
    const scene = panel.querySelector('.ml-river-board');
    const banks = panel.querySelector('.ml-river-places');
    const vessel = panel.querySelector('.ml-river-vessel');
    const cargoStatus = panel.querySelector('.ml-river-cargo');
    const actions = panel.querySelector('.ml-river-actions');
    const seats = vessel.querySelector('.ml-river-seats');
    const captainSprite = vessel.querySelector('.ml-river-captain');
    const docks = [30, 70, 50];
    const portrait = (name, pose) => {
      const sprite = classicSprites[name];
      if (sprite && pose) return riverArt + '03_passengers/' + sprite + '_' + pose + '.png';
      if (name === 'مزارع') return ward;
      return portraits[name];
    };
    const passenger = (name, pose) => {
      const src = portrait(name, pose);
      return src ? icon(src) : `<span class="ml-river-token" aria-hidden="true">${esc(showName(name))}</span>`;
    };
    const findSprite = (location, name) => Array.from(location.querySelectorAll('[data-river-item]'))
      .find(button => button.dataset.riverItem === name)?.firstElementChild;
    const activeCaptain = () => rules.names[state.captain] === 'مجدف' ? portraits['مجدف'] : ward;

    function transfer(name, aboard) {
      if (busy || api.ended) return;
      const onLand = state.bank !== boatBank;
      if (!aboard) {
        const nextWeight = rules.groups(state).reduce((weight, group) =>
          weight + (selected.has(group.name) || group.name === name ? group.weight : 0), 0);
        if (nextWeight > board.capacity) {
          api.msg(onLand ? 'الحمولة أكبر مما يمكنك حمله.' : 'لا يتّسع القارب لهذا الراكب مع الحمولة الحالية.');
          return;
        }
      }
      const from = findSprite(aboard && !onLand ? seats : banks, name)?.getBoundingClientRect();
      if (aboard) selected.delete(name);
      else selected.add(name);
      sound?.play(aboard ? 'river.unboard' : 'river.board');
      if (onLand) { draw(); return; }
      busy = !reduced.matches;
      draw();
      const target = findSprite(aboard ? banks : seats, name);
      hop(name, from, target, () => {
        busy = false;
        draw();
        [...panel.querySelectorAll('[data-river-item]')]
          .find(button => button.dataset.riverItem === name && !button.disabled)?.focus({ preventScroll: true });
      });
    }

    function draw() {
      const focused = document.activeElement?.dataset.riverItem;
      const groups = rules.groups(state);
      const cargo = groups.filter(group => selected.has(group.name));
      const onLand = state.bank !== boatBank;
      const captainName = showName(rules.names[state.captain] || 'ورد');
      function piece(group, aboard, disabled) {
        const { name } = group, label = showName(name);
        return `<button type="button" data-river-item="${esc(name)}" aria-label="${esc(label)}"
                 title="${esc(label)}" aria-pressed="${aboard}" ${disabled ? 'disabled' : ''}>
          ${passenger(name, aboard ? 'seated' : undefined)}<span class="ml-river-piece-name">${esc(label)}</span></button>`;
      }
      banks.innerHTML = rules.places.map(bank => `<section class="ml-river-place" data-bank="${bank}" data-current="${bank === state.bank}">
        <h4>${labels[bank]}</h4><div>${groups.filter(group => state.loc[group.indices[0]] === bank &&
          (onLand || !selected.has(group.name))).map(group => piece(group, onLand && selected.has(group.name),
            busy || bank !== state.bank)).join('')}
          ${onLand && bank === state.bank ? icon(activeCaptain(), 'ml-river-land-captain') : ''}</div></section>`).join('');
      seats.innerHTML = onLand ? '' : cargo.map(group => piece(group, true, busy)).join('');
      for (const button of panel.querySelectorAll('[data-river-item]')) {
        const { riverItem } = button.dataset;
        button.onclick = () => transfer(riverItem, selected.has(riverItem));
        if (focused === riverItem && !button.disabled) button.focus({ preventScroll: true });
      }
      placeVessel(boatBank);
      captainSprite.hidden = onLand;
      captainSprite.src = activeCaptain();
      const weight = cargo.reduce((sum, group) => sum + group.weight, 0);
      const tide = board.tide ? ' · ' + (state.phase ? 'جزر' : 'مد') : '';
      cargoStatus.textContent = `الحمولة ${XAR(weight)} / ${XAR(board.capacity)} · الرحلات ${XAR(crossings)} · القائد: ${captainName}${tide}`;
      const choices = rules.edges.filter(([from]) => from === state.bank);
      const operations = rules.operations(state);
      actions.replaceChildren();
      function button(label, listener, destination, walking) {
        const control = document.createElement('button');
        control.type = 'button';
        control.className = 'cta ghost';
        control.textContent = label;
        control.disabled = busy || api.ended;
        if (destination !== undefined) {
          control.dataset.riverTo = destination;
          control.dataset.riverTravel = walking ? 'walk' : 'boat';
          control.title = label;
          control.setAttribute('aria-label', label);
          control.innerHTML = walking ? '↗' : icon(riverArt + '02_boat_and_farmer/boat_hull_go.png');
          const dockLabel = document.createElement('small');
          dockLabel.textContent = labels[destination];
          control.append(dockLabel);
        }
        control.onclick = listener;
        actions.append(control);
      }
      choices.forEach(edge => {
        const walk = rules.walking(...edge);
        button((walk ? 'سر إلى ' : 'أبحر إلى ') + labels[edge[1]], () => move(edge, cargo), edge[1], walk);
      });
      operations.forEach(operation => button(showName(operation.label), () => {
        if (busy || api.ended) return;
        state = operation.state;
        selected.clear();
        api.msg(esc(showName(operation.label)));
        draw();
        check();
      }));
    }

    function hop(name, start, landing, done, walk = false) {
      if (!start || !landing || reduced.matches) { done(); return; }
      const host = scene.getBoundingClientRect();
      const end = landing.getBoundingClientRect();
      const clone = landing.cloneNode(true);
      const src = portrait(name, walk ? undefined : 'boarding');
      if (clone.tagName === 'IMG' && src) clone.src = src;
      clone.className = 'ml-river-hop';
      Object.assign(clone.style, {
        left: start.left - host.left + 'px', top: start.top - host.top + 'px',
        width: start.width + 'px', height: start.height + 'px'
      });
      scene.append(clone);
      const dx = end.left + end.width / 2 - start.left - start.width / 2;
      const dy = end.bottom - start.bottom;
      const arc = walk ? 5 : Math.min(30, 13 + Math.abs(dx) * .17);
      landing.style.visibility = 'hidden';
      const flight = clone.animate([
        { transform: 'translate(0,0)' },
        { transform: `translate(${dx * .48}px,${dy * .48 - arc}px)` },
        { transform: `translate(${dx}px,${dy}px) scale(${end.width / start.width})` }
      ], { duration: walk ? 260 : 320, easing: 'ease-in-out' });
      const finish = () => {
        clone.remove();
        landing.style.visibility = '';
        if (scene.isConnected) done();
      };
      flight.onfinish = finish;
      flight.oncancel = finish;
    }

    function check() {
      if (!rules.won(state)) return;
      busy = true;
      draw();
      api.win(`أنهيت المرحلة في ${XAR(crossings)} رحلات. أقل حل: ${XAR(minimum)}.`);
    }

    function placeVessel(bank) {
      vessel.style.setProperty('--dock', docks[bank] + '%');
      vessel.style.setProperty('--waterline', bank === 2 ? '48%' : '65%');
    }

    function move(edge, cargo) {
      if (busy || api.ended) return;
      const action = rules.travel(state, edge, cargo);
      if (action.error) {
        api.wrong({ feedback: false });
        api.msg(esc(showName(action.error)));
        sound?.play('river.unboard');
        return;
      }
      busy = true;
      draw();
      if (!action.walk) {
        placeVessel(edge[1]);
        vessel.dataset.heading = docks[edge[1]] > docks[edge[0]] ? 'right' : 'left';
        scene.classList.add('sailing');
        sound?.play('river.cross');
      }
      later(() => {
        if (!scene.isConnected) return;
        const starts = cargo.map(({ name }) => {
          const sprite = findSprite(seats, name) || findSprite(banks, name);
          return [name, sprite?.getBoundingClientRect()];
        });
        if (!action.walk) {
          crossings++;
          boatBank = edge[1];
          sound?.play('river.dock');
        }
        state = action.state;
        scene.classList.remove('sailing');
        selected = new Set();
        draw();
        function arrived() {
          busy = false;
          draw();
          api.msg('موقعك: ' + labels[state.bank]);
          check();
        }
        if (!starts.length || reduced.matches) { arrived(); return; }
        if (!action.walk) sound?.play('river.unboard');
        let pending = starts.length;
        for (const [name, rect] of starts) {
          hop(name, rect, findSprite(banks, name), () => {
            if (--pending === 0) arrived();
          }, action.walk);
        }
      }, reduced.matches || action.walk ? 0 : crossingTime);
    }

    draw();
    api.msg(`أقل حل: ${XAR(minimum)} رحلات.`);
    return {
      hint() {
        const action = rules.best(state)?.first;
        if (!action) return 'من هذا الوضع لا يوجد حل. أعد المرحلة من البداية.';
        if (!action.edge) return esc(showName(action.label));
        const destination = labels[action.edge[1]];
        const cargo = action.cargo.map(group => showName(group.name)).join(' و');
        return `${action.walk ? 'سر' : 'أبحر'} إلى ${destination}${cargo ? ' ومعك ' + esc(cargo) : ' بلا حمولة'}.`;
      },
      reveal: () => `أقل حل للمرحلة: ${XAR(minimum)} رحلات.`
    };
  }

  window.mlAuthoredStages = { load, choose, complete, result, parking, pipes, ice, river, riverRules };
})();
