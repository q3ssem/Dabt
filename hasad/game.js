(function () {
  'use strict';
  const DATA = window.MINDLAB_HASAD_DATA;
  const ENGINE = window.MINDLAB_HASAD_ENGINE;
  if (!DATA || !ENGINE || !Array.isArray(DATA.words) || !Array.isArray(DATA.prompts)) {
    console.error('حصاد الكلمات: ملفات البيانات أو المحرك غير متاحة.');
    return;
  }
  const WORDS = DATA.words;
  const INDEX = ENGINE.buildIndex(WORDS);
  const POOLS = {
    semantic: ENGINE.eligiblePrompts(DATA.prompts, INDEX.byId, 'semantic'),
    initial_letter: ENGINE.eligiblePrompts(DATA.prompts, INDEX.byId, 'initial_letter'),
    alternating: ENGINE.eligiblePrompts(DATA.prompts, INDEX.byId, 'alternating')
  };
  const MODE_LABEL = { semantic: 'مجال دلالي', initial_letter: 'حرف البداية', alternating: 'التناوب بين فئتين' };
  const MODE_HINT = {
    semantic: 'اكتب كلمات تنتمي إلى المجال المعروض.',
    initial_letter: 'اكتب كلمات تبدأ بالحرف المعروض.',
    alternating: 'بدّل بين الفئتين بالترتيب: الأولى ثم الثانية.'
  };
  const MAX_RECENT = 12;
  const GAME_ID = 'hasad';

  function choosePrompt(mode) {
    const pool = POOLS[mode] || [];
    if (!pool.length) return null;
    const recentByMode = S.st.hasadRecent || (S.st.hasadRecent = {});
    const recent = Array.isArray(recentByMode[mode]) ? recentByMode[mode] : [];
    const getKey = p => `${mode}:${DATA.prompts.indexOf(p)}`;
    let available = pool.filter(p => !recent.includes(getKey(p)));
    if (!available.length) available = pool;
    const selected = available[Math.floor(Math.random() * available.length)];
    recentByMode[mode] = [...recent, getKey(selected)].slice(-MAX_RECENT);
    S.save();
    return selected;
  }
  function domainName(id) {
    const p = DATA.prompts.find(x => x.mode === 'semantic' && x.domain_id === id);
    if (p) return p.domain_name_ar;
    return DATA.category_names[id] || `الفئة ${id}`;
  }
  function runHasad() {
    return done => {
      const level = clamp(S.st.lv.hasad || 1, 1, 10);
      const stage = $('#stage');
      let ended = false, mode = '', prompt = null, allowedInfo = null;
      let points = 0, acceptedCount = 0, lastWords = [], used = new Set(), startedAt = 0;
      stage.innerHTML = hudHTML(false) + `
        <section class="hs-picker" id="hsPicker">
          <div class="hs-intro"><span class="hs-pill">المستوى ${level} من 10</span><h2>اختر نوع الحصاد</h2><p>كل جولة مدتها 60 ثانية. كل كلمة صحيحة وفريدة تمنحك 10 نقاط.</p></div>
          <div class="hs-mode-grid">
            <button class="hs-mode" data-hmode="semantic"><span class="hs-mode-ico">◈</span><b>المجالات</b><small>${POOLS.semantic.length} مجالًا متاحًا</small></button>
            <button class="hs-mode" data-hmode="initial_letter"><span class="hs-mode-ico">أ</span><b>الحروف</b><small>${POOLS.initial_letter.length} حرفًا متاحًا</small></button>
            <button class="hs-mode" data-hmode="alternating"><span class="hs-mode-ico">⇄</span><b>التناوب</b><small>${POOLS.alternating.length} تحديات متاحة</small></button>
          </div>
          <p class="hs-note">استُبعدت مؤقتًا بعض المجالات والحروف ذات المخزون القليل لضمان عدالة الجولة، وستُضاف عند توسعة البنك.</p>
        </section>`;
      $('#ml').textContent = 'حصاد الكلمات';
      $('#tl').textContent = '60 ث';
      stage.querySelectorAll('[data-hmode]').forEach(b => b.addEventListener('click', () => begin(b.dataset.hmode)));

      function begin(chosenMode) {
        if (ended) return;
        mode = chosenMode;
        prompt = choosePrompt(mode);
        if (!prompt) { $('#hsPicker').innerHTML = '<p class="hs-note">لا توجد جولات كافية لهذا الوضع بعد.</p>'; return; }
        allowedInfo = ENGINE.makeAllowed(prompt, WORDS, INDEX, level);
        used = new Set(); points = 0; acceptedCount = 0; lastWords = [];
              stage.innerHTML = hudHTML(true) + `
          <section class="hs-round">
            <div class="hs-round-top"><span class="hs-pill">${MODE_LABEL[mode]}</span><span class="hs-level">المستوى ${level}</span></div>
            <h2 class="hs-prompt" id="hsPrompt">${esc(prompt.prompt)}</h2>
            <p class="hs-help" id="hsHelp">${MODE_HINT[mode]}</p>
            ${mode === 'alternating' ? '<div class="hs-turn" id="hsTurn"></div>' : ''}
            <form class="hs-entry" id="hsForm" autocomplete="off">
              <input class="hs-input" id="hsAnswer" type="text" dir="rtl" lang="ar" inputmode="text" maxlength="40" placeholder="اكتب كلمة ثم اضغط إضافة" aria-label="إجابة عربية" autocomplete="off" autocapitalize="off" spellcheck="false">
              <button class="hs-add" id="hsAdd" type="submit">إضافة</button>
            </form>
            <p class="hs-feedback" id="hsFeedback" role="status" aria-live="polite">ابدأ بكتابة أول كلمة.</p>
            <div class="hs-stats"><span>الكلمات الصحيحة <b id="hsCount">0</b></span><span>المتاح في الجولة <b>${allowedInfo.allowed.size}</b></span></div>
            <ul class="hs-words" id="hsWords" aria-label="الكلمات المقبولة"></ul>
          </section>`;
        $('#ml').textContent = MODE_LABEL[mode];
        $('#sc').textContent = '0';
        $('#tl').textContent = '60 ث';
        if (mode === 'alternating') updateTurn();
        const form = $('#hsForm'), input = $('#hsAnswer'), add = $('#hsAdd');
        form.addEventListener('submit', e => { e.preventDefault(); submitWord(); });
        input.focus({ preventScroll: true });
        startedAt = performance.now();
        timeBar(Number(prompt.duration_seconds) || 60, endRound);
      }
      function updateTurn() {
        if (mode !== 'alternating') return;
        const ids = Object.keys(prompt.accepted_ids_by_category || {});
        const nextCategory = ids[acceptedCount % 2];
        const turn = $('#hsTurn');
        if (turn) turn.innerHTML = `الدور الآن: <b>${acceptedCount % 2 === 0 ? 'الفئة الأولى' : 'الفئة الثانية'}</b> · ${esc(domainName(nextCategory))}`;
      }
      function feedback(message, kind) {
        const box = $('#hsFeedback'); if (!box) return;
        box.textContent = message;
        box.className = `hs-feedback ${kind || ''}`;
      }
      function submitWord() {
        if (ended || !prompt) return;
        const input = $('#hsAnswer');
        if (!input) return;
        const text = input.value;
        const result = ENGINE.classifyAnswer({
          text, prompt, index: INDEX, allowed: allowedInfo.allowed, groups: allowedInfo.groups,
          used, acceptedCount
        });
        if (result.status === 'empty') { feedback('اكتب كلمة أولًا.', 'warn'); return; }
        if (result.status === 'accepted') {
          used.add(result.word.id); acceptedCount++; points += 10;
          $('#sc').textContent = String(points);
          $('#hsCount').textContent = String(acceptedCount);
          const list = $('#hsWords');
          const li = document.createElement('li');
          const word = document.createElement('b'); word.textContent = result.word.word;
          const def = document.createElement('small'); def.textContent = result.word.definition_ar || '';
          li.append(word, def); list.prepend(li);
          while (list.children.length > 8) list.lastElementChild.remove();
          feedback(`صحيحة: ${result.word.word} · +10 نقاط`, 'good');
          input.value = '';
          if (mode === 'alternating') updateTurn();
          sfx.ok(1);
          input.focus({ preventScroll: true });
          return;
        }
        if (result.status === 'duplicate') feedback('استخدمت هذه الكلمة من قبل في الجولة؛ لا تُحتسب مرتين.', 'warn');
        else if (result.status === 'out_of_turn') feedback(`الكلمة صحيحة، لكن الدور الآن لفئة ${acceptedCount % 2 === 0 ? 'الأولى' : 'الثانية'}.`, 'warn');
        else if (result.status === 'advanced_locked') feedback('هذه كلمة من المجموعة المتقدمة؛ تتاح ابتداءً من المستوى الرابع.', 'warn');
        else if (result.status === 'wrong_group') feedback('الكلمة موجودة في البنك، لكنها لا تنتمي إلى مجموعة هذه الجولة.', 'bad');
        else feedback('لم نعثر على هذه الصيغة في بنك الجولة. راجع كتابتها وحاول بكلمة أخرى.', 'bad');
        sfx.bad();
        input.select();
      }
      function endRound() {
        if (ended) return;
        ended = true;
        stopAll();
        const duration = Math.max(1, (performance.now() - startedAt) / 1000);
        const targetBase = 4 + Math.round(Math.log2(Math.max(10, allowedInfo.allowed.size)) * 1.25);
        const target = Math.min(18, targetBase + Math.floor((level - 1) * 0.55) + (mode === 'alternating' ? 1 : 0));
        const metric = Math.round(clamp(acceptedCount / target, 0, 1) * 1000);
        let nextLevel = level;
        if (metric >= 850 && acceptedCount >= target) nextLevel = Math.min(10, level + 1);
        else if (metric < 250 && level > 1) nextLevel = Math.max(1, level - 1);
        S.st.lv.hasad = nextLevel;
        S.save();
        const advancedCount = [...used].filter(id => INDEX.byId.get(id)?.tier === 'advanced').length;
        done({
          pts: points,
          metric,
          detail: `جمعت ${acceptedCount} كلمة صحيحة وفريدة خلال ${Math.round(duration)} ثانية في «${MODE_LABEL[mode]}». ${advancedCount ? `منها ${advancedCount} من المجموعة المتقدمة. ` : ''}${nextLevel > level ? 'ارتفع مستواك للجولة القادمة.' : nextLevel < level ? 'خفّضنا المستوى قليلًا ليتوازن التحدي.' : 'حافظت على مستواك الحالي.'} هذا مؤشر أداء داخل اللعبة وليس اختبارًا معياريًا للطلاقة أو الذكاء.`
        });
      }
    };
  }

  Object.assign(I, { hasad: '<img class="ui-ico-art ml-art" src="ui/designs_art/journey/v3/games/hasad.webp" alt="">' });
  G.push({
    id: GAME_ID, cat: 'flx', col: ['#78D8BA', '#3A9B88'], name: 'حصاد الكلمات', lab: 'Arabic Verbal Fluency',
    why: 'تحدٍّ للطلاقة اللفظية والتبديل بين الفئات: تستدعي كلمات من بنك عربي منظم، وتتنقل بين المجالات أو الحروف أو فئتين بالتناوب. النتيجة تصف أداءك في هذه اللعبة فقط ولا تمثل قياسًا سريريًا.',
    how: [
      `بنك الجولة يضم ${DATA.meta.total_words} كلمة موزعة على ${DATA.meta.domain_count} مجالات: ${DATA.meta.basic_words} أساسية و${DATA.meta.advanced_words} متقدمة.`,
      'اختر جولة دلالية، أو جولة تبدأ بحرف، أو تناوبًا بين فئتين.',
      'لديك 60 ثانية. كل كلمة موجودة في البنك ومطابقة للمطلوب وفريدة تمنحك 10 نقاط.'
    ],
    norm: m => Math.round(clamp(m, 0, 1000)), run: runHasad, nocd: 1
  });
  GM[GAME_ID] = G[G.length - 1];
  const oldRank = gameRank;
  gameRank = function (id) {
    if (id === GAME_ID) return [clamp(S.st.lv.hasad || 1, 1, 10), 10];
    return oldRank.apply(this, arguments);
  };
  S.prune();
  try { readChallenge(); } catch (e) {}
  try { renderAll(); } catch (e) { console.error('تعذر تحديث واجهة حصاد الكلمات', e); }
  window.MINDLAB_HASAD_RUNTIME = { pools: Object.fromEntries(Object.entries(POOLS).map(([k, v]) => [k, v.length])), wordCount: WORDS.length };
})();
