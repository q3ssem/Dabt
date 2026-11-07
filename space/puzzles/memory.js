/* 04 الذاكرة — ذاكرة عاملة.
   د١: ٣×٤ أزواج. د٢: ٤×٤، وبعد كل خطأ تتبدّل البطاقتان المخطئتان مع بطاقتين مخفيتين أمام عينيك.
   د٣: مطابقة ثلاثية (٣ بطاقات)، وبعد كل خطأ تتبادل بطاقتان مخفيتان مكانيهما.
   لا تراجع في هذا اللغز: التراجع يكشف البطاقات المخفية. */
(function (G) {
  const SV = G.SV;
  const GL = {
    star: '<path d="M20 5l4.2 9.2 10 1-7.5 6.8 2.2 9.8L20 26.8 11.1 31.8l2.2-9.8L5.8 15.2l10-1z"/>',
    moon: '<path d="M25 6a14 14 0 1 0 4 26a11 11 0 1 1-4-26z"/>',
    crystal: '<path d="M20 4l9 11-9 21-9-21z M11 15h18"/>',
    leaf: '<path d="M8 32C8 14 20 6 33 7c1 13-7 25-25 25zM8 32l16-16"/>',
    flower: '<circle cx="20" cy="12" r="6"/><circle cx="28" cy="20" r="6"/><circle cx="20" cy="28" r="6"/><circle cx="12" cy="20" r="6"/><circle cx="20" cy="20" r="4"/>',
    wave: '<path d="M4 16q8-8 16 0t16 0M4 26q8-8 16 0t16 0"/>',
    sun: '<circle cx="20" cy="20" r="7"/><path d="M20 4v6M20 30v6M4 20h6M30 20h6M9 9l4 4M27 27l4 4M31 9l-4 4M13 27l-4 4"/>',
    key: '<circle cx="13" cy="20" r="7"/><path d="M20 20h15M30 20v6M34 20v4"/>',
    feather: '<path d="M30 5C16 9 9 21 10 34c11-3 20-14 20-29zM10 34l12-16"/>',
    eye: '<path d="M4 20q16-14 32 0q-16 14-32 0z"/><circle cx="20" cy="20" r="5"/>'
  };
  const GC = { star: '#E2A93B', moon: '#8FA6E8', crystal: '#5CC8FF', leaf: '#3FAF6A', flower: '#E25C9A', wave: '#3E8EEA', sun: '#F0A13A', key: '#C9962E', feather: '#B07AE8', eye: '#3FB8B0' };

  function generate(rng, grade) {
    const k = grade === 3 ? 3 : 2, rows = grade === 2 ? 4 : 3, cols = 4, N = rows * cols, kinds = N / k;
    const pick = rng.shuffle(Object.keys(GL)).slice(0, kinds);
    const deck = rng.shuffle(pick.flatMap(s => Array(k).fill(s)));
    return { k, rows, cols, deck, swapSeed: rng.int(1e9) };
  }

  function mount(ctx) {
    const P = ctx.P; let busy = false, flash = null;
    const wrap = SV.el('div', { class: 'svmm', style: `--c:${P.cols}` }); ctx.el.appendChild(wrap);
    const srng = SV.rng(P.swapSeed + ctx.S.resets);
    wrap.addEventListener('click', e => {
      const t = e.target.closest('[data-i]'); if (!t || busy) return; const i = +t.dataset.i, st = ctx.state;
      if (st.done[i] || st.sel.includes(i)) return;
      const sel = [...st.sel, i]; ctx.sfx.tap();
      const sym = sel.map(j => st.deck[j]);
      if (sym.some(s => s !== sym[0])) {
        // خطأ: اكشفها لحظة ثم أعدها
        busy = true; ctx.commit({ ...st, sel });
        setTimeout(() => {
          const cur = ctx.state, deck = cur.deck.slice(); let swapped = [];
          if (P.k === 2 && P.rows === 4) { // د٢: البطاقتان المخطئتان تتبدلان مع مخفيتين
            const hidden = [...deck.keys()].filter(j => !cur.done[j] && !sel.includes(j));
            sel.forEach(a => { if (!hidden.length) return; const b = hidden.splice(srng.int(hidden.length), 1)[0]; [deck[a], deck[b]] = [deck[b], deck[a]]; swapped.push(a, b); });
          } else if (P.k === 3) {
            const hidden = [...deck.keys()].filter(j => !cur.done[j] && !sel.includes(j));
            if (hidden.length >= 2) { const a = hidden.splice(srng.int(hidden.length), 1)[0], b = hidden.splice(srng.int(hidden.length), 1)[0]; [deck[a], deck[b]] = [deck[b], deck[a]]; swapped.push(a, b); }
          }
          busy = false;
          ctx.commit({ ...cur, deck, sel: [], swapped, miss: cur.miss + 1 }, { move: false });
          ctx.mistake(swapped.length ? 'لا تتطابق. لاحظ البطاقات التي تبدلت أماكنها!' : 'لا تتطابق. حاول تذكّر مواضعها.');
        }, 900);
        return;
      }
      if (sel.length === P.k) { const done = st.done.slice(); sel.forEach(j => done[j] = true); ctx.sfx.ok(); ctx.commit({ ...st, done, sel: [], swapped: [] }); return; }
      ctx.commit({ ...st, sel, swapped: [] }, { move: false });
    });
    function update(st) {
      wrap.innerHTML = st.deck.map((s, i) => {
        const up = st.done[i] || st.sel.includes(i) || (flash && flash.includes(i));
        return `<button class="svmm-c ${up ? 'up' : ''} ${st.done[i] ? 'done' : ''} ${st.swapped && st.swapped.includes(i) ? 'sw' : ''}" data-i="${i}" aria-label="بطاقة ${i + 1}">
          <span class="bk"><svg viewBox="0 0 40 40"><path d="M20 6l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></svg></span>
          <span class="fr"><svg viewBox="0 0 40 40" fill="none" stroke="${GC[s]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${GL[s]}</svg></span></button>`;
      }).join('');
    }
    ctx.flash = idx => { flash = idx; update(ctx.state); setTimeout(() => { flash = null; update(ctx.state); }, 1100); };
    return { update };
  }

  SV.registerType('memory', {
    generate, mount, noUndo: true,
    check: P => { const c = {}; P.deck.forEach(s => c[s] = (c[s] || 0) + 1); return Object.values(c).every(v => v === P.k); },
    init: P => ({ deck: P.deck.slice(), done: P.deck.map(() => false), sel: [], swapped: [], miss: 0 }),
    isSolved: (P, s) => s.done.every(Boolean),
    solved: P => ({ deck: P.deck.slice(), done: P.deck.map(() => true), sel: [], swapped: [], miss: 0 }),
    hint(P, s, lv, ctx) {
      if (lv === 1) return { text: 'اقلب البطاقات بترتيب منظم، صفًا بعد صف، وسمِّ كل رمز في ذهنك.' };
      if (lv === 2) return { text: P.k === 3 ? 'كل رمز يتكرر ثلاث مرات. لا تقلب الثالثة حتى تتذكر موضع أخت مطابقة.' : P.rows === 4 ? 'بعد كل خطأ تنتقل البطاقتان إلى مكانين جديدين، فراقب الحركة.' : 'كل رمز له بطاقة مطابقة واحدة.' };
      const left = [...s.deck.keys()].filter(j => !s.done[j]);
      const sym = s.deck[left[0]], set = left.filter(j => s.deck[j] === sym);
      return { text: 'انظر جيدًا: البطاقات المضيئة متطابقة.', mark: () => ctx.flash(set) };
    },
    stars(P, S) { const sets = P.deck.length / P.k, m = S.state.miss; return m <= sets * .5 ? 3 : m <= sets * 1.2 ? 2 : 1; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
