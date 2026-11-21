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

  function statues(board) {
    const { R } = board;
    const n = R.length;
    const enc = state => state.reduce((sum, angle, i) => sum + angle * 4 ** i, 0);
    const next = new Int8Array(4 ** n).fill(-1);
    const nextMode = new Int8Array(next.length);
    const distance = new Int16Array(next.length).fill(-1);
    const directions = board.reversible ? [1, -1] : [1];
    const turn = (state, i, direction) => state.map((angle, j) => (angle + direction * R[i][j] + 4) % 4);
    const queue = [Array(n).fill(0)];
    distance[0] = 0;
    for (const state of queue) {
      const length = distance[enc(state)] + 1;
      for (let i = 0; i < n; i++) {
        for (const direction of directions) {
          const prior = turn(state, i, -direction);
          const key = enc(prior);
          if (distance[key] >= 0) continue;
          distance[key] = length;
          next[key] = i;
          nextMode[key] = direction;
          queue.push(prior);
        }
      }
    }
    return { ...board, n, enc, nxt: next, nextMode, turn, min: distance[enc(board.s)] };
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
    'مزارع': riverArt + '02_boat_and_farmer/farmer_go.png'
  };

  function river(api, frame) {
    const board = api.authored.board;
    const rules = riverRules(board);
    let state = rules.initial;
    let crossings = 0;
    let busy = false;
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
      lead: esc(board.title), top: `<details class="ml-river-rules"><summary>قواعد المرحلة</summary>
        <p>${esc(board.description)} اختر الحمولة ثم اضغط وجهتك.</p><ul>
        ${rules.names.map((name, i) => `<li>${esc(name)} ← ${labels[rules.goal[i]]}</li>`).join('')}</ul></details>` });
    const panel = holder.querySelector('#lbb');
    panel.innerHTML = `<div class="ml-river-board" data-docks="${rules.places.length}">
      <div class="ml-river-places"></div>
      <div class="ml-river-vessel" aria-hidden="true">
        <div class="ml-river-rig">
          ${icon(riverArt + '04_effects/fx_wake_go.png', 'ml-river-wake')}
          ${icon(riverArt + '02_boat_and_farmer/boat_hull_go.png', 'ml-river-hull')}
          <div class="ml-river-seats"></div>
        </div>
      </div></div>
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
    const dock = bank => [34, 66, 50, 42, 58][bank];
    const portrait = name => portraits[name] || portraits[name.split(' ')[0]];
    let boardingFlight;

    function draw() {
      const focused = document.activeElement?.dataset.riverItem;
      const groups = rules.groups(state);
      const cargo = groups.filter(group => selected.has(group.name));
      banks.innerHTML = rules.places.map(bank => `<section class="ml-river-place" data-current="${bank === state.bank}">
        <h4>${labels[bank]}</h4><div>${groups.filter(group => state.loc[group.indices[0]] === bank).map(group =>
          `<button type="button" data-river-item="${esc(group.name)}" aria-pressed="${selected.has(group.name)}"
              ${busy || bank !== state.bank ? 'disabled' : ''}>
              ${portrait(group.name) ? icon(portrait(group.name)) : '<span class="ml-river-token" aria-hidden="true">◆</span>'}<span>${esc(group.name)}</span>
            </button>`).join('')}</div></section>`).join('');
      banks.querySelectorAll('button').forEach(button => {
        const name = button.dataset.riverItem;
        button.onclick = () => {
          if (busy || api.ended) return;
          const unloaded = selected.delete(name);
          if (!unloaded) selected.add(name);
          sound?.play(unloaded ? 'river.unboard' : 'river.board');
          const item = button.querySelector('img');
          const start = (unloaded ? Array.from(seats.children).find(seat => seat.dataset.cargoName === name) : item)?.getBoundingClientRect();
          draw();
          const target = Array.from(banks.querySelectorAll('[data-river-item]'))
            .find(itemButton => itemButton.dataset.riverItem === name)?.querySelector('img');
          const seated = Array.from(seats.children).find(item => item.dataset.cargoName === name);
          hop(item, start, unloaded ? target : seated);
        };
        if (focused === name && !button.disabled) button.focus({ preventScroll: true });
      });
      seats.innerHTML = cargo.map(({ name }) => {
        const src = portrait(name);
        return src ? `<img src="${src}" alt="" data-cargo-name="${esc(name)}">` : '';
      }).join('');
      vessel.style.setProperty('--dock', dock(state.bank) + '%');
      const weight = cargo.reduce((sum, group) => sum + group.weight, 0);
      vessel.style.setProperty('--tilt', Math.min(8, weight * 2) + 'deg');
      const captain = state.captain >= 0 ? ' · القائد: ' + rules.names[state.captain] : '';
      const tide = board.tide ? ' · ' + (state.phase ? 'جزر' : 'مد') : '';
      cargoStatus.textContent = `الحمولة ${XAR(weight)} / ${XAR(board.capacity)} · الرحلات ${XAR(crossings)}${captain}${tide}`;
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
      operations.forEach(operation => button(operation.label, () => {
        if (busy || api.ended) return;
        state = operation.state;
        selected.clear();
        api.msg(esc(operation.label));
        draw();
        check();
      }));
    }

    function hop(item, start, landing) {
      if (!item || !start || !landing || reduced.matches) return;
      const host = scene.getBoundingClientRect();
      const end = landing.getBoundingClientRect();
      const clone = item.cloneNode();
      boardingFlight?.remove();
      boardingFlight = clone;
      clone.className = 'ml-river-hop';
      Object.assign(clone.style, {
        left: start.left - host.left + 'px', top: start.top - host.top + 'px',
        width: start.width + 'px', height: start.height + 'px'
      });
      scene.append(clone);
      const dx = end.left - start.left;
      const dy = end.top - start.top;
      landing.style.visibility = 'hidden';
      const flight = clone.animate([
        { transform: 'translate(0,0)' },
        { transform: `translate(${dx / 2}px,${dy / 2 - 19}px) scale(1.12)` },
        { transform: `translate(${dx}px,${dy}px) scale(${end.width / start.width})` }
      ], { duration: 280, easing: 'ease-out' });
      flight.onfinish = () => { clone.remove(); landing.style.visibility = ''; };
    }

    function check() {
      if (!rules.won(state)) return;
      busy = true;
      draw();
      api.win(`أنهيت المرحلة في ${XAR(crossings)} رحلات. أقل حل: ${XAR(minimum)}.`);
    }

    function move(edge, cargo) {
      if (busy || api.ended) return;
      const action = rules.travel(state, edge, cargo);
      if (action.error) {
        api.wrong({ feedback: false });
        api.msg(esc(action.error));
        sound?.play('river.unboard');
        return;
      }
      busy = true;
      draw();
      if (!action.walk) {
        vessel.style.setProperty('--dock', dock(edge[1]) + '%');
        vessel.dataset.heading = dock(edge[1]) > dock(edge[0]) ? 'right' : 'left';
        scene.classList.add('sailing');
        sound?.play('river.cross');
      }
      later(() => {
        if (!scene.isConnected) return;
        if (!action.walk) {
          crossings++;
          sound?.play('river.dock');
        }
        state = action.state;
        scene.classList.remove('sailing');
        selected = new Set();
        busy = false;
        draw();
        api.msg('موقعك: ' + labels[state.bank]);
        check();
      }, reduced.matches || action.walk ? 0 : crossingTime);
    }

    draw();
    api.msg(`أقل حل: ${XAR(minimum)} رحلات.`);
    return {
      hint() {
        const action = rules.best(state)?.first;
        if (!action) return 'من هذا الوضع لا يوجد حل. أعد المرحلة من البداية.';
        if (!action.edge) return esc(action.label);
        const destination = labels[action.edge[1]];
        const cargo = action.cargo.map(group => group.name).join(' و');
        return `${action.walk ? 'سر' : 'أبحر'} إلى ${destination}${cargo ? ' ومعك ' + esc(cargo) : ' بلا حمولة'}.`;
      },
      reveal: () => `أقل حل للمرحلة: ${XAR(minimum)} رحلات.`
    };
  }

  window.mlAuthoredStages = { load, choose, complete, result, parking, pipes, ice, statues, river, riverRules };
})();
