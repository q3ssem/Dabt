'use strict';
(function (root) {
  const GAME_ID = 'ear';
  const TITLE = 'أذن يقظة';
  const PASS_MARK = 0.75;
  const MAX_RESULTS = 100;
  const PITCH = Object.freeze({ low: 360, mid: 520, high: 760 });
  const pitchName = key => ({ low: 'منخفضة', mid: 'متوسطة', high: 'حادة' }[key] || key);
  const pitchSequenceLabel = seq => seq.map(pitchName).join(' · ');
  const rhythmLabel = pattern => pattern.map(x => x === 'S' ? 'قصير' : 'طويل').join(' · ');
  const tone = (freq, gap = 150, duration = 125) => ({ freq, gap, duration });
  const pitchTrial = (key, options, explanation) => ({ kind: 'pitch', tones: [tone(PITCH[key])], answer: key, options, explanation });
  const intervalTrial = (first, second, answer) => ({ kind: 'interval', tones: [tone(PITCH[first], 180), tone(PITCH[second])], answer, options: [{ id: 'up', label: 'الثانية أعلى' }, { id: 'down', label: 'الثانية أقل' }], explanation: 'قارن طبقة الصوتين، ولا تعتمد على شدة الصوت.' });
  const sequenceTrial = (sequence, options) => ({ kind: 'sequence', tones: sequence.map((p, i) => tone(PITCH[p], i === sequence.length - 1 ? 100 : 150)), answer: sequence.join('-'), options: options.map(id => ({ id, label: pitchSequenceLabel(id.split('-')) })), explanation: 'استدعِ ترتيب الطبقات كما سمعتها من البداية إلى النهاية.' });
  const rhythmTrial = (pattern, options) => ({ kind: 'rhythm', pattern, answer: pattern.join('-'), options: options.map(id => ({ id, label: rhythmLabel(id.split('-')) })), explanation: 'تذكّر المسافات الزمنية بين النقرات؛ النغمة نفسها لا تتغير.' });
  const targetTrial = (freqs, answer) => ({ kind: 'target', tones: freqs.map((f, i) => tone(f, i === freqs.length - 1 ? 120 : 150, 105)), answer, options: [{ id: 'yes', label: 'نعم، سمعتها' }, { id: 'no', label: 'لا، لم تظهر' }], explanation: 'النغمة الهدف هي النغمة الحادة الواضحة، وليست النغمة المتوسطة.' });
  const pairTrial = (pairs, answer) => ({ kind: 'pairs', pairs, answer, options: [{ id: 'yes', label: 'نعم، ظهر النمط' }, { id: 'no', label: 'لا، لم يظهر' }], explanation: 'النمط الهدف صوت حاد يتبعه صوت منخفض مباشرة داخل الزوج نفسه.' });

  // Six fixed, reproducible stages: 48 trials. No random trial generation.
  const STAGES = [
    { id: 1, title: 'التقاط النغمة', skill: 'تمييز طبقة الصوت', desc: 'استمع إلى النغمة وحدّد هل هي منخفضة أم حادة.', trials: [
      pitchTrial('low', [{id:'low',label:'منخفضة'},{id:'high',label:'حادة'}], 'النغمة المنخفضة أقرب إلى الصوت الغليظ.'),
      pitchTrial('high', [{id:'low',label:'منخفضة'},{id:'high',label:'حادة'}], 'النغمة الحادة أعلى طبقة.'),
      pitchTrial('high', [{id:'high',label:'حادة'},{id:'low',label:'منخفضة'}], 'النغمة الحادة أعلى طبقة.'),
      pitchTrial('low', [{id:'high',label:'حادة'},{id:'low',label:'منخفضة'}], 'النغمة المنخفضة أقرب إلى الصوت الغليظ.'),
      pitchTrial('low', [{id:'low',label:'منخفضة'},{id:'high',label:'حادة'}], 'النغمة المنخفضة أقرب إلى الصوت الغليظ.'),
      pitchTrial('high', [{id:'high',label:'حادة'},{id:'low',label:'منخفضة'}], 'النغمة الحادة أعلى طبقة.'),
      pitchTrial('low', [{id:'high',label:'حادة'},{id:'low',label:'منخفضة'}], 'النغمة المنخفضة أقرب إلى الصوت الغليظ.'),
      pitchTrial('high', [{id:'low',label:'منخفضة'},{id:'high',label:'حادة'}], 'النغمة الحادة أعلى طبقة.')
    ]},
    { id: 2, title: 'اتجاه النغمة', skill: 'مقارنة التغير السمعي', desc: 'استمع إلى صوتين متتابعين: هل ارتفعت الطبقة أم انخفضت؟', trials: [
      intervalTrial('low','high','up'), intervalTrial('high','low','down'), intervalTrial('mid','high','up'), intervalTrial('high','mid','down'),
      intervalTrial('low','mid','up'), intervalTrial('mid','low','down'), intervalTrial('mid','high','up'), intervalTrial('high','low','down')
    ]},
    { id: 3, title: 'الذاكرة السمعية', skill: 'تذكر تسلسل الأصوات', desc: 'احفظ ترتيب ثلاث أو أربع طبقات صوتية، ثم اختر التسلسل المطابق.', trials: [
      sequenceTrial(['low','mid','high'], ['low-mid-high','low-high-mid','mid-low-high']),
      sequenceTrial(['high','low','mid'], ['mid-low-high','high-low-mid','high-mid-low']),
      sequenceTrial(['mid','high','low'], ['mid-high-low','low-high-mid','mid-low-high']),
      sequenceTrial(['low','high','mid','low'], ['low-high-mid-low','low-mid-high-low','high-low-mid-low']),
      sequenceTrial(['high','mid','high'], ['high-mid-low','high-mid-high','mid-high-high']),
      sequenceTrial(['mid','low','mid','high'], ['mid-low-mid-high','mid-high-mid-low','low-mid-mid-high']),
      sequenceTrial(['low','low','high'], ['low-high-low','low-low-high','high-low-low']),
      sequenceTrial(['high','mid','low','mid'], ['high-mid-low-mid','high-low-mid-mid','mid-high-low-mid'])
    ]},
    { id: 4, title: 'بصمة الإيقاع', skill: 'تمييز النمط الزمني', desc: 'استمع إلى أربع نقرات متباعدة، ثم اختر ترتيب الفواصل القصيرة والطويلة.', trials: [
      rhythmTrial(['S','L','S','S'], ['S-L-S-S','L-S-S-S','S-S-L-S']),
      rhythmTrial(['L','S','L','S'], ['S-L-S-L','L-S-L-S','L-L-S-S']),
      rhythmTrial(['S','S','L','L'], ['S-S-L-L','S-L-S-L','L-S-S-L']),
      rhythmTrial(['L','L','S','S'], ['L-L-S-S','L-S-L-S','S-L-L-S']),
      rhythmTrial(['S','L','L','S'], ['S-L-S-L','L-S-L-S','S-L-L-S']),
      rhythmTrial(['L','S','S','L'], ['L-S-S-L','S-L-S-L','L-L-S-S']),
      rhythmTrial(['S','S','S','L'], ['L-S-S-S','S-S-S-L','S-L-S-S']),
      rhythmTrial(['L','S','L','L'], ['L-S-L-L','S-L-L-L','L-L-S-L'])
    ]},
    { id: 5, title: 'رصد النغمة الهدف', skill: 'الانتباه السمعي المستمر', desc: 'تظهر سلسلة من النغمات. قرّر هل ظهرت النغمة الحادة المستهدفة أم لا.', trials: [
      targetTrial([360,520,360,760,520,360,520], 'yes'), targetTrial([360,520,360,520,360,520,360], 'no'),
      targetTrial([520,360,520,360,520,760,360], 'yes'), targetTrial([360,360,520,520,360,520,360], 'no'),
      targetTrial([520,760,520,360,520,360,520], 'yes'), targetTrial([360,520,360,520,360,360,520], 'no'),
      targetTrial([360,520,520,760,360,520,360], 'yes'), targetTrial([520,360,520,360,360,520,360], 'no')
    ]},
    { id: 6, title: 'النمط وسط المشتتات', skill: 'الانتباه الانتقائي السمعي', desc: 'استمع إلى أزواج متتابعة. ابحث عن النمط المحدد: نغمة حادة يتبعها صوت منخفض داخل الزوج نفسه.', trials: [
      pairTrial([[760,360],[360,520],[520,520],[360,760]], 'yes'),
      pairTrial([[360,760],[520,520],[360,360],[520,360]], 'no'),
      pairTrial([[520,360],[760,360],[360,520],[520,760]], 'yes'),
      pairTrial([[360,360],[520,760],[360,520],[760,760]], 'no'),
      pairTrial([[520,520],[360,360],[760,360],[520,360]], 'yes'),
      pairTrial([[760,760],[360,520],[520,360],[360,360]], 'no'),
      pairTrial([[360,520],[520,520],[760,360],[360,760]], 'yes'),
      pairTrial([[520,360],[760,520],[360,360],[520,520]], 'no')
    ]}
  ];

  function validateStages(stages) {
    const issues = [];
    if (!Array.isArray(stages) || stages.length !== 6) return ['يجب أن تتكون اللعبة من ست مراحل.'];
    stages.forEach((stage, si) => {
      if (stage.id !== si + 1 || !Array.isArray(stage.trials) || stage.trials.length !== 8) issues.push(`بنية المرحلة ${si + 1} غير صحيحة.`);
      (stage.trials || []).forEach((trial, ti) => {
        if (!Array.isArray(trial.options) || trial.options.length < 2) issues.push(`خيارات المحاولة ${si + 1}.${ti + 1} ناقصة.`);
        if (!trial.options || trial.options.filter(o => o.id === trial.answer).length !== 1) issues.push(`الإجابة الصحيحة ليست فريدة في ${si + 1}.${ti + 1}.`);
        if (trial.kind === 'pitch' && (!['low','high'].includes(trial.answer) || trial.tones.length !== 1)) issues.push(`بيانات تمييز الطبقة غير صحيحة في ${si + 1}.${ti + 1}.`);
        if (trial.kind === 'interval' && (trial.tones.length !== 2 || !['up','down'].includes(trial.answer))) issues.push(`بيانات المقارنة غير صحيحة في ${si + 1}.${ti + 1}.`);
        if (trial.kind === 'sequence' && trial.answer.split('-').some(p => !PITCH[p])) issues.push(`تسلسل غير معروف في ${si + 1}.${ti + 1}.`);
        if (trial.kind === 'rhythm' && (trial.pattern.length !== 4 || trial.pattern.some(p => !['S','L'].includes(p)))) issues.push(`إيقاع غير صالح في ${si + 1}.${ti + 1}.`);
        if (trial.kind === 'target' && (trial.tones.length !== 7 || !['yes','no'].includes(trial.answer))) issues.push(`بيانات رصد الهدف غير صحيحة في ${si + 1}.${ti + 1}.`);
        if (trial.kind === 'pairs' && (trial.pairs.length !== 4 || !['yes','no'].includes(trial.answer))) issues.push(`بيانات الأزواج غير صحيحة في ${si + 1}.${ti + 1}.`);
      });
    });
    return issues;
  }
  function buildEvents(trial) {
    if (trial.kind === 'rhythm') return trial.pattern.map((p, i) => ({ freq: 520, duration: 105, gap: p === 'S' ? 135 : 390 }));
    if (trial.kind === 'pairs') return trial.pairs.flatMap(pair => [
      { freq: pair[0], duration: 105, gap: 70 },
      { freq: pair[1], duration: 105, gap: 255 }
    ]);
    return trial.tones.map(t => ({ freq: t.freq, duration: t.duration, gap: t.gap }));
  }
  function summarize(responses) {
    const total = responses.length;
    const correct = responses.filter(r => r.ok).length;
    const times = responses.map(r => Math.max(0, Number(r.rt) || 0));
    return { total, correct, errors: total - correct, accuracy: total ? correct / total : 0,
      meanRT: times.length ? Math.round(times.reduce((a,b)=>a+b,0) / times.length) : 0,
      medianRT: times.length ? Math.round(times.slice().sort((a,b)=>a-b)[Math.floor(times.length / 2)]) : 0 };
  }
  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
  }
  function readProgress() {
    const saved = S.st.earAlert && typeof S.st.earAlert === 'object' ? S.st.earAlert : {};
    const fallback = S.st.lv && S.st.lv.earAlert;
    return { unlockedStage: clampNumber(saved.unlockedStage == null ? fallback : saved.unlockedStage, 1, 6, 1),
      results: Array.isArray(saved.results) ? saved.results.slice(-MAX_RESULTS) : [] };
  }
  function persistProgress(progress) {
    S.st.earAlert = progress;
    S.st.lv = S.st.lv || {};
    S.st.lv.earAlert = progress.unlockedStage;
    S.save();
  }
  function advanceProgress(current, completed, accuracy) {
    const open = clampNumber(current, 1, 6, 1);
    const stage = clampNumber(completed, 1, 6, 1);
    return accuracy >= PASS_MARK ? Math.max(open, Math.min(6, stage + 1)) : open;
  }
  function runEarAlert() {
    return function (done) {
      const stageHost = document.querySelector('#stage');
      let progress = readProgress(), currentStage = null, trialIndex = 0, responses = [], points = 0;
      let audioContext = null, locked = false, playing = false, canAnswer = false, playCount = 0, trialStartedAt = 0;
      let activeNodes = [], timers = [];
      const format = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
      const clearAudio = () => {
        activeNodes.forEach(node => { try { node.stop(); } catch (e) {} try { node.disconnect(); } catch (e) {} });
        activeNodes = [];
      };
      const stopAudio = () => { clearAudio(); timers.forEach(id => clearTimeout(id)); timers = []; };
      if (typeof cleanup !== 'undefined' && Array.isArray(cleanup)) cleanup.push(() => {
        stopAudio();
        if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {});
      });
      function ensureAudio() {
        const AudioCtor = root.AudioContext || root.webkitAudioContext;
        if (!AudioCtor) return Promise.reject(new Error('المتصفح لا يدعم تشغيل الصوت التفاعلي.'));
        if (!audioContext) { try { audioContext = new AudioCtor({ latencyHint: 'interactive' }); } catch (error) { audioContext = new AudioCtor(); } }
        return audioContext.state === 'suspended' ? audioContext.resume() : Promise.resolve();
      }
      function renderSelector(message) {
        stopAudio(); currentStage = null;
        const latest = progress.results.slice().reverse();
        stageHost.innerHTML = `<section class="ea-shell" dir="rtl">
          <div class="ea-overview"><span class="ea-kicker">مختبر العقل · الانتباه السمعي</span><h2>أذن يقظة</h2>
          <p>ست مراحل ثابتة تختبر تمييز الطبقات، ومقارنة النغمات، وتذكر التسلسلات والإيقاع، ورصد الصوت الهدف وسط المشتتات.</p>
          <div class="ea-note"><b>قبل البدء:</b> ارفع صوت الجهاز إلى مستوى مريح. يفضّل استخدام سماعات في مكان هادئ. الأصوات مولّدة داخل المتصفح، ولا نستخدم الميكروفون ولا نسجّل صوتك.</div>
          ${message ? `<p class="ea-message" role="status">${message}</p>` : ''}</div>
          <div class="ea-stage-grid">${STAGES.map(stage => { const unlocked = stage.id <= progress.unlockedStage, prior = latest.find(r => r.stage === stage.id && r.passed); return `<button type="button" class="ea-stage-card ${unlocked ? '' : 'is-locked'}" data-stage="${stage.id}" ${unlocked ? '' : 'disabled'}>
            <span class="ea-stage-no">المرحلة ${format(stage.id)}</span><b>${stage.title}</b><small>${stage.skill}</small><em>${prior ? 'اجتزتها سابقًا' : unlocked ? 'متاحة للتجربة' : 'مغلقة · اجتز المرحلة السابقة'}</em></button>`; }).join('')}</div>
          <div class="ea-progress-note">المراحل المفتوحة: ${format(progress.unlockedStage)} من ٦ · ${format(progress.results.length)} نتيجة محفوظة</div>
          <p class="ea-footnote">عتبة فتح المرحلة التالية: دقة ٧٥٪ على الأقل. هذه عتبة تجريبية للعبة وليست معيارًا نفسيًا أو طبيًا.</p>
        </section>`;
        stageHost.querySelectorAll('[data-stage]').forEach(button => button.addEventListener('click', () => beginStage(Number(button.dataset.stage))));
      }
      function beginStage(id) {
        if (id > progress.unlockedStage) return;
        currentStage = STAGES[id - 1]; trialIndex = 0; responses = []; points = 0;
        renderTrial();
      }
      function renderTrial(feedback = '') {
        const trial = currentStage.trials[trialIndex];
        locked = false; playing = false; canAnswer = false; playCount = 0;
        const options = trial.options.map((option, index) => `<button type="button" class="ea-option" data-answer="${option.id}" disabled><span>${format(index + 1)}</span>${option.label}</button>`).join('');
        stageHost.innerHTML = `<section class="ea-shell" dir="rtl">
          <div class="ea-play-top"><span class="ea-kicker">المرحلة ${format(currentStage.id)} من ٦</span><span class="ea-counter">المحاولة ${format(trialIndex + 1)} من ٨</span></div>
          <h2 class="ea-stage-title">${currentStage.title}</h2><p class="ea-stage-desc">${currentStage.desc}</p>
          <div class="ea-progress-track"><i style="width:${(trialIndex / currentStage.trials.length) * 100}%"></i></div>
          <div class="ea-prompt"><span>المطلوب</span><b>${trial.kind === 'pitch' ? 'استمع وحدّد طبقة النغمة.' : trial.kind === 'interval' ? 'هل ارتفعت النغمة الثانية أم انخفضت؟' : trial.kind === 'sequence' ? 'احفظ ترتيب الطبقات الصوتية.' : trial.kind === 'rhythm' ? 'احفظ ترتيب الفواصل الزمنية.' : trial.kind === 'target' ? 'هل ظهرت النغمة الحادة الهدف؟' : 'هل سمعت نغمة حادة يتبعها صوت منخفض داخل زوج واحد؟'}</b></div>
          <div class="ea-listen-card"><div class="ea-sound-mark" aria-hidden="true">♫</div><p id="eaSoundStatus" aria-live="polite">اضغط تشغيل للاستماع إلى النمط.</p>
            <button type="button" class="ea-play-button" id="eaPlay"><span aria-hidden="true">▶</span> تشغيل النمط الصوتي</button>
            <small>يمكنك إعادة الاستماع مرة واحدة قبل الإجابة.</small></div>
          <div class="ea-options" role="group" aria-label="خيارات الإجابة">${options}</div>
          <p class="ea-feedback" id="eaFeedback" role="status" aria-live="polite">${feedback}</p>
          <div class="ea-bottom"><span>${currentStage.skill}</span><button type="button" class="ea-back" id="eaBack">قائمة المراحل</button></div>
        </section>`;
        stageHost.querySelector('#eaPlay').addEventListener('click', playCurrent);
        stageHost.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => answer(button.dataset.answer, button)));
        stageHost.querySelector('#eaBack').addEventListener('click', () => { if (!playing) renderSelector(); });
      }
      async function playCurrent() {
        if (playing || playCount >= 2) return;
        const status = stageHost.querySelector('#eaSoundStatus'), button = stageHost.querySelector('#eaPlay');
        playing = true; canAnswer = false;
        stageHost.querySelectorAll('[data-answer]').forEach(b => { b.disabled = true; });
        try {
          await ensureAudio();
          stopAudio(); playCount++;
          if (button) { button.disabled = true; button.textContent = 'يُشغَّل النمط…'; }
          if (status) status.textContent = `استمع جيدًا · إعادة ${format(playCount - 1)} من ١`;
          const events = buildEvents(currentStage.trials[trialIndex]);
          let at = audioContext.currentTime + 0.05;
          let durationMs = 0;
          events.forEach(event => {
            const osc = audioContext.createOscillator(), gain = audioContext.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(event.freq, at);
            gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(0.18, at + 0.012);
            gain.gain.setValueAtTime(0.18, at + Math.max(0.025, event.duration / 1000 - 0.02));
            gain.gain.exponentialRampToValueAtTime(0.0001, at + event.duration / 1000);
            osc.connect(gain); gain.connect(audioContext.destination);
            osc.start(at); osc.stop(at + event.duration / 1000 + 0.01); activeNodes.push(osc, gain);
            at += (event.duration + event.gap) / 1000;
            durationMs += event.duration + event.gap;
          });
          trialStartedAt = performance.now();
          const timer = setTimeout(() => {
            timers = timers.filter(id => id !== timer);
            playing = false; canAnswer = true; trialStartedAt = performance.now();
            stageHost.querySelectorAll('[data-answer]').forEach(b => { b.disabled = false; });
            const p = stageHost.querySelector('#eaSoundStatus'), play = stageHost.querySelector('#eaPlay');
            if (p) p.textContent = 'انتهى التشغيل. اختر إجابتك الآن.';
            if (play) { play.disabled = playCount >= 2; play.textContent = playCount >= 2 ? 'اكتمل الاستماع' : 'إعادة الاستماع'; }
          }, Math.max(150, durationMs + 80));
          timers.push(timer);
        } catch (error) {
          playing = false; canAnswer = false;
          if (status) status.textContent = error && error.message ? error.message : 'تعذّر تشغيل الصوت. تحقق من إعدادات المتصفح.';
          if (button) { button.disabled = false; button.textContent = 'إعادة المحاولة'; }
        }
      }
      function answer(value, chosen) {
        if (locked || !canAnswer) return;
        locked = true; canAnswer = false;
        const trial = currentStage.trials[trialIndex];
        const rt = Math.max(0, Math.round(performance.now() - trialStartedAt));
        const ok = value === trial.answer;
        responses.push({ ok, rt, kind: trial.kind, value, target: trial.answer, replays: Math.max(0, playCount - 1) });
        if (ok) points += 10;
        stageHost.querySelectorAll('[data-answer]').forEach(button => {
          button.disabled = true;
          if (button.dataset.answer === trial.answer) button.classList.add('is-correct');
          else if (button === chosen && !ok) button.classList.add('is-wrong');
        });
        const feedback = stageHost.querySelector('#eaFeedback');
        if (feedback) { feedback.className = `ea-feedback ${ok ? 'is-good' : 'is-bad'}`; feedback.textContent = `${ok ? 'إجابة صحيحة.' : 'ليست الإجابة الصحيحة.'} ${trial.explanation}`; }
        const timer = setTimeout(() => {
          timers = timers.filter(id => id !== timer);
          trialIndex++;
          if (trialIndex >= currentStage.trials.length) finishStage(); else renderTrial();
        }, 650);
        timers.push(timer);
      }
      function finishStage() {
        stopAudio();
        const summary = summarize(responses), passed = summary.accuracy >= PASS_MARK;
        const nextProgress = readProgress();
        nextProgress.unlockedStage = advanceProgress(nextProgress.unlockedStage, currentStage.id, summary.accuracy);
        nextProgress.results.push({ stage: currentStage.id, accuracy: summary.accuracy, meanRT: summary.meanRT,
          medianRT: summary.medianRT, correct: summary.correct, errors: summary.errors, passed, completedAt: new Date().toISOString() });
        nextProgress.results = nextProgress.results.slice(-MAX_RESULTS); persistProgress(nextProgress); progress = nextProgress;
        const next = passed ? (currentStage.id === 6 ? 'أكملت المراحل الست.' : `فُتحت المرحلة ${format(currentStage.id + 1)}.`) : 'لم تُفتح المرحلة التالية؛ تحتاج إلى دقة ٧٥٪ على الأقل. يمكنك إعادة المرحلة.';
        done({ pts: summary.correct * 10, metric: Math.round(summary.accuracy * 1000),
          detail: `أذن يقظة · ${currentStage.title}. الدقة ${Math.round(summary.accuracy * 100)}٪ (${summary.correct}/8)، ومتوسط زمن الإجابة بعد انتهاء الصوت ${summary.meanRT} مللي ثانية. عدد الأخطاء: ${summary.errors}. ${next} هذه نتائج أداء داخل اللعبة ولا تمثل اختبارًا سمعيًا طبيًا أو تشخيصًا.` });
      }
      renderSelector();
    };
  }

  const issues = validateStages(STAGES);
  if (issues.length) { console.error('أذن يقظة: فشل تدقيق بيانات المراحل', issues); return; }
  const game = { id: GAME_ID, cat: 'foc', col: ['#68D6C8', '#4B83D7'], name: TITLE, lab: 'Auditory Attention',
    why: 'تدريب تفاعلي على تمييز طبقة الصوت، ومقارنة النغمات، وتذكر الأنماط والإيقاعات، ورصد إشارة صوتية وسط مشتتات. النتائج تصف أداءك داخل اللعبة فقط ولا تمثل اختبارًا سمعيًا طبيًا.',
    how: ['استمع إلى النغمات المولّدة داخل المتصفح، ثم اختر الإجابة المناسبة.', 'تدرّب على الطبقة والاتجاه والتسلسل والإيقاع ثم رصد الصوت الهدف.', 'استخدم زر إعادة الاستماع مرة واحدة عند الحاجة. لا تستخدم اللعبة الميكروفون ولا تسجّل صوتك.'],
    norm: metric => Math.max(0, Math.min(1000, Math.round(Number(metric) || 0))), run: runEarAlert, nocd: 1 };
  if (!Array.isArray(G) || !GM || GM[GAME_ID]) { console.error('أذن يقظة: تعذرت إضافة اللعبة إلى سجل الألعاب.'); return; }
  G.push(game); GM[GAME_ID] = game;
  if (typeof I === 'object' && I) I[GAME_ID] = '👂';
  const previousGameRank = gameRank;
  gameRank = function (id) { if (id === GAME_ID) return [readProgress().unlockedStage, STAGES.length]; return previousGameRank.apply(this, arguments); };
  root.MINDLAB_EAR_ALERT_RUNTIME = { id: GAME_ID, title: TITLE, passMark: PASS_MARK, stages: STAGES,
    validate: () => validateStages(STAGES), buildEvents, summarize, advanceProgress, readProgress, persistProgress,
    totalTrials: STAGES.reduce((sum, stage) => sum + stage.trials.length, 0) };
  try { if (typeof renderAll === 'function') renderAll(); } catch (error) { console.error('تعذر تحديث واجهة أذن يقظة', error); }
})(window);
