/* 5.5.30 — Map-free chapter and station folders, 45 Non-Library Openings (21 Treasure + 24 Side-Journey),
   12 Transitions Viewer, and Priority 7 / Four Puzzles Board Art Accents.
   Presentation only: never alters save keys, puzzle rules, or secret-world unlock gating. */
(function () {
  'use strict';
  if (window.__MINDLAB_JOURNEY_HUB) return;
  window.__MINDLAB_JOURNEY_HUB = true;

  const TRANSITIONS_KEY = 'mindlab:transitions:seen:v1';

  const $ = (s, r = document) => r.querySelector(s);

  function bgPos(rect) {
    if (!rect) return '0% 0%';
    const dx = 1 - (rect.width || 0.5);
    const dy = 1 - (rect.height || 0.2);
    const px = dx > 0 ? Math.round((rect.x / dx) * 100) : 0;
    const py = dy > 0 ? Math.round((rect.y / dy) * 100) : 0;
    return `${px}% ${py}%`;
  }
  function bgSize(rect) {
    if (!rect) return '200% 600%';
    return `${Math.round(100 / (rect.width || 0.5))}% ${Math.round(100 / (rect.height || 0.2))}%`;
  }

  // Derive discovery from campaign progress, never from presentation/seen flags.
  function discoveredTransitions() {
    const data = window.__MINDLAB_JOURNEY_STORY;
    if (!data) return [];
    let completed = 0, atlasOpen = false, returned = false;
    try {
      const sea = window.T7 && T7.state();
      const stations = window.T7 && T7.data.stations;
      while (stations && completed < stations.length && sea.done[stations[completed].id]) completed++;
      const atlas = window.ATHERAN_CAMPAIGN && window.ATHERAN_CAMPAIGN.summary();
      atlasOpen = !!atlas?.open;
      // Modern finale ends after the playable rescue; the five optional secret worlds
      // are not a gate. Keep the legacy all-secrets path for old completed saves.
      returned = !!atlas && (
        (atlas.done === 21 && atlas.cleared === 5) ||
        (atlas.done === 21 && !!atlas.a?.done?.pz_aheart && !!window.MindlabRescue?.state()?.completed)
      );
    } catch (_) {}
    const thresholds = {departure: 0, coral_light: 3, mist_bells: 6, oasis_water: 9,
      ice_observatory: 12, wind_engine: 15, moon_vow: 18, eighth_route: 21, letter: 21, palace: 21};
    return data.transitions.filter(t => t.id === 'atheran' ? atlasOpen :
      t.id === 'return' ? returned : Object.hasOwn(thresholds, t.id) && completed >= thresholds[t.id]);
  }
  function transitionSeen() {
    try { const v = JSON.parse(localStorage.getItem(TRANSITIONS_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    catch (_) { return {}; }
  }
  function markTransition(id) {
    try { const s = transitionSeen(); s[id] = true; localStorage.setItem(TRANSITIONS_KEY, JSON.stringify(s)); } catch (_) {}
  }
  function showMilestone(ids, after) {
    const seen = transitionSeen();
    const fresh = discoveredTransitions().filter(t => ids.includes(t.id) && !seen[t.id]);
    if (fresh.length) return openTransitionsModal(0, after, fresh.map(t => t.id));
    if (after) after();
  }

  function openTransitionsModal(startIdx = 0, after, onlyIds) {
    const data = window.__MINDLAB_JOURNEY_STORY;
    const available = discoveredTransitions().filter(t => !onlyIds || onlyIds.includes(t.id));
    if (!data || !available.length) { if (after) after(); return; }
    const prev = document.activeElement;
    let idx = Math.max(0, Math.min(available.length - 1, Number(startIdx) || 0));
    const old = $('#mlj-tr-modal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'mlj-tr-modal';
    modal.className = 'mlj-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'مشاهد الرحلة المكتشفة');

    const atlasUrl = new URL(data.transitionsAtlas, document.baseURI).href;
    function close() {
      modal.remove();
      if (after) { after(); return; }
      if (prev && typeof prev.focus === 'function' && prev.isConnected) {
        try { prev.focus({ preventScroll: true }); } catch (_) {}
      }
    }
    function render() {
      const t = available[idx];
      markTransition(t.id);
      modal.dataset.transition = t.id;
      modal.innerHTML = `
        <div class="mlj-modal-card">
          <div class="mlj-head">
            <h2>${t.title}</h2>
            <span class="mlj-pill">${idx + 1} / ${available.length}</span>
          </div>
          <div class="mlj-tr-scene" role="img" aria-label="${t.title}" aria-busy="true" style="background-image:url('${atlasUrl}');background-size:${bgSize(t.rect)};background-position:${bgPos(t.rect)}"><span>جارٍ تحميل المشهد…</span></div>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${t.speaker}</span>
            <span>${t.dialogue}</span>
          </div>
          <div class="mlj-tr-nav">
            <button type="button" id="mlj-tr-prev" ${idx === 0 ? 'disabled' : ''}>السابق</button>
            <button type="button" id="mlj-tr-next" ${idx === available.length - 1 ? 'disabled' : ''}>التالي</button>
            <button type="button" class="mlj-tr-close" id="mlj-tr-close">${after ? 'متابعة الرحلة' : 'إغلاق'}</button>
          </div>
        </div>
      `;
      const preview = $('.mlj-tr-scene', modal), preload = new Image();
      preload.onload = () => { if (preview.isConnected) { preview.textContent = ''; preview.removeAttribute('aria-busy'); } };
      preload.onerror = () => { if (preview.isConnected) { preview.textContent = 'تعذّر تحميل الرسم. يمكنك متابعة النص.'; preview.removeAttribute('aria-busy'); } };
      preload.src = atlasUrl;
      const p = $('#mlj-tr-prev', modal), n = $('#mlj-tr-next', modal), c = $('#mlj-tr-close', modal);
      if (p) p.onclick = () => { if (idx > 0) { idx--; render(); } };
      if (n) n.onclick = () => { if (idx < available.length - 1) { idx++; render(); } };
      if (c) {
        c.onclick = () => {
          if (onlyIds && idx < available.length - 1) { idx++; render(); }
          else close();
        };
        c.focus({ preventScroll: true });
      }
    }
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const controls = [...modal.querySelectorAll('button:not([disabled])')];
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    document.body.append(modal);
    render();
  }

  function triggerChapter(chId) {
    const scenes={seven_seas:'departure',palace:'palace',atheran:'atheran'};
    const open=()=>openChapters(chId);
    if (scenes[chId]) showMilestone([scenes[chId]],open);
    else open();
  }

  // Jaziran narrative: personal draft notes. Never infer proof or award unlocks from typed text.
  const EVIDENCE_NOTES_KEY = 'mindlab:journey:evidence-notes:v1';
  const EVIDENCE_FILES = [
    {id:'measurement',name:'القياس والاتجاه',question:'من أين نقيس وأين يتجه الطريق؟',
      sources:[['pz_xlock','قفل الصندوق'],['pz_zstars','كوكبة المعبد'],['pz_zthrone','عرش المحيط']]},
    {id:'testimony',name:'الساعة والشهادة',question:'متى عبر القارب ومن رآه مباشرة؟',
      sources:[['pz_pclock','برج الساعات'],['pz_pjail','شهادات السجناء'],['pz_pobs','الخريطتان الشفافتان']]},
    {id:'traces',name:'العمر والأثر',question:'أي خريطة تصف المدينة وقت المد المقصود؟',
      sources:[['pz_alayer','طبقات الزمن'],['pz_acity','المدينة الحية'],['pz_arelic','أرشيف الآثار الأولى']]},
    {id:'people',name:'أسماء أصحاب الأثر',question:'من يحمل ذاكرة المكان بعد الإخلاء؟',
      sources:[['pz_wbone','وادي الهياكل'],['pz_wspore','حديقة الأبواغ'],['pz_wlog','السفينة التي لم تُبحر'],['pz_wlake','بحيرة السماء'],['pz_wfirst','موطن الأثر الأول']]}
  ];
  const EVIDENCE_SECRET_KEYS = {pz_wbone:'bones',pz_wspore:'spores',pz_wlog:'ship',pz_wlake:'lake',pz_wfirst:'first'};
  const evidenceFile = id => EVIDENCE_FILES.find(file => file.id === id);
  function evidenceDrafts() {
    try {
      const data = JSON.parse(localStorage.getItem(EVIDENCE_NOTES_KEY) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch (_) { return {}; }
  }
  function getEvidenceDraft(id) {
    if (!evidenceFile(id)) return '';
    const value = evidenceDrafts()[id];
    return typeof value === 'string' ? value.slice(0, 600) : '';
  }
  function saveEvidenceDraft(id, note) {
    if (!evidenceFile(id) || typeof note !== 'string') return false;
    try {
      const drafts = evidenceDrafts();
      const value = note.trim().slice(0, 600);
      if (value) drafts[id] = value; else delete drafts[id];
      localStorage.setItem(EVIDENCE_NOTES_KEY, JSON.stringify(drafts));
      return true;
    } catch (_) { return false; }
  }
  function evidenceSourceStatus(id) {
    // Engine-owned completion is the sole proof of *finishing a game*.
    // Finishing a game does not itself validate a historical claim or an inference.
    try {
      if (id.startsWith('pz_p')) {
        const done = typeof pState === 'function' && !!pState()?.done?.[id];
        return {id, done: !!done, origin:'قصر المرايا', state:done ? 'completed' : 'pending'};
      }
      if (id.startsWith('pz_a')) {
        const done = !!window.ATHERAN_CAMPAIGN?.summary()?.a?.done?.[id];
        return {id, done, origin:'أَثْران', state:done ? 'completed' : 'pending'};
      }
      if (Object.hasOwn(EVIDENCE_SECRET_KEYS, id)) {
        const key = EVIDENCE_SECRET_KEYS[id];
        const data = window.ATHERAN_CAMPAIGN?.summary()?.a;
        const done = !!data?.swd?.[key];
        const found = !!data?.sw?.[key];
        return {id, done, origin:'موطن الأثر الأول', state:done ? 'completed' : found ? 'pending' : 'undiscovered'};
      }
    } catch (_) {}
    // Puzzle-library wins have their own native counter. This is not a sea7_* station.
    // Only a real completed round counts; mere card visibility or level access never does.
    try {
      if (typeof pzState !== 'function') return {id,done:false,origin:'مكتبة الألغاز',state:'unlinked'};
      const won = Number(pzState()?.n?.[id]) > 0;
      return {id, done:!!won, origin:'مكتبة الألغاز',
        state:won ? 'completed' : 'pending'};
    } catch (_) {}
    return {id, done:false, origin:'مكتبة الألغاز', state:'unlinked'};
  }
  function evidenceVisibleFiles() {
    // The optional names/secret-world file appears only after native Atheran finale.
    let finished = false;
    try { finished = !!window.ATHERAN_CAMPAIGN?.summary()?.a?.done?.pz_aheart; } catch (_) {}
    return EVIDENCE_FILES.filter(file => file.id !== 'people' || finished);
  }
  function getEvidenceSnapshot(fileId) {
    const file = evidenceFile(fileId);
    if (!file) return null;
    const verified = window.MindlabEvidence?.getFile(fileId,evidenceSourceStatus);
    const sources = file.sources.map(([id,name]) => {
      const native = evidenceSourceStatus(id);
      const proof = verified?.sources.find(s => s.id === id);
      return {name, ...native, verified:!!proof?.verified,
        verifiedAt:proof?.verifiedAt || null, clue:proof?.text || '',
        challenge:proof ? {question:proof.question,choices:proof.choices} : null,
        state:proof?.verified ? 'verified' : native.state};
    });
    const nativeCompleted = sources.filter(source => source.done).length;
    return {id:file.id, name:file.name, sources, nativeCompleted,
      sourceCount:sources.length, readyToCompare:nativeCompleted >= 2,
      verifiedCount:verified?.verifiedCount || 0, independentCount:verified?.independentCount || 0,
      readyToInfer:!!verified?.ready, inferenceVerified:!!verified?.sealed,
      sealAt:verified?.sealAt || null, inference:verified?.inference || null,
      missing:verified?.missing || sources.map(s=>s.id)};
  }
  function openEvidenceBook() {
    const previous = document.activeElement;
    $('#mlj-evidence-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'mlj-evidence-modal';
    modal.className = 'mlj-modal mlj-evidence-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'دفتر أدلة الرحلة');
    modal.innerHTML =
      '<div class="mlj-modal-card mlj-evidence-card" dir="rtl">' +
      '<div class="mlj-head"><h2>دفتر الأدلة</h2><button type="button" id="mlj-evidence-close">إغلاق</button></div>' +
      '<p class="mlj-evidence-intro">دفتر القصة: الملاحظة مسودة شخصية، والقرينة تُثبت بعد حل اللغز وفحص بطاقة المراجعة. الختم هنا مستقل عن أختام الحملة.</p>' +
      '<div class="mlj-evidence-tabs" role="group" aria-label="ملفات الأدلة"></div>' +
      '<h3 class="mlj-evidence-title"></h3><p class="mlj-evidence-question"></p>' +
      '<p class="mlj-evidence-summary" aria-live="polite"></p>' +
      '<ul class="mlj-evidence-sources"></ul>' +
      '<div class="mlj-evidence-review" hidden aria-label="اختبار القرينة"></div>' +
      '<div class="mlj-evidence-inference" aria-label="استنتاج الملف"></div>' +
      '<label for="mlj-evidence-note">ملاحظتك عن هذا الملف</label>' +
      '<textarea id="mlj-evidence-note" maxlength="600" rows="4" placeholder="ماذا لاحظت؟ ومن أين حصلت على المعلومة؟"></textarea>' +
      '<div class="mlj-evidence-actions"><button type="button" id="mlj-evidence-save">حفظ الملاحظة</button>' +
      '<span role="status" aria-live="polite" id="mlj-evidence-status"></span></div>' +
      '<p class="mlj-evidence-caveat">هذه بطاقات مراجعة مؤلفة من وثيقة «جزران»؛ لا تعني أن نص القرينة معروض بالفعل على اللوحة القديمة. الختم لا يغيّر المكافآت أو شروط الفتح الحالية.</p></div>';
    const tabs = $('.mlj-evidence-tabs', modal);
    const note = $('#mlj-evidence-note', modal);
    const status = $('#mlj-evidence-status', modal);
    const closeBtn = $('#mlj-evidence-close', modal);
    const saveBtn = $('#mlj-evidence-save', modal);
    const visibleFiles = evidenceVisibleFiles();
    let selected = visibleFiles[0].id;
    for (const file of visibleFiles) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = file.name;
      btn.dataset.file = file.id;
      btn.onclick = () => { selected = file.id; render(); };
      tabs.append(btn);
    }
    function noteStatus(message) {
      status.textContent = message;
    }
    function returnToEvidenceSource(id) {
      // Use only the native UI/gates: no direct startRun, no force-complete, no save writes.
      try {
        if (id.startsWith('pz_a') || id.startsWith('pz_w')) {
          const stations = typeof ASTN !== 'undefined' ? ASTN : [];
          const index = stations.findIndex(st => st.id === id);
          if (index >= 0 && window.ATHERAN_CAMPAIGN?.canOpenStation(index)) {
            dismiss();
            window.ATHERAN_CAMPAIGN.openJourneyStation(index);
            return true;
          }
        }
        const tile = palaceTile(id);
        if (tile && typeof tile.click === 'function') {
          dismiss();
          tile.click();
          return true;
        }
      } catch (_) {}
      return false;
    }
    function sourceChallenge(src) {
      const target = $('.mlj-evidence-review', modal);
      target.hidden = false;
      target.replaceChildren();
      const header = document.createElement('strong');
      header.textContent = 'التحقق من قرينة: ' + src.name;
      const observation = document.createElement('p');
      observation.textContent = 'ملاحظة من وثيقة القصة: ' + src.clue;
      const intro = document.createElement('p');
      intro.textContent = 'بعد إنجاز اللغز الأصلي، راجع الملاحظة ثم أجب: ' + src.challenge.question;
      target.append(header, observation, intro);
      const actions = document.createElement('div');
      actions.className = 'mlj-evidence-options';
      src.challenge.choices.forEach((label, index) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.textContent = label;
        option.onclick = () => {
          const result = window.MindlabEvidence?.verifySource(src.id, index, evidenceSourceStatus);
          if (result?.ok) {
            render();
            noteStatus(result.awarded ? 'ثُبتت القرينة بمصدرها ووقت مراجعتها.' : 'هذه القرينة مثبتة من قبل.');
          } else noteStatus(result?.reason === 'wrong-answer'
            ? 'الإجابة لا تطابق قرينة القصة. راجع النص وحاول مرة أخرى.'
            : 'لا يمكن تثبيت القرينة دون إنجاز لغزها أو إتاحة التخزين.');
        };
        actions.append(option);
      });
      target.append(actions);
      target.scrollIntoView({block:'nearest'});
    }
    function renderInference(snapshot) {
      const area = $('.mlj-evidence-inference', modal);
      area.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = snapshot.inferenceVerified ? 'ختم الملف · ثبت مرة واحدة'
        : snapshot.readyToInfer ? 'اختبر الاستنتاج من مصادر مستقلة' : 'ما ينقص الاستنتاج';
      area.append(title);
      const message = document.createElement('p');
      if (snapshot.inferenceVerified) {
        message.textContent = 'تمت مراجعة الأدلة وربط الاستنتاج. وقت الختم: ' +
          new Date(snapshot.sealAt).toLocaleString('ar-SA') + '. لا تتكرر المكافأة عند الإعادة.';
      } else if (!snapshot.readyToInfer) {
        message.textContent = 'قرائن مثبتة: ' + snapshot.verifiedCount + '، مراجع مستقلة: ' +
          snapshot.independentCount + '. تحتاج إلى ' +
          (selected === 'people' ? 'العوالم الخمسة بعد الخاتمة' : 'مرجعين مستقلين على الأقل') +
          ' قبل ختم هذا الملف.';
        if (selected === 'testimony' && snapshot.verifiedCount >= 2 && snapshot.independentCount < 2)
          message.textContent += ' هاتان النسختان تعودان إلى صفحة واحدة. ابحث عن شاهد رأى القارب.';
      } else {
        message.textContent = snapshot.inference.question;
      }
      area.append(message);
      if (!snapshot.readyToInfer && snapshot.missing.length) {
        const missingBtn = document.createElement('button');
        missingBtn.type = 'button';
        missingBtn.className = 'mlj-evidence-missing';
        missingBtn.textContent = 'عرض الأدلة الناقصة';
        missingBtn.onclick = () => {
          const target = [...modal.querySelectorAll('.mlj-evidence-sources li')]
            .find(li => li.dataset.evidenceState !== 'verified');
          if (target) {
            target.scrollIntoView({block:'center'});
            target.querySelector('button')?.focus({preventScroll:true});
          }
        };
        area.append(missingBtn);
      }
      if (snapshot.readyToInfer && !snapshot.inferenceVerified) {
        const choices = document.createElement('div');
        choices.className = 'mlj-evidence-options';
        snapshot.inference.choices.forEach((label, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          button.onclick = () => {
            const result = window.MindlabEvidence?.infer(selected, index, evidenceSourceStatus);
            if (result?.ok) {
              render();
              noteStatus(result.awarded ? 'صدر ختم دفتر الأدلة مرة واحدة، دون تغيير جوائز الحملة.'
                : 'الختم مثبت سابقًا.');
            } else noteStatus(result?.reason === 'wrong-answer'
              ? 'الاستنتاج لا يجمع القرائن بشكل صحيح. راجع المصادر المستقلة.'
              : 'هناك أدلة ناقصة أو تخزين غير متاح؛ لا يمكن إصدار الختم.');
          };
          choices.append(button);
        });
        area.append(choices);
      }
    }
    function render() {
      const file = evidenceFile(selected);
      const snapshot = getEvidenceSnapshot(selected);
      $('.mlj-evidence-title', modal).textContent = file.name;
      $('.mlj-evidence-question', modal).textContent = file.question;
      $('.mlj-evidence-summary', modal).textContent =
        'منجز في محركات الألغاز: ' + snapshot.nativeCompleted + ' / ' + snapshot.sourceCount +
        ' · قرائن مثبتة: ' + snapshot.verifiedCount +
        ' · مراجع مستقلة: ' + snapshot.independentCount +
        (snapshot.inferenceVerified ? ' · ختم الدفتر مكتمل' : ' · الختم غير مكتمل');
      const list = $('.mlj-evidence-sources', modal);
      list.replaceChildren();
      for (const src of snapshot.sources) {
        const item = document.createElement('li');
        item.dataset.evidenceState = src.state;
        const heading = document.createElement('strong');
        heading.textContent = src.name;
        const source = document.createElement('small');
        source.textContent = src.verified ? 'قرينة مثبتة · ' + src.origin +
            ' · ' + new Date(src.verifiedAt).toLocaleString('ar-SA')
          : src.state === 'completed' ? 'أنجزت اللغز · افحص قرينته'
          : src.state === 'pending' ? 'لم يثبت إنجاز اللغز في سجل ' + src.origin
          : src.state === 'undiscovered' ? 'لم يُكتشف هذا الفرع بعد'
          : 'لا يتوفر سجل إنجاز موثوق لهذا المصدر';
        item.append(heading, source);
        if (src.verified && src.clue) {
          const quote = document.createElement('p');
          quote.className = 'mlj-evidence-quote';
          quote.textContent = src.clue;
          item.append(quote);
        }
        const actions = document.createElement('div');
        actions.className = 'mlj-evidence-source-actions';
        if (src.done && !src.verified && src.challenge) {
          const check = document.createElement('button');
          check.type = 'button';
          check.textContent = 'تحقق من القرينة';
          check.onclick = () => sourceChallenge(src);
          actions.append(check);
        }
        const revisit = document.createElement('button');
        revisit.type = 'button';
        revisit.textContent = 'ارجع للمشهد';
        revisit.onclick = () => {
          if (!returnToEvidenceSource(src.id))
            noteStatus('المحطة لم تُفتح بعد، أو لا يمكن الوصول إليها من المكتبة دون تجاوز شروطها.');
        };
        actions.append(revisit);
        item.append(actions);
        list.append(item);
      }
      tabs.querySelectorAll('button').forEach(btn =>
        btn.setAttribute('aria-pressed', String(btn.dataset.file === selected)));
      $('.mlj-evidence-review', modal).replaceChildren();
      $('.mlj-evidence-review', modal).hidden = true;
      renderInference(snapshot);
      note.value = getEvidenceDraft(selected);
      noteStatus('');
    }
    function dismiss() {
      modal.remove();
      const target=previous?.isConnected && previous.getClientRects().length
        ? previous : document.querySelector('#mlj-journey-entry');
      if(target?.isConnected && typeof target.focus==='function')
        target.focus({preventScroll:true});
    }
    closeBtn.onclick = dismiss;
    saveBtn.onclick = () => {
      status.textContent = saveEvidenceDraft(selected, note.value)
        ? 'حُفظت ملاحظتك على هذا الجهاز' : 'تعذّر الحفظ. تأكد من سماح المتصفح بالتخزين.';
    };
    modal.addEventListener('click', e => { if (e.target === modal) dismiss(); });
    modal.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
      if (e.key !== 'Tab') return;
      const controls = [...modal.querySelectorAll('button,textarea')].filter(el => !el.disabled);
      const first = controls[0], last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    document.body.append(modal);
    render();
    closeBtn.focus({ preventScroll: true });
  }


  // Jaziran chapter scenes are adapted from the source PDF and do not drive game progress.
  function jaziranSceneAvailable(id) {
    const scene = window.__MINDLAB_JAZIRAN_SCENES?.[id];
    if (!scene) return false;
    if (!scene.requiredPuzzle) return true;
    try { return !!(typeof pState === 'function' && pState()?.done?.[scene.requiredPuzzle]); }
    catch (_) { return false; }
  }
  function openJaziranScene(id) {
    if (!jaziranSceneAvailable(id)) return false;
    const scene = window.__MINDLAB_JAZIRAN_SCENES[id];
    const previous = document.activeElement;
    $('#mlj-jaziran-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'mlj-jaziran-modal';
    modal.className = 'mlj-modal mlj-jaziran-modal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-label',scene.title);
    modal.innerHTML =
      '<section class="mlj-modal-card mlj-jaziran-card" dir="rtl">' +
        '<header class="mlj-head"><h2 id="mlj-jaziran-title"></h2><button type="button" id="mlj-jaziran-close">إغلاق</button></header>' +
        '<p class="mlj-jaziran-location"></p>' +
        '<div class="mlj-jaziran-heroines" aria-label="ورد ورواء ونهى">' +
          '<figure><img src="motion/art10/char_ward.webp" alt=""><figcaption>ورد</figcaption></figure>' +
          '<figure><img src="motion/art10/char_rawaa.webp" alt=""><figcaption>رواء</figcaption></figure>' +
          '<figure><img src="motion/art10/char_nuha.webp" alt=""><figcaption>نهى</figcaption></figure>' +
        '</div>' +
        '<div class="mlj-jaziran-dialogue"></div>' +
        '<div class="mlj-jaziran-inspection"><button type="button" id="mlj-jaziran-inspect"></button>' +
        '<p id="mlj-jaziran-result" aria-live="polite"></p></div>' +
        '<div id="mlj-jaziran-choices" hidden><p id="mlj-jaziran-question"></p><div class="mlj-jaziran-options"></div></div>' +
        '<div id="mlj-jaziran-final" hidden><strong id="mlj-jaziran-reveal"></strong>' +
          '<p id="mlj-jaziran-end"></p><div class="mlj-jaziran-actions">' +
            '<button type="button" id="mlj-jaziran-save">أضف الملاحظة إلى دفتر الأدلة</button>' +
            '<button type="button" id="mlj-jaziran-book">افتح دفتر الأدلة</button>' +
          '</div></div>' +
        '<p id="mlj-jaziran-status" role="status" aria-live="polite"></p>' +
      '</section>';
    const title = $('#mlj-jaziran-title',modal);
    const inspection = $('#mlj-jaziran-inspect',modal);
    const result = $('#mlj-jaziran-result',modal);
    const options = $('#mlj-jaziran-choices',modal);
    const final = $('#mlj-jaziran-final',modal);
    const message = $('#mlj-jaziran-status',modal);
    title.textContent=scene.title;
    $('.mlj-jaziran-location',modal).textContent=scene.location;
    inspection.textContent=scene.inspectLabel;
    $('#mlj-jaziran-question',modal).textContent=scene.question;
    const dialogue=$('.mlj-jaziran-dialogue',modal);
    for (const [speaker,line] of scene.dialogue) {
      const row=document.createElement('p');
      const name=document.createElement('strong');
      name.textContent=speaker+' : ';
      row.append(name,document.createTextNode(line));
      dialogue.append(row);
    }
    function dismiss() {
      modal.remove();
      const target=previous?.isConnected && previous.getClientRects().length
        ? previous : document.querySelector('#mlj-journey-entry');
      if(target?.isConnected && typeof target.focus==='function')
        target.focus({preventScroll:true});
    }
    inspection.onclick=() => {
      result.textContent=scene.inspectResult;
      inspection.hidden=true;
      options.hidden=false;
      $('.mlj-jaziran-options button',modal)?.focus({preventScroll:true});
    };
    const optionBox=$('.mlj-jaziran-options',modal);
    scene.options.forEach((option,index) => {
      const button=document.createElement('button');
      button.type='button';
      button.textContent=option;
      button.onclick=() => {
        if (index!==scene.answer) {
          message.textContent='هذه المقارنة لا تفسر القرينة. راجع أثر الماء أو أصل السجل.';
          return;
        }
        message.textContent='وصلت إلى ملاحظة جديدة قابلة للمراجعة.';
        options.hidden=true;
        final.hidden=false;
        $('#mlj-jaziran-reveal',modal).textContent=scene.reveal;
        $('#mlj-jaziran-end',modal).textContent=scene.endText;
        $('#mlj-jaziran-save',modal).focus({preventScroll:true});
      };
      optionBox.append(button);
    });
    $('#mlj-jaziran-save',modal).onclick=() => {
      // Never overwrite existing player-authored notes; no verified evidence granted here.
      if (getEvidenceDraft(scene.observationFile).trim()) {
        message.textContent='توجد ملاحظة محفوظة في الملف. افتح الدفتر لمراجعتها دون استبدالها.';
        return;
      }
      message.textContent=saveEvidenceDraft(scene.observationFile,scene.note)
        ? 'حُفظت الملاحظة في ملفها على هذا الجهاز، دون ختم أو مكافأة.'
        : 'تعذر حفظ الملاحظة. يمكنك تدوينها يدويًا في دفتر الأدلة.';
    };
    $('#mlj-jaziran-book',modal).onclick=() => { dismiss(); openEvidenceBook(); };
    $('#mlj-jaziran-close',modal).onclick=dismiss;
    modal.addEventListener('click',event=>{if(event.target===modal)dismiss();});
    modal.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();dismiss();return;}
      if(event.key!=='Tab')return;
      const controls=[...modal.querySelectorAll('button')].filter(el=>!el.disabled&&!el.hidden&&
        !el.closest('[hidden]'));
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    document.body.append(modal);
    $('#mlj-jaziran-close',modal).focus({preventScroll:true});
    return true;
  }

  const artV3 = 'ui/designs_art/journey/v3/';
  let lastStationId = null;

  // The side journey (expedition10) is loaded on demand by ui/app.js; resolves at once when it is already here.
  const sideReady = () => (window.ML10 ? Promise.resolve() : window.mindlabSide ? window.mindlabSide.start() : Promise.resolve());

  function openStation(station) {
    const index = station.order - 1;
    if (station.chapter === 'palace') {
      startRun([station.id], null, { journeyStation: true });
    } else if (station.chapter === 'atheran') {
      window.ATHERAN_CAMPAIGN?.openJourneyStation(index);
    } else {
      const sea = station.chapter === 'seven_seas';
      if (!sea && !window.ML10) { sideReady().then(() => { if (window.ML10) openStation(station); }); return; }
      if (!(sea ? window.T7?.unlocked(index) : window.ML10?.unlocked(index))) return;
      showStationOpening({
        title: station.title,
        badge: station.region,
        heroName: station.heroName,
        hero: station.hero,
        dialogue: station.openingTextAr,
        sprite: artV3 + 'heroes/' + station.hero + '.webp',
        storyLines: sea ? (window.TreasureData?.stations[index]?.dialog || []) :
          [['الراوي',window.ML10.stages[index]?.story || '']],
        rule: sea ? window.TreasureData?.stations[index]?.goal : window.ML10.stages[index]?.objective
      }, () => sea ? T7.open(index, true) : ML10.openFromJourney(index));
    }
  }

  /* Map-free, four-column station folders. Native engines, locks and save keys remain authoritative. */
  function mountStationFolders() {
    const data=window.__MINDLAB_JOURNEY_MAP;
    const v=$('#v-puz');
    const entry=v&&$('.v5-hubcard',v);
    if(!data || !entry || !$('.v5-hublib',v) || v.classList.contains('ah-view') || $('#mlj-unified-hub',v)) return;
    const launch=document.createElement('button');
    launch.id='mlj-journey-entry';launch.type='button';launch.className='mlj-journey-entry';
    launch.setAttribute('aria-expanded','false');
    launch.innerHTML='<strong>رحلة الكنز</strong><span class="mlj-entry-action">افتح الفصول والمحطات</span>';
    const panel=document.createElement('section');panel.id='mlj-unified-hub';
    panel.className='mlj-atlas-dialog ml-folder-journey';
    panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.setAttribute('aria-label','فصول ومحطات رحلة الكنز');
    panel.innerHTML='<div class="ml-folder-dialog"><header class="ml-folder-dialog-head">'+
      '<h2>رحلة الكنز</h2><button type="button" id="mlj-close-atlas">إغلاق</button></header>'+
      '<div class="ml-folder-chapter-content"></div>'+
      '<footer class="ml-folder-footer"><button type="button" id="mlj-open-trans">مشاهد الرحلة</button>'+
      '<details class="mlj-v3-extras"><summary>دفتر الرحلة والأدلة</summary><div></div></details></footer></div>';
    const content=$('.ml-folder-chapter-content',panel);
    const extras=$('.mlj-v3-extras',panel);
    const chapters=[
      ['seven_seas','البحار السبعة','chapters/ch1_seven_seas.webp'],
      ['palace','قصر المرايا','chapters/ch2_mirror_palace.webp'],
      ['atheran','أرض أَثْرَان','chapters/ch3_atheran.webp'],
      ['side','رحلة جانبية','markers/marker_side.webp']
    ];
    const chapterAr=key=>chapters.find(ch=>ch[0]===key)?.[1]||key;
    const chapterStory={
      seven_seas:'تبدأ رحلة رواء ونهى وورد بصندوق الجد في المرسى. عبر البحار السبعة تجمع البطلات الأدلة والأختام، وكل محطة تفتح الطريق إلى التالية.',
      palace:'تقود أدلة البحار إلى قصر المرايا. داخل القصر تُقارن البطلات الشهادات والتوقيتات وتفكن الآليات، قبل أن يصبح طريق أَثْرَان متاحًا.',
      atheran:'بعد إكمال قصر المرايا، تنطلق البعثة إلى أرض أَثْرَان. توثّق البطلات آثار الرحلات وتستعدن الطريق الآمن، ثم تصل القصة إلى القرار الأخير.',
      side:'رحلة أسرار أَثْرَان مغامرة اختيارية مستقلة من أربع وعشرين محطة. أحداثها وألغازها لا تختصر الفصل الرسمي ولا تفتح أسراره.'
    };
    const num=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
    let chapter=null;
    const done=st=>{
      try{
        if(st.chapter==='seven_seas')return !!window.T7?.state()?.done?.[st.id];
        if(st.chapter==='side')return !!window.ML10?.state()?.done?.[st.id];
        if(st.chapter==='atheran')return !!window.ATHERAN_CAMPAIGN?.summary()?.a?.done?.[st.id];
        return !!(typeof pState==='function'&&pState().done?.[st.id]) ||
          Number(typeof pzState==='function'?pzState().n?.[st.id]||0:0)>0;
      }catch(_){return false;}
    };
    const unlocked=st=>{
      if(done(st))return true;
      const i=st.order-1;
      const stations=data.stations.filter(x=>x.chapter===st.chapter).sort((a,b)=>a.order-b.order);
      const before=stations.find(x=>x.order===i);
      if(before&&!done(before))return false;
      if(st.chapter==='seven_seas')return !!window.T7?.unlocked(i);
      if(st.chapter==='side')return !!window.ML10?.unlocked(i);
      if(st.chapter==='atheran')return !!window.ATHERAN_CAMPAIGN?.canOpenStation(i);
      return true;
    };
    const pill=(txt,cls='')=>{const x=document.createElement('span');x.className=cls;x.textContent=txt;return x;};
    function close(restore=true){
      panel.hidden=true;launch.setAttribute('aria-expanded','false');
      if(restore&&launch.isConnected)launch.focus({preventScroll:true});
    }
    function populateExtras(){
      const div=$('div',extras);div.replaceChildren();
      const actions=[{label:'ملفات الأدلة والملاحظات',open:openEvidenceBook},
        {label:'قصة الصندوق',open:()=>openJaziranScene('prologue')}];
      if(jaziranSceneAvailable('palace_clock'))actions.push({label:'ساعة القصر',open:()=>openJaziranScene('palace_clock')});
      actions.push(...(window.ATHERAN_CAMPAIGN?.journeyActions()||[]));
      const sea=window.T7?.state();
      if(sea){
        actions.push({label:'كنوز البحار',open:()=>T7.openJournal('treasures')});
        for(const secret of T7.data.secrets.filter(q=>sea.bonus?.[q.id]))
          actions.push({label:secret.collectible,open:()=>T7.openSecret(secret.ch,true)});
        if(sea.done?.sea7_20)actions.push({label:'رسالة الجد',open:()=>T7.openFinaleFromJourney()});
      }
      actions.forEach(a=>{const b=document.createElement('button');b.type='button';b.textContent=a.label;
        b.onclick=()=>{close(false);a.open();};div.append(b);});
    }
    function select(which){
      chapter=which;content.replaceChildren();
      if(!which){
        content.append(pill('اختر فصلًا لعرض المحطات. يتم فتح المحطة التالية بعد إكمال السابقة.','ml-folder-journey-note'));
        const grid=document.createElement('div');grid.className='ml-folder-journey-categories';
        const sideGrid=document.createElement('div');sideGrid.className='ml-folder-journey-categories ml-folder-side-categories';
        chapters.forEach(([id,name,icon])=>{
          const rows=data.stations.filter(st=>st.chapter===id);
          const completed=rows.filter(done).length;
          const b=document.createElement('button');b.type='button';b.className='ml-folder-chapter';
          b.dataset.chapter=id;
          const art=document.createElement('span');art.className='ml-folder-chapter-art';
          const img=document.createElement('img');img.src=artV3+icon;img.alt='';img.loading='lazy';art.append(img);
          b.append(art,pill(name,'ml-folder-chapter-name'),
            pill(num(completed)+' / '+num(rows.length)+' محطة','ml-folder-chapter-progress'));
          b.onclick=()=>select(id);(id==='side'?sideGrid:grid).append(b);
        });
        content.append(pill('الفصل الرسمي · ابدأ بالبحار السبعة ثم قصر المرايا فأرض أَثْرَان','ml-folder-group-title'),grid,
          pill('الرحلة الجانبية · مغامرة مستقلة لا تغيّر تقدم الفصل الرسمي','ml-folder-group-title ml-folder-side-title'),sideGrid);
        return;
      }
      const header=document.createElement('div');header.className='ml-folder-bar';
      const back=document.createElement('button');back.type='button';back.className='ml-folder-back';
      back.textContent='رجوع إلى الفصول';back.onclick=()=>select(null);
      header.append(back,pill(chapterAr(which),'ml-folder-chapter-heading'));
      const story=document.createElement('section');story.className='ml-folder-story-intro';
      story.append(pill('من حكاية الرحلة','ml-folder-story-kicker'),pill(chapterStory[which],'ml-folder-story-text'));
      content.append(header,story);
      const grid=document.createElement('div');grid.className='ml-folder-stations';
      const rows=data.stations.filter(st=>st.chapter===which).sort((a,b)=>a.order-b.order);
      rows.forEach(st=>{
        const ready=unlocked(st),complete=done(st);
        const button=document.createElement('button');button.type='button';
        button.className='ml-folder-station'+(complete?' completed':ready?' available':' locked');
        button.dataset.stationId=st.id;button.dataset.status=complete?'done':ready?'current':'locked';
        const label=num(st.order)+'. '+st.title+' · '+(complete?'مكتملة':ready?'متاحة':'مقفلة');
        button.setAttribute('aria-label',label);
        button.append(pill(num(st.order),'ml-folder-station-number'),
                      pill(st.title,'ml-folder-station-name'),
                      pill(complete?'✓':ready?'ابدأ':'مقفل','ml-folder-station-state'));
        if(!ready)button.disabled=true;
        else button.onclick=()=>{
          lastStationId=st.id;
          close(false);
          const milestone={seven_seas:'departure',palace:'palace',atheran:'atheran'}[st.chapter];
          const open=()=>openStation(st);
          if(milestone)showMilestone([milestone],open);
          else open();
        };
        grid.append(button);
      });
      content.append(grid);
      if(which==='side'&&!window.ML10&&window.mindlabSide?.start){
        const note=pill('يُجهَّز الفصل الجانبي…','ml-folder-journey-note');content.append(note);
        window.mindlabSide.start().then(()=>{if(chapter==='side'&&!panel.hidden)select('side');})
          .catch(()=>{note.textContent='تعذر تحميل الفصل؛ تحقق من الاتصال وأعد المحاولة.';});
      }
    }
    launch.onclick=()=>{panel.hidden=false;
      launch.setAttribute('aria-expanded','true');populateExtras();select(chapter);$('#mlj-close-atlas',panel).focus({preventScroll:true});};
    $('#mlj-close-atlas',panel).onclick=()=>close();
    $('#mlj-open-trans',panel).onclick=()=>{close(false);openTransitionsModal();};
    panel.addEventListener('click',e=>{if(e.target===panel)close();});
    panel.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key!=='Tab')return;
      const buttons=[...panel.querySelectorAll('button, summary')].filter(x=>x.getClientRects().length&&!x.disabled);
      if(!buttons.length)return;
      if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1).focus();}
      else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}
    });
    v.classList.add('mlj-single-entry');
    ($('.t7-top',v)||entry).after(launch);launch.after(panel);
    panel.dataset.ready='true';
    // Direct entry from existing story links may request a specific chapter.
    panel.openChapter=which=>{if(panel.hidden)launch.click();
      select(which||data.stations.find(st=>st.id===lastStationId)?.chapter||null);};
  }

  function openChapters(chapter) {
    mountStationFolders();
    if (!$('#mlj-journey-entry') && window.T7) { T7.hub(); mountStationFolders(); }
    const panel=$('#mlj-unified-hub');
    if(panel?.openChapter)panel.openChapter(chapter || null);
    else $('#mlj-journey-entry')?.click();
  }

  /* ---- 45 Non-Library Openings (21 Treasure Island + 24 Side Journey) ---- */
  function showStationOpening(info, start) {
    const prev = document.activeElement;
    const old = $('#fit-opening-overlay');
    if (old) old.remove();


    const ov = document.createElement('div');
    ov.id = 'fit-opening-overlay';
    ov.className = 'fit-opening-overlay puzzle-opening mlj-station-rules' + (info.sprite ? ' mlj-v3-opening-overlay' : '');
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', info.title);
    ov.innerHTML = `
      <div class="fit-opening-card">
        <button type="button" class="fit-opening-dismiss" id="fit-op-start" aria-label="إغلاق القواعد">×</button>
        <div class="fit-opening-scene fit-opening-scene--plain">
          <span class="fit-opening-badge">${info.badge}</span>
          ${info.sprite ? `<div class="mlj-station-crew" aria-label="رواء ونهى وورد">
            ${[['rawaa','رواء'],['nuha','نهى'],['ward','ورد']].map(([id,name])=>`<figure class="mlj-station-crew-person ${id===info.hero?'speaking':''}"><img src="${artV3}heroes/${id}.webp" alt="${name}"><figcaption>${name}</figcaption></figure>`).join('')}
          </div>` : window.fitOpenings.crewMarkup(info.hero, info.expr)}
        </div>
        <div class="fit-opening-body">
          <h3 class="fit-opening-title">${info.title}</h3>
          <div class="fit-opening-bubble">
            <span class="fit-opening-speaker">${info.heroName}</span>
            <span>${info.dialogue}</span>
          </div>
          <details class="mlj-station-full-story"><summary>اقرأ مشهد القصة كاملًا</summary><div class="mlj-station-story-lines"></div></details>
          <p class="mlj-station-rule"></p>
          <div class="fit-opening-actions">
            <button type="button" class="fit-op-skip" id="fit-op-skip">رجوع</button>
          </div>
        </div>
      </div>
    `;
    // The map-free shortcut must not discard the complete authored scene.
    const storyBox=$('.mlj-station-full-story',ov);
    const storyHost=$('.mlj-station-story-lines',storyBox);
    const storyLines=(Array.isArray(info.storyLines)?info.storyLines:[]).filter(line=>Array.isArray(line)&&line[1]);
    storyBox.hidden=!storyLines.length;
    storyLines.forEach(([who,dialogue])=>{
      const line=document.createElement('p');
      if(who&&who!=='الراوي'){
        const speaker=document.createElement('strong');speaker.textContent=who+': ';line.append(speaker);
      }
      line.append(document.createTextNode(dialogue));
      storyHost.append(line);
    });

    const rule = $('.mlj-station-rule', ov);
    rule.textContent = info.rule || '';
    rule.hidden = !info.rule;

    const dismiss = (event, play) => {
      event.preventDefault();
      event.stopPropagation();
      ov.remove();
      if (play) {
        start();
        return;
      }
      if (prev && typeof prev.focus === 'function' && prev.isConnected) {
        try { prev.focus({ preventScroll: true }); } catch (_) {}
      }
    };
    ov.addEventListener('pointerdown', e => { if (e.target === ov) e.stopPropagation(); });
    ov.addEventListener('click', e => { if (e.target === ov) dismiss(e, true); });
    const sBtn = $('#fit-op-start', ov), back = $('#fit-op-skip', ov);
    puzzleAction(sBtn, 'start', 'ابدأ المحطة');
    puzzleAction(back, 'back');
    ov.addEventListener('keydown', e => {
      if (e.key === 'Escape') dismiss(e, true);
      if (e.key === 'Tab' && ((e.shiftKey && document.activeElement === sBtn) || (!e.shiftKey && document.activeElement === back))) {
        e.preventDefault();
        (e.shiftKey ? back : sBtn).focus();
      }
    });
    document.body.append(ov);
    sBtn.onclick = e => dismiss(e, true);
    back.onclick = e => dismiss(e, false);
    sBtn.focus({ preventScroll: true });
  }

  function beforeStation(id, start, rule) {
    const story = window.__MINDLAB_JOURNEY_STORY;
    const sea = story?.treasureStations.find(st => st.saveKey === id);
    const expedition = story?.expeditionStations.find(st => st.stageId === id);
    const station = sea || expedition;
    if (!station) return start();

    showStationOpening({
      title: `${sea ? sea.storyTitle : expedition.title} · ${station.location}`,
      badge: sea ? `البحر ${sea.sea} · ${station.heroName}` : station.heroName,
      hero: station.hero,
      heroName: station.heroName,
      expr: station.expr,
      dialogue: station.dialogue,
      rule
    }, start);
  }

  function applyBoardArt() {
    const pzb = $('#stage #pzb');
    if (!pzb) return;
    let id = '';
    try { id = typeof curGame === 'function' ? ((curGame() || {}).id || '') : ''; } catch (_) {}
    if (!id) return;
    const ba = window.__MINDLAB_BOARD_ART;
    if (ba && ba.fourPuzzles && ba.fourPuzzles[id]) {
      pzb.dataset.boardArt = id;
    } else {
      delete pzb.dataset.boardArt;
    }

  }

  const originalClose = closePlay;
  closePlay = function () {
    const stationId = typeof RUN !== 'undefined' && RUN?.journeyStation ? curGame()?.id : null;
    originalClose.apply(this, arguments);
    if (!stationId || typeof curTab === 'undefined' || curTab !== 'puz') return;
    if (stationId === 'pz_aheart' && window.ATHERAN_CAMPAIGN?.finishJourneyScene()) return;
    openChapters();
  };
  if ($('#quit')?.onclick === originalClose) $('#quit').onclick = closePlay;

  function watchAll() {
    window.addEventListener('mindlab:journey-progress', e => {
      if (e.detail?.chapter === 'seven_seas') {
        const at = e.detail.station;
        const scenes = {2: ['coral_light'], 5: ['mist_bells'], 8: ['oasis_water'],
          11: ['ice_observatory'], 14: ['wind_engine'], 17: ['moon_vow'], 20: ['eighth_route', 'letter']};
        if (scenes[at]) showMilestone(scenes[at]);
      } else if (e.detail?.chapter === 'atheran') showMilestone(['return']);
    });
    const vp = $('#v-puz');
    if (vp) {
      let raf = 0;
      const onPuz = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          mountStationFolders();
        });
      };
      new MutationObserver(records => {
        for (const record of records) {
          for (const element of record.removedNodes) {
            if (element.id === 'mlj-unified-hub') element.dispatchEvent(new Event('mlj:remove'));
          }
        }
        onPuz();
      }).observe(vp, { childList: true, subtree: true });
      onPuz();
    }
    const st = $('#stage');
    if (st) {
      new MutationObserver(applyBoardArt).observe(st, { childList: true });
      applyBoardArt();
    }
  }

  window.mindlabJourneyHub = { openChapter: triggerChapter, openTransitions: openTransitionsModal, discoveredTransitions, beforeStation, mountUnifiedHub:mountStationFolders, applyBoardArt, openChapters, returnToMap:openChapters, openEvidenceBook, getEvidenceDraft, saveEvidenceDraft, getEvidenceSnapshot, evidenceVisibleFiles, jaziranSceneAvailable, openJaziranScene };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchAll);
  else watchAll();
})();
