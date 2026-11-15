'use strict';
(function (root) {
  const GAME_ID = 'sw';
  const TITLE = 'حارس الإشارة';
  const PASS_MARK = 0.75;
  const MAX_RESULTS = 100;

  const OPTIONS = {
    parity: [{ id: 'even', label: 'زوجي' }, { id: 'odd', label: 'فردي' }],
    threshold: [{ id: 'greater', label: 'أكبر من ٥' }, { id: 'less', label: 'أصغر من ٥' }],
    shape: [{ id: 'circle', label: 'دائرة' }, { id: 'square', label: 'مربع' }, { id: 'diamond', label: 'مُعين' }],
    color: [{ id: 'red', label: 'أحمر' }, { id: 'blue', label: 'أزرق' }, { id: 'teal', label: 'فيروزي' }]
  };
  const RULES = {
    parity: 'هل الرقم زوجي أم فردي؟',
    threshold: 'هل الرقم أكبر أم أصغر من ٥؟',
    shape: 'ما شكل العنصر؟',
    color: 'ما لون العنصر؟'
  };
  const COLORS = {
    red: { label: 'أحمر', hex: '#f17d8e' },
    blue: { label: 'أزرق', hex: '#5698ff' },
    teal: { label: 'فيروزي', hex: '#26c6b5' }
  };
  const SIGNALS = {
    blue: { label: 'إشارة زرقاء', hex: '#5698ff', rule: 'parity' },
    violet: { label: 'إشارة بنفسجية', hex: '#a58af5', rule: 'threshold' },
    gold: { label: 'إشارة ذهبية', hex: '#ffbe59', rule: 'threshold' },
    coral: { label: 'إشارة مرجانية', hex: '#f17d8e', rule: 'color' },
    purple: { label: 'إشارة بنفسجية', hex: '#a58af5', rule: 'shape' }
  };

  const numberTrial = (value, answer, rule, signal) => ({
    rule, answer, stimulus: { type: 'number', value }, signal: signal || null
  });
  const shapeTrial = (shape, color, rule, answer, signal, distractor) => ({
    rule, answer, stimulus: { type: 'shape', shape, color, distractor: !!distractor }, signal: signal || null
  });
  const stages = [
    {
      id: 1, title: 'القاعدة الأولى: زوجي أم فردي؟', skill: 'اتباع قاعدة ثابتة',
      desc: 'تعرّف على قاعدة واحدة. حدّد هل الرقم يقبل القسمة على ٢ دون باقٍ.',
      instruction: 'في هذه المرحلة اتبع قاعدة الزوجي والفردي فقط.', trials: [
        numberTrial(2, 'even', 'parity'), numberTrial(7, 'odd', 'parity'),
        numberTrial(4, 'even', 'parity'), numberTrial(9, 'odd', 'parity'),
        numberTrial(6, 'even', 'parity'), numberTrial(3, 'odd', 'parity')
      ]
    },
    {
      id: 2, title: 'القاعدة الثانية: أكبر أم أصغر؟', skill: 'تطبيق قاعدة مقارنة',
      desc: 'استخدم قاعدة جديدة: قارن الرقم بالخمسة، ولا تخلطها بقاعدة الزوجي والفردي.',
      instruction: 'هل الرقم أكبر من ٥ أم أصغر من ٥؟', trials: [
        numberTrial(8, 'greater', 'threshold'), numberTrial(2, 'less', 'threshold'),
        numberTrial(7, 'greater', 'threshold'), numberTrial(4, 'less', 'threshold'),
        numberTrial(9, 'greater', 'threshold'), numberTrial(1, 'less', 'threshold')
      ]
    },
    {
      id: 3, title: 'التبديل المعلن بين قاعدتين', skill: 'الانتقال بين التعليمات',
      desc: 'ستتغير القاعدة بين الزوجي والفردي والمقارنة بالخمسة. اقرأ التعليمات في كل محاولة.',
      instruction: 'بطاقة التعليمات تخبرك بالقاعدة المطلوبة في كل مرة.', trials: [
        numberTrial(8, 'greater', 'threshold'), numberTrial(3, 'odd', 'parity'),
        numberTrial(2, 'less', 'threshold'), numberTrial(7, 'odd', 'parity'),
        numberTrial(6, 'greater', 'threshold'), numberTrial(4, 'even', 'parity'),
        numberTrial(1, 'odd', 'parity'), numberTrial(9, 'greater', 'threshold')
      ]
    },
    {
      id: 4, title: 'الإشارة اللونية تحدد القاعدة', skill: 'ربط الإشارة بالتعليمات',
      desc: 'لون الإشارة هو المفتاح: الأزرق لقاعدة الزوجي والفردي، والبنفسجي للمقارنة بالخمسة.',
      instruction: 'الأزرق = زوجي/فردي · البنفسجي = أكبر/أصغر من ٥', trials: [
        numberTrial(6, 'even', 'parity', 'blue'), numberTrial(8, 'greater', 'threshold', 'violet'),
        numberTrial(3, 'odd', 'parity', 'blue'), numberTrial(2, 'less', 'threshold', 'violet'),
        numberTrial(9, 'odd', 'parity', 'blue'), numberTrial(7, 'greater', 'threshold', 'violet'),
        numberTrial(4, 'even', 'parity', 'blue'), numberTrial(1, 'less', 'threshold', 'violet')
      ]
    },
    {
      id: 5, title: 'التبديل بين الشكل واللون', skill: 'تبديل مجموعة القواعد',
      desc: 'يتحول المطلوب بين تحديد شكل العنصر وتحديد لونه. اتبع نص التعليمات ولا تعتمد على المحاولة السابقة.',
      instruction: 'قد يُطلب منك تحديد الشكل أو اللون.', trials: [
        shapeTrial('circle', 'teal', 'shape', 'circle'), shapeTrial('square', 'red', 'color', 'red'),
        shapeTrial('diamond', 'blue', 'color', 'blue'), shapeTrial('square', 'teal', 'shape', 'square'),
        shapeTrial('circle', 'red', 'shape', 'circle'), shapeTrial('diamond', 'red', 'color', 'red'),
        shapeTrial('square', 'blue', 'color', 'blue'), shapeTrial('circle', 'blue', 'shape', 'circle')
      ]
    },
    {
      id: 6, title: 'مقاومة المشتت البصري', skill: 'التركيز وسط المشتتات',
      desc: 'يظهر عنصر صغير غير مهم بجانب الهدف. تجاهله، واستجب للقاعدة المكتوبة فقط.',
      instruction: 'العنصر الصغير مشتت لا يدخل في الإجابة.', trials: [
        shapeTrial('circle', 'teal', 'shape', 'circle', null, true), shapeTrial('square', 'red', 'color', 'red', null, true),
        shapeTrial('diamond', 'blue', 'color', 'blue', null, true), shapeTrial('square', 'teal', 'shape', 'square', null, true),
        shapeTrial('circle', 'red', 'shape', 'circle', null, true), shapeTrial('diamond', 'red', 'color', 'red', null, true),
        shapeTrial('square', 'blue', 'color', 'blue', null, true), shapeTrial('circle', 'blue', 'shape', 'circle', null, true)
      ]
    },
    {
      id: 7, title: 'التحدي المركّب: حارس الإشارة', skill: 'دمج أربع قواعد',
      desc: 'أربع قواعد مختلفة، ولكل قاعدة إشارة لونية ثابتة. اقرأ لون الإشارة ثم طبّق القاعدة المناسبة.',
      instruction: 'الأزرق = زوجي/فردي · الذهبي = مقارنة بالخمسة · البنفسجي = الشكل · المرجاني = اللون', trials: [
        numberTrial(8, 'even', 'parity', 'blue'), shapeTrial('circle', 'red', 'color', 'red', 'coral'),
        numberTrial(3, 'odd', 'parity', 'blue'), shapeTrial('square', 'blue', 'shape', 'square', 'purple'),
        numberTrial(7, 'greater', 'threshold', 'gold'), shapeTrial('diamond', 'teal', 'shape', 'diamond', 'purple'),
        numberTrial(2, 'less', 'threshold', 'gold'), shapeTrial('circle', 'blue', 'color', 'blue', 'coral'),
        numberTrial(9, 'odd', 'parity', 'blue'), shapeTrial('square', 'red', 'color', 'red', 'coral')
      ]
    }
  ];

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  }
  function validateStages(list) {
    const issues = [];
    if (!Array.isArray(list) || list.length !== 7) return ['يجب أن تتكون اللعبة من سبع مراحل.'];
    list.forEach((stage, index) => {
      if (stage.id !== index + 1) issues.push(`ترتيب المرحلة ${index + 1} غير صحيح.`);
      const expected = index < 2 ? 6 : index === 2 ? 8 : index < 6 ? 8 : 10;
      if (!Array.isArray(stage.trials) || stage.trials.length !== expected) issues.push(`عدد محاولات المرحلة ${stage.id} غير صحيح.`);
      (stage.trials || []).forEach((trial, ti) => {
        if (!OPTIONS[trial.rule]) { issues.push(`قاعدة غير معروفة في المرحلة ${stage.id}، المحاولة ${ti + 1}.`); return; }
        const matches = OPTIONS[trial.rule].filter(option => option.id === trial.answer).length;
        if (matches !== 1) issues.push(`مفتاح إجابة غير فريد في المرحلة ${stage.id}، المحاولة ${ti + 1}.`);
        if (trial.rule === 'parity' && (trial.stimulus.type !== 'number' || (trial.stimulus.value % 2 === 0 ? 'even' : 'odd') !== trial.answer)) issues.push(`مفتاح زوجي/فردي غير صحيح في المرحلة ${stage.id}، المحاولة ${ti + 1}.`);
        if (trial.rule === 'threshold' && (trial.stimulus.type !== 'number' || (trial.stimulus.value > 5 ? 'greater' : 'less') !== trial.answer)) issues.push(`مفتاح المقارنة غير صحيح في المرحلة ${stage.id}، المحاولة ${ti + 1}.`);
        if (trial.rule === 'shape' && (trial.stimulus.shape !== trial.answer)) issues.push(`مفتاح الشكل غير صحيح في المرحلة ${stage.id}، المحاولة ${ti + 1}.`);
        if (trial.rule === 'color' && (trial.stimulus.color !== trial.answer)) issues.push(`مفتاح اللون غير صحيح في المرحلة ${stage.id}، المحاولة ${ti + 1}.`);
        if (trial.signal && !SIGNALS[trial.signal]) issues.push(`إشارة غير معروفة في المرحلة ${stage.id}، المحاولة ${ti + 1}.`);
        if (trial.signal && SIGNALS[trial.signal].rule !== trial.rule) issues.push(`الإشارة لا تطابق القاعدة في المرحلة ${stage.id}، المحاولة ${ti + 1}.`);
      });
    });
    return issues;
  }
  function summarize(responses) {
    const total = responses.length;
    const correct = responses.filter(item => item.ok).length;
    const errors = total - correct;
    let switchErrors = 0, repeatErrors = 0;
    responses.forEach((item, index) => {
      if (item.ok || index === 0) return;
      if (responses[index - 1].rule !== item.rule) switchErrors++;
      else repeatErrors++;
    });
    const meanRT = total ? Math.round(responses.reduce((sum, item) => sum + Math.max(0, Number(item.rt) || 0), 0) / total) : 0;
    return { total, correct, errors, accuracy: total ? correct / total : 0, meanRT, switchErrors, repeatErrors };
  }
  function advanceProgress(unlockedStage, completedStage, accuracy) {
    const current = clampNumber(unlockedStage, 1, 7, 1);
    const completed = clampNumber(completedStage, 1, 7, 1);
    return accuracy >= PASS_MARK ? Math.max(current, Math.min(7, completed + 1)) : current;
  }
  function readProgress() {
    const saved = S.st.signalGuard && typeof S.st.signalGuard === 'object' ? S.st.signalGuard : {};
    const fallbackStage = S.st.lv && S.st.lv.signalGuard;
    return {
      unlockedStage: clampNumber(saved.unlockedStage == null ? fallbackStage : saved.unlockedStage, 1, 7, 1),
      results: Array.isArray(saved.results) ? saved.results.slice(-MAX_RESULTS) : []
    };
  }
  function persistProgress(progress) {
    S.st.signalGuard = progress;
    S.st.lv = S.st.lv || {};
    S.st.lv.signalGuard = progress.unlockedStage;
    S.save();
  }
  function optionLabel(rule, id) {
    const option = OPTIONS[rule].find(item => item.id === id);
    return option ? option.label : id;
  }
  function explanation(trial) {
    const stim = trial.stimulus;
    if (trial.rule === 'parity') return `الرقم ${stim.value} ${trial.answer === 'even' ? 'زوجي؛ لأنه يقبل القسمة على ٢ دون باقٍ.' : 'فردي؛ لأنه لا يقبل القسمة على ٢ دون باقٍ.'}`;
    if (trial.rule === 'threshold') return `الرقم ${stim.value} ${trial.answer === 'greater' ? 'أكبر' : 'أصغر'} من ٥.`;
    if (trial.rule === 'shape') return `الشكل الظاهر هو ${optionLabel('shape', trial.answer)}.`;
    return `لون العنصر هو ${optionLabel('color', trial.answer)}.`;
  }
  function stimulusHTML(stimulus) {
    if (stimulus.type === 'number') return `<div class="sg-number" role="img" aria-label="الرقم ${stimulus.value}">${stimulus.value}</div>`;
    const color = COLORS[stimulus.color];
    const shapeName = optionLabel('shape', stimulus.shape);
    return `<div class="sg-shape-scene" role="img" aria-label="${shapeName} باللون ${color.label}"><span class="sg-shape sg-shape-${stimulus.shape}" style="--sg-stim-color:${color.hex}"></span>${stimulus.distractor ? '<span class="sg-distractor" aria-hidden="true"></span>' : ''}</div>`;
  }
  function signalHTML(signalId) {
    if (!signalId) return '';
    const signal = SIGNALS[signalId];
    return `<span class="sg-signal" style="--sg-signal-color:${signal.hex}"><i aria-hidden="true"></i>${signal.label}</span>`;
  }
  function runSignalGuard() {
    return done => {
      const stageHost = document.querySelector('#stage');
      if (!stageHost) { done({ pts: 0, metric: 0, detail: 'تعذر فتح ساحة اللعبة.' }); return; }
      let progress = readProgress();
      let currentStage = null, trialIndex = 0, responses = [], locked = false, points = 0, trialStartedAt = 0;

      function renderSelector() {
        progress = readProgress();
        stageHost.innerHTML = hudHTML(false) + `<section class="sg-shell">
          <div class="sg-overview"><span class="sg-kicker">مسار الإتقان · ٧ مراحل · ٥٤ محاولة</span><h2>اختر مرحلة حارس الإشارة</h2><p>تتدرج من قاعدة واحدة إلى أربع قواعد مرتبطة بإشارات لونية. لا يوجد مؤقت ينهي المحاولة؛ الدقة أولًا.</p></div>
          <div class="sg-stage-grid">${stages.map(stage => {
            const available = stage.id <= progress.unlockedStage;
            const doneBefore = progress.results.some(item => item.stage === stage.id && item.passed);
            return `<button type="button" class="sg-stage-card ${available ? 'is-open' : 'is-locked'} ${stage.id === progress.unlockedStage ? 'is-current' : ''}" data-stage="${stage.id}" ${available ? '' : 'disabled'}>
              <span class="sg-stage-no">المرحلة ${stage.id}</span><b>${stage.title}</b><small>${stage.skill}</small><em>${available ? (doneBefore ? 'مفتوحة · يمكنك الإعادة' : 'متاحة') : 'مقفلة'}</em>
            </button>`;
          }).join('')}</div>
          <div class="sg-progress-note">${progress.unlockedStage === 7 ? 'وصلت إلى المرحلة الأخيرة. أعد أي مرحلة مفتوحة لتحسين دقتك.' : `المرحلة التالية تُفتح عند تحقيق دقة لا تقل عن ${Math.round(PASS_MARK * 100)}٪.`}</div>
        </section>`;
        const score = document.querySelector('#sc'); if (score) score.textContent = '0';
        const level = document.querySelector('#ml'); if (level) level.textContent = `مفتوح ${progress.unlockedStage}/7`;
        const count = document.querySelector('#tl'); if (count) count.textContent = 'اختر مرحلة';
        stageHost.querySelectorAll('[data-stage]').forEach(button => {
          button.addEventListener('click', () => startStage(Number(button.dataset.stage)));
        });
      }
      function startStage(stageId) {
        progress = readProgress();
        if (stageId < 1 || stageId > progress.unlockedStage) return;
        currentStage = stages[stageId - 1];
        trialIndex = 0; responses = []; points = 0; locked = false;
        renderTrial();
      }
      function renderTrial() {
        const trial = currentStage.trials[trialIndex];
        const n = currentStage.trials.length;
        const options = OPTIONS[trial.rule];
        const signalLegend = currentStage.id === 4
          ? '<div class="sg-legend"><span><i style="--sg-signal-color:#5698ff"></i>الأزرق: زوجي/فردي</span><span><i style="--sg-signal-color:#a58af5"></i>البنفسجي: مقارنة بالخمسة</span></div>'
          : currentStage.id === 7
            ? '<div class="sg-legend"><span><i style="--sg-signal-color:#5698ff"></i>الأزرق: زوجي/فردي</span><span><i style="--sg-signal-color:#ffbe59"></i>الذهبي: مقارنة</span><span><i style="--sg-signal-color:#a58af5"></i>البنفسجي: شكل</span><span><i style="--sg-signal-color:#f17d8e"></i>المرجاني: لون</span></div>'
            : '';
        const rulePrompt = trial.signal ? 'طبّق القاعدة المرتبطة بهذه الإشارة.' : RULES[trial.rule];
        stageHost.innerHTML = hudHTML(false) + `<section class="sg-shell">
          <div class="sg-play-top"><span class="sg-kicker">المرحلة ${currentStage.id} من ٧</span><span class="sg-counter">المحاولة ${trialIndex + 1} من ${n}</span></div>
          <h2 class="sg-stage-title">${currentStage.title}</h2><p class="sg-stage-desc">${currentStage.desc}</p>
          <div class="sg-progress-track" aria-label="التقدم في المرحلة"><i style="width:${Math.round(trialIndex / n * 100)}%"></i></div>
          ${signalLegend}
          <div class="sg-rule-card">${trial.signal ? signalHTML(trial.signal) : '<span class="sg-instruction-tag">التعليمات</span>'}<b>${rulePrompt}</b></div>
          <div class="sg-stimulus">${stimulusHTML(trial.stimulus)}</div>
          <div class="sg-options" role="group" aria-label="خيارات الإجابة">${options.map((option, index) => `<button type="button" class="sg-option" data-choice="${option.id}" data-choice-index="${index}">${option.label}<span>${index + 1}</span></button>`).join('')}</div>
          <p class="sg-feedback" id="sgFeedback" role="status" aria-live="polite"></p>
          <div class="sg-bottom"><span>قاعدة المرحلة: ${currentStage.skill}</span><button type="button" class="sg-back" id="sgBack">قائمة المراحل</button></div>
        </section>`;
        const score = document.querySelector('#sc'); if (score) score.textContent = String(points);
        const level = document.querySelector('#ml'); if (level) level.textContent = `المرحلة ${currentStage.id}/7`;
        const count = document.querySelector('#tl'); if (count) count.textContent = `${trialIndex + 1}/${n}`;
        locked = false; trialStartedAt = performance.now();
        stageHost.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => answer(button.dataset.choice, button)));
        const back = document.querySelector('#sgBack'); if (back) back.addEventListener('click', () => { if (!locked) renderSelector(); });
        keyH = event => {
          if (locked || !/^[1-4]$/.test(event.key)) return;
          const button = stageHost.querySelector(`[data-choice-index="${Number(event.key) - 1}"]`);
          if (button) { event.preventDefault(); button.click(); }
        };
      }
      function answer(value, chosenButton) {
        if (locked) return;
        locked = true;
        const trial = currentStage.trials[trialIndex];
        const rt = Math.max(0, Math.round(performance.now() - trialStartedAt));
        const ok = value === trial.answer;
        responses.push({ ok, rt, rule: trial.rule, value, target: trial.answer });
        if (ok) points += 10;
        const score = document.querySelector('#sc'); if (score) score.textContent = String(points);
        const back = document.querySelector('#sgBack'); if (back) back.disabled = true;
        const buttons = [...stageHost.querySelectorAll('[data-choice]')];
        buttons.forEach(button => {
          button.disabled = true;
          if (button.dataset.choice === trial.answer) button.classList.add('is-correct');
          else if (button === chosenButton && !ok) button.classList.add('is-wrong');
        });
        const feedback = document.querySelector('#sgFeedback');
        if (feedback) {
          feedback.className = `sg-feedback ${ok ? 'is-good' : 'is-bad'}`;
          feedback.textContent = `${ok ? 'إجابة صحيحة.' : `الإجابة الصحيحة: ${optionLabel(trial.rule, trial.answer)}.`} ${explanation(trial)}`;
        }
        later(() => {
          trialIndex++;
          if (trialIndex >= currentStage.trials.length) finishStage();
          else renderTrial();
        }, 650);
      }
      function finishStage() {
        const summary = summarize(responses);
        const passed = summary.accuracy >= PASS_MARK;
        const nextUnlocked = advanceProgress(progress.unlockedStage, currentStage.id, summary.accuracy);
        const nextProgress = readProgress();
        nextProgress.unlockedStage = nextUnlocked;
        nextProgress.results.push({
          stage: currentStage.id, accuracy: summary.accuracy, meanRT: summary.meanRT,
          correct: summary.correct, errors: summary.errors, switchErrors: summary.switchErrors,
          repeatErrors: summary.repeatErrors, passed, completedAt: new Date().toISOString()
        });
        nextProgress.results = nextProgress.results.slice(-MAX_RESULTS);
        persistProgress(nextProgress);
        progress = nextProgress;
        const errorDetail = summary.errors
          ? `الأخطاء: ${summary.errors}، منها ${summary.switchErrors} بعد تبديل القاعدة و${summary.repeatErrors} مع استمرار القاعدة.`
          : 'لم تسجل أخطاء في هذه المرحلة.';
        const nextDetail = passed
          ? (currentStage.id === 7 ? 'اجتزت جميع المراحل السبع.' : `فُتحت المرحلة ${currentStage.id + 1}.`)
          : `لم تُفتح المرحلة التالية؛ تحتاج إلى ${Math.round(PASS_MARK * 100)}٪ على الأقل. يمكنك إعادة المرحلة.`;
        done({
          pts: summary.correct * 10,
          metric: Math.round(summary.accuracy * 1000),
          detail: `حارس الإشارة · ${currentStage.title}. الدقة ${Math.round(summary.accuracy * 100)}٪ (${summary.correct}/${summary.total})، ومتوسط زمن الاستجابة ${summary.meanRT} مللي ثانية. ${errorDetail} ${nextDetail} السرعة والدقة معروضان كلٌّ على حدة، ولا تُحوّلان إلى درجة ذكاء.`
        });
      }
      renderSelector();
    };
  }

  const issues = validateStages(stages);
  const game = (typeof GM !== 'undefined' && GM[GAME_ID]) || (typeof G !== 'undefined' && G.find(item => item.id === GAME_ID));
  if (issues.length) {
    console.error('حارس الإشارة: فشل تدقيق بيانات المراحل', issues);
    return;
  }
  if (!game) {
    console.error('حارس الإشارة: لم يُعثر على خانة اللعبة الحالية.');
    return;
  }
  game.hidden = false;
  game.name = TITLE;
  game.lab = 'Signal Guard · Task Switching';
  game.why = 'تدريب متدرج على اتباع القواعد وتبديلها، ثم استخدام الإشارات اللونية مع تجاهل المشتتات. النتائج تصف أداءك داخل اللعبة فقط ولا تمثل قياسًا للذكاء أو تشخيصًا.';
  game.how = [
    'اتبع قاعدة واحدة أولًا، ثم تعلّم قاعدة ثانية.',
    'انتقل بين القواعد المعلنة، وبعدها استخدم الإشارات اللونية لتحديد القاعدة المطلوبة.',
    'في المراحل المتقدمة تجاهل المشتت البصري. تُفتح المرحلة التالية عند دقة ٧٥٪ على الأقل.'
  ];
  game.norm = metric => Math.max(0, Math.min(1000, Math.round(Number(metric) || 0)));
  game.run = runSignalGuard;
  game.nocd = 1;
  delete game.quiz;

  const previousGameRank = gameRank;
  gameRank = function (id) {
    if (id === GAME_ID) return [readProgress().unlockedStage, 7];
    return previousGameRank.apply(this, arguments);
  };

  root.MINDLAB_SIGNAL_GUARD_RUNTIME = {
    id: GAME_ID, title: TITLE, passMark: PASS_MARK, stages, options: OPTIONS,
    validate: () => validateStages(stages), summarize, advanceProgress, readProgress, persistProgress,
    totalTrials: stages.reduce((sum, stage) => sum + stage.trials.length, 0)
  };
  try { if (typeof renderAll === 'function') renderAll(); } catch (error) { console.error('تعذر تحديث واجهة حارس الإشارة', error); }
})(window);
