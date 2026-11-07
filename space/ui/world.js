/* عالم الكوكب: مشهد طولي، نقاط تفاعل، وَمْض ونو، المنارة، الفصول والمفاتيح، السجل، مقدمة الوصول.
   لا حوارات قصصية هنا: النصوص تعليمات لعب فقط. */
(function (G) {
  const SV = G.SV;
  let root = null, opts = {}, planet = null, chIdx = 0, hero = null, lastWin = false;
  const A = p => SV.asset(p), ar = SV.ar;
  const IC = {
    light: '<path d="M12 2l3 7-3 13-3-13z"/><path d="M5 9h14" opacity=".6"/>',
    rune: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 16l4-8 4 8M9.5 13h5"/>',
    stone: '<circle cx="12" cy="13" r="7"/><path d="M8 11q4-3 8 0"/>',
    card: '<rect x="4" y="3" width="11" height="15" rx="2"/><rect x="9" y="6" width="11" height="15" rx="2"/>',
    energy: '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 8l8 8"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    shard: '<path d="M12 2l6 8-6 12-6-12z"/><path d="M6 10h12"/>',
    key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
    relic: '<path d="M12 3l8 5v8l-8 5-8-5V8z"/><circle cx="12" cy="12" r="3"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h8M8 11h6"/>',
    sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'
  };
  const svg = (k, cls = '') => `<svg class="svic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
  const st = () => SV.store.st;
  const allDefs = () => planet.chapters.flatMap(c => c.puzzles.map(d => Object.assign(d, { chapterName: c.name })));
  const chDone = ch => ch.puzzles.length > 0 && ch.puzzles.every(d => SV.rec(d.puzzleId).status === 'done');
  const chOpen = ch => ch.id === 1 || st().inv.keys.includes(planet.chapters[ch.id - 2].key);
  const lockWhy = ch => `يحتاج مفتاح «${planet.chapters[ch.id - 2].name}»: أكمل ألغاز ذلك الفصل الخمسة.`;

  SV.open = function (host, o = {}) {
    opts = o; SV.store.load(); planet = SV.planets[st().planet] || SV.planets.nowara;
    root = SV.el('div', { class: 'svw', dir: 'rtl' }); host.appendChild(root);
    document.documentElement.classList.add('sv-lock');
    chIdx = 0;
    if (!st().intro) intro(() => { st().intro = true; SV.store.save(); world(true); }); else world(false);
    if (SV.store.restored) toast('استُعيد تقدمك من النسخة الاحتياطية.');
  };
  SV.close = function () { if (!root) return; root.remove(); root = null; document.documentElement.classList.remove('sv-lock'); opts.onClose && opts.onClose(); };

  /* ---------- المقدمة: وصول الرَّحّالة ---------- */
  function intro(done) {
    const el = SV.el('div', { class: 'svi' });
    el.innerHTML = `<img class="svi-g" src="${A(planet.art.galaxy)}" alt="">
      <img class="svi-p" src="${A(planet.art.planet)}" alt="">
      <img class="svi-s" src="${A(planet.art.ship)}" alt="الرَّحّالة">
      <div class="svi-t"><small>الكوكب ${ar(planet.index)} · ${planet.region}</small><b>${planet.name}</b></div>
      <button class="svi-skip">تخطٍّ</button>`;
    root.appendChild(el);
    SV.sfx.shard();
    let t = setTimeout(end, 5200);
    function end() { clearTimeout(t); el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, 600); }
    el.querySelector('.svi-skip').onclick = end;
  }

  /* ---------- العالم ---------- */
  function world(arrive) {
    root.querySelectorAll('.svw-world,.svw-top,.svw-ch').forEach(e => e.remove());
    const ch = planet.chapters[chIdx];
    const w = SV.el('div', { class: 'svw-world' });
    w.innerHTML = `<div class="svw-stage"><img class="svw-bg" src="${A(ch.env)}" alt="${ch.place}"><div class="svw-veil"></div></div>`;
    const stage = w.querySelector('.svw-stage');
    let html = '';
    if (ch.puzzles.length) ch.puzzles.forEach(d => {
      const r = SV.rec(d.puzzleId), sStars = [1, 2, 3].reduce((a, k) => a + ((r.g[k] && r.g[k].stars) || 0), 0);
      html += `<button class="svw-hs ${r.status}" style="left:${d.spot.x}%;top:${d.spot.y}%" data-p="${d.puzzleId}" aria-label="${d.name}">
        <span class="ring">${svg(d.spot.icon)}</span><span class="lb">${ar(d.n)} · ${d.name}${sStars ? ` <em>${'★'.repeat(Math.min(3, Math.ceil(sStars / 3)))}</em>` : ''}</span></button>`;
    });
    else html += `<div class="svw-wip"><b>${ch.name}</b><p>ألغاز هذا الفصل قيد البناء في هذه النسخة التجريبية:</p><p class="pl">${ch.planned.join(' · ')}</p></div>`;
    if (chIdx === 0) planet.chapters.slice(1).forEach(c => {
      const open = chOpen(c);
      html += `<button class="svw-hs gate ${open ? 'open' : 'locked'}" style="left:${c.gate.x}%;top:${c.gate.y}%" data-g="${c.id}" aria-label="${c.name}"><span class="ring">${svg(open ? 'key' : 'lock')}</span><span class="lb">${c.name}</span></button>`;
    });
    const b = planet.beacon, lit = st().beacon.lit;
    html += `<button class="svw-bc ${lit ? 'lit' : ''}" style="left:${b.at.x}%;top:${b.at.y}%;width:${b.at.w}%" data-b="1" aria-label="المنارة"><img src="${A(lit ? planet.art.beaconOn : planet.art.beaconOff)}" alt=""><i class="chg">${[1, 2, 3, 4].map(k => `<b class="${st().inv.keys.length >= k ? 'on' : ''}"></b>`).join('')}</i></button>`;
    const pos = hero || planet.start;
    html += `<div class="svw-no ${arrive ? 'arrive' : ''}" style="left:${pos.x + 8}%;top:${pos.y - 3}%"><img src="${A(planet.art.no)}" alt="نو"><img class="face" src="${A(planet.art.noFaces.joy)}" alt=""></div>
      <div class="svw-hero ${arrive ? 'arrive' : ''}" style="left:${pos.x}%;top:${pos.y}%"><img src="${A(planet.art.wamd)}" alt="وَمْض"></div>`;
    stage.insertAdjacentHTML('beforeend', html);
    root.prepend(w);

    const inv = st().inv, total = allDefs().length, done = allDefs().filter(d => SV.rec(d.puzzleId).status === 'done').length;
    const top = SV.el('header', { class: 'svw-top' });
    top.innerHTML = `<button class="svw-ib" data-a="exit" aria-label="خروج">✕</button>
      <div class="svw-tt"><small>${planet.name} · ${planet.region}</small><b>الفصل ${ar(ch.id)}: ${ch.name}</b><i class="bar"><b style="width:${ch.puzzles.length ? Math.round(ch.puzzles.filter(d => SV.rec(d.puzzleId).status === 'done').length / ch.puzzles.length * 100) : 0}%"></b></i></div>
      <div class="svw-cn"><span title="النجوم">${svg('star', 'gold')}${ar(inv.stars)}</span><span title="شظايا الطاقة">${svg('shard', 'cyan')}${ar(inv.shards)}</span><span title="مفاتيح المنارات">${svg('key', 'gold')}${ar(inv.keys.length)}/${ar(4)}</span><span title="القطعة الأثرية">${svg('relic', 'violet')}${ar(inv.artifacts.length)}</span></div>`;
    root.appendChild(top);
    const nav = SV.el('nav', { class: 'svw-ch' });
    nav.innerHTML = planet.chapters.map((c, i) => `<button class="${i === chIdx ? 'on' : ''} ${chOpen(c) ? '' : 'lk'} ${chDone(c) ? 'ok' : ''}" data-c="${i}">${chOpen(c) ? '' : svg('lock')}<b>${ar(c.id)}</b><small>${c.name}</small></button>`).join('')
      + `<button class="tool" data-a="journal" aria-label="سجل الرحلة">${svg('book')}<small>السجل</small></button><button class="tool" data-a="sound" aria-label="الصوت">${svg(st().settings.sfx ? 'sound' : 'mute')}<small>الصوت</small></button>`;
    root.appendChild(nav);
    bind(stage);
    if (arrive) { setTimeout(() => toast('اضغط على الساحة ليمشي وَمْض، أو على العلامات المضيئة لتكتشف الألغاز.'), 900); }
    if (lastWin) { lastWin = false; const no = stage.querySelector('.svw-no'); no.classList.add('joy'); setTimeout(() => no.classList.remove('joy'), 2200); }
  }

  function walkTo(stage, x, y, then) {
    const h = stage.querySelector('.svw-hero'), n = stage.querySelector('.svw-no');
    y = Math.max(44, Math.min(86, y)); x = Math.max(24, Math.min(76, x));
    hero = { x, y }; h.classList.add('walk'); h.style.left = x + '%'; h.style.top = y + '%';
    n.style.left = (x + (x > 60 ? -9 : 9)) + '%'; n.style.top = (y - 3) + '%';
    clearTimeout(walkTo.t); walkTo.t = setTimeout(() => { h.classList.remove('walk'); then && then(); }, 820);
  }

  function bind(stage) {
    stage.addEventListener('click', e => {
      const hs = e.target.closest('[data-p],[data-g],[data-b]');
      if (hs) {
        const r = hs.style; const x = parseFloat(r.left), y = parseFloat(r.top);
        SV.sfx.tap();
        walkTo(stage, x + (x > 50 ? -13 : 13), y + 5, () => hs.dataset.p ? puzzleSheet(hs.dataset.p) : hs.dataset.g ? gateSheet(+hs.dataset.g) : beaconSheet());
        return;
      }
      const rect = stage.getBoundingClientRect(), x = (e.clientX - rect.left) / rect.width * 100, y = (e.clientY - rect.top) / rect.height * 100;
      if (y > 46) walkTo(stage, x, y);
    });
    root.querySelector('.svw-top').onclick = e => { if (e.target.closest('[data-a=exit]')) SV.close(); };
    root.querySelector('.svw-ch').onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'journal') return journal();
      if (b.dataset.a === 'sound') { st().settings.sfx = !st().settings.sfx; SV.store.save(); world(false); return; }
      const c = planet.chapters[+b.dataset.c];
      if (!chOpen(c)) { SV.sfx.bad(); toast(lockWhy(c)); return; }
      chIdx = +b.dataset.c; hero = null; world(false);
    };
  }

  /* ---------- الألواح السفلية ---------- */
  function sheet(html) {
    closeSheet(); root.querySelectorAll('.svw-toast').forEach(x => x.remove());
    const s = SV.el('div', { class: 'svw-sheet', role: 'dialog' });
    s.innerHTML = `<div class="svw-sh"><button class="svw-x" aria-label="إغلاق">✕</button>${html}</div>`;
    s.onclick = e => { if (e.target === s || e.target.closest('.svw-x')) closeSheet(); };
    root.appendChild(s); requestAnimationFrame(() => s.classList.add('in'));
    return s;
  }
  function closeSheet() { root.querySelectorAll('.svw-sheet').forEach(s => s.remove()); }

  function puzzleSheet(id) {
    const d = allDefs().find(x => x.puzzleId === id), r = SV.rec(id);
    const s = sheet(`<small class="eb">لغز ${ar(d.n)} · ${d.chapterName}</small><h3>${d.name}</h3><p>${d.goal}</p>
      <div class="svw-gr">${[1, 2, 3].map(k => { const o = SV.rules.gradeOpen(id, k), g = r.g[k] || {}; return `<button data-k="${k}" ${o.ok ? '' : 'disabled'}><b>الدرجة ${ar(k)}</b><span>${['سهلة', 'متوسطة', 'متقدمة'][k - 1]}</span><em>${o.ok ? (g.done ? '★'.repeat(g.stars) + '☆'.repeat(3 - g.stars) : 'ابدأ') : svg('lock') + o.why}</em></button>`; }).join('')}</div>
      <p class="svw-rw">${svg('shard', 'cyan')} كل درجة تُكملها أول مرة تمنح شظايا طاقة (${ar(1)}/${ar(2)}/${ar(3)}) تشحن المنارة.</p>`);
    s.querySelector('.svw-gr').onclick = e => { const b = e.target.closest('[data-k]'); if (b && !b.disabled) { closeSheet(); openPuzzle(d, +b.dataset.k); } };
  }
  function gateSheet(cid) {
    const c = planet.chapters[cid - 1], open = chOpen(c);
    const s = sheet(`<small class="eb">الفصل ${ar(c.id)} · ${c.place}</small><h3>${c.name}</h3>
      <p>${open ? 'المنطقة مفتوحة.' : lockWhy(c)}</p><p class="pl">الألغاز: ${c.planned.join(' · ')}</p>
      ${open ? `<button class="pri" data-go="${cid - 1}">انتقل إلى ${c.name}</button>` : ''}`);
    const go = s.querySelector('[data-go]'); if (go) go.onclick = () => { closeSheet(); chIdx = +go.dataset.go; hero = null; world(false); };
  }
  function beaconSheet() {
    const b = planet.beacon, inv = st().inv;
    sheet(`<small class="eb">${planet.name}</small><h3>المنارة ${st().beacon.lit ? 'مضيئة' : 'مطفأة'}</h3>
      <p>تتوهج المنارة عند جمع ${ar(b.keys)} مفاتيح (مفتاح لكل فصل) و${ar(b.shards)} شظية طاقة، ثم حل لغز المنارة الختامي.</p>
      <ul class="svw-req"><li class="${inv.keys.length >= b.keys ? 'ok' : ''}">${svg('key', 'gold')} المفاتيح: ${ar(inv.keys.length)} من ${ar(b.keys)}</li><li class="${inv.shards >= b.shards ? 'ok' : ''}">${svg('shard', 'cyan')} شظايا الطاقة: ${ar(Math.min(inv.shards, b.shards))} من ${ar(b.shards)}</li><li>${svg('relic', 'violet')} عند التفعيل تُمنح القطعة الأثرية للكوكب.</li></ul>`);
  }
  function journal() {
    const defs = allDefs(), items = st().journal.slice().reverse().map(j => {
      if (j.k === 'puz') { const d = defs.find(x => x.puzzleId === j.id); return `<li>${svg('star', 'gold')}<span>أكملت «${d ? d.name : j.id}» — الدرجة ${ar(j.g)} ${'★'.repeat(j.s)}</span></li>`; }
      if (j.k === 'key') return `<li>${svg('key', 'gold')}<span>حصلت على مفتاح «${j.name}»</span></li>`;
      return '';
    }).join('');
    sheet(`<h3>سجل الرحلة</h3><p class="svw-sum">${ar(defs.filter(d => SV.rec(d.puzzleId).status === 'done').length)} من ${ar(20)} لغزًا · ${ar(st().inv.stars)} نجمة</p><ul class="svw-jr">${items || '<li>لا شيء بعد. ابدأ من «حدائق النور».</li>'}</ul>`);
  }

  /* ---------- اللغز ---------- */
  function openPuzzle(d, grade) {
    const ch = planet.chapters.find(c => c.id === d.chapterId);
    const host = SV.el('div', { class: 'svw-pz' });
    host.style.setProperty('--env', `url("${A(ch.env)}")`);
    root.appendChild(host);
    try {
      SV.play(host, d, grade, {
        onWin(def) {
          lastWin = true;
          const c = planet.chapters.find(x => x.id === def.chapterId), inv = st().inv;
          if (chDone(c) && !inv.keys.includes(c.key)) {
            inv.keys.push(c.key); st().journal.push({ t: Date.now(), k: 'key', id: c.key, name: c.name });
            setTimeout(SV.sfx.key, 900);
            const next = planet.chapters[c.id];
            return { html: `<li class="key">${svg('key', 'gold')} مفتاح المنارة: «${c.name}»${next ? ` — فُتح «${next.name}»` : ''}</li>` };
          }
          return null;
        },
        onExit() { host.remove(); world(false); },
        onExitSilent() { host.remove(); },
        onOpen(def, g) { openPuzzle(def, g); }
      });
    } catch (e) { host.remove(); toast('تعذر تجهيز اللغز. حاول مرة أخرى.'); console.error(e); }
  }

  function toast(t) {
    if (!root) return; root.querySelectorAll('.svw-toast').forEach(x => x.remove());
    const e = SV.el('div', { class: 'svw-toast', role: 'status' }); e.textContent = t; root.appendChild(e);
    setTimeout(() => e.classList.add('out'), 3800); setTimeout(() => e.remove(), 4300);
  }
})(typeof window !== 'undefined' ? window : globalThis);
