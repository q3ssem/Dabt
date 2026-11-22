/* Jaziran notebook, version 1. Evidence is a separate story artifact, never a native campaign seal.
   A completed game is the prerequisite; selecting a reviewed fact is the repeatable notebook action.
   Phrasing is authored from جزران.pdf pp. 3, 5–7, 35, and is not a claim that old
   puzzle boards already show these sentences. */
(function () {
  'use strict';
  if (window.MindlabEvidence) return;
  const KEY = 'mindlab:journey:evidence-ledger:v1', VERSION = 1;
  const source = (id, origin, text, question, choices, answer) =>
    ({ id, origin, text, question, choices, answer });
  const files = [
    { id: 'measurement', required: 2, question: 'من أين نقيس وأين يتجه الطريق؟',
      inference: {
        question: 'ماذا نستنتج عندما تتوافق قرائن القياس والاتجاه؟',
        choices: ['الماء يقاس من ساعة القصر', 'حجر البداية مرجع القياس وتُراجع جهة الطريق', 'عدد نسخ السجل يكفي لاختيار الطريق'], answer: 1
      }, sources: [
        source('pz_xlock', 'stone', 'مرجع الأخدود النحاسي هو حجر البداية.',
          'ما الحجر الذي يطابق الأخدود النحاسي؟', ['حجر المرفأ','حجر البداية','حجر بوابة القصر'], 1),
        source('pz_zstars', 'sky', 'تُراجع جهة الطريق مع قرينة كوكبة المعبد.',
          'أي مقارنة تنتمي إلى ملف القياس والاتجاه؟', ['شهادة السجناء','طبقة الطوفان','اتجاه الملاحة وكوكبة المعبد'], 2),
        source('pz_zthrone', 'navigation', 'عرش المحيط من مصادر مسار الملاحة.',
          'ما سؤال الدفتر الذي يساهم فيه عرش المحيط؟', ['متى أغلق الحارس البوابة؟','من أين نقيس وأين يتجه الطريق؟','من بنى المدينة؟'], 1)
      ]
    },
    { id: 'testimony', required: 2, question: 'متى عبر القارب ومن رآه مباشرة؟',
      inference: {
        question: 'أي استنتاج يجمع الساعة وشاهد الضفة دون عدّ النسخ المنقولة أدلة مستقلة؟',
        choices: ['ثلاث نسخ من السجل تساوي ثلاثة شهود','القارب عبر بعد إغلاق البوابة','ساعة القصر متقدمة بخطوة مد وشاهد الضفة يشير إلى عبور سابق للإغلاق'], answer: 2
      }, sources: [
        source('pz_pclock', 'guard-record', 'ساعة القصر متقدمة بمقدار خطوة مد واحدة.',
          'ما الفرق بين ساعة القصر ومرجع المد في القصة؟', ['لا فرق','متقدمة بخطوة مد','متأخرة بيوم'], 1),
        source('pz_pjail', 'shore-witness', 'شهادة زهرة من الضفة تشير إلى العبور قبل الإغلاق.',
          'أي شهادة تقارنها بنسخة الحارس؟', ['شاهد رأى القارب من الضفة','نسخة أخرى من سجل الحارس نفسه','إعادة كتابة الصفحة المشطوبة'], 0),
        source('pz_pobs', 'guard-record', 'النسختان المنقولتان من صفحة واحدة ليستا شاهدين مستقلين.',
          'ما خطأ الاعتماد على نسختين من السجل نفسه؟', ['نسيت اسم الحارس','احتسبت الصفحة المنسوخة شاهدين مستقلين','استعملت قياس المد'], 1)
      ]
    },
    { id: 'traces', required: 2, question: 'أي خريطة تصف المدينة عند المد المقصود؟',
      inference: {
        question: 'ماذا ترجح قرائن طبقة الطوفان ووقت العبور؟',
        choices: ['خريطة الضفة «ب» تربط حجر البداية بقناة حفرت قبل الطوفان','خريطة القصر «أ» هي مرجع القياس','الخريطة «ج» توثق قناة حفرت قبل الطوفان'], answer: 0
      }, sources: [
        source('pz_alayer', 'strata', 'أثر القناة تحت طبقة الطوفان المتصلة، ما يدل على حفرها قبل الطوفان.',
          'ماذا يدل وجود أثر القناة تحت طبقة الطوفان المتصلة؟', ['حُفرت بعد الطوفان','حُفرت قبل الطوفان','لا يمكن تأريخها'], 1),
        source('pz_acity', 'city-survey', 'خريطة الضفة «ب» هي مرشح المدينة عند زمن المد المقصود.',
          'أي خريطة تحقق مرجع حجر البداية وزمن الحفر قبل الطوفان؟', ['خريطة الضفة «ب»','خريطة القصر «أ»','مسح المدينة «ج»'], 0),
        source('pz_arelic', 'archive', 'أرشيف الآثار الأولى يراجع تاريخ الأثر بالمقارنة مع طبقات الأرض.',
          'ما الذي يجب فحصه قبل نسبة الأثر إلى زمن محدد؟', ['عدد النسخ','اسم الحارس وحده','طبقة الطوفان وتاريخ الأثر'], 2)
      ]
    },
    { id: 'people', required: 5, optional: true, question: 'من يحمل ذاكرة المكان بعد الإخلاء؟',
      inference: {
        question: 'ما مكان فرع موطن الأثر الأول من خاتمة القصة؟',
        choices: ['لا تكتمل حملة البحار دونه','يُلغي قرار الإخلاء السابق','يضيف أسماء أهل الضفة إلى الأطلس بعد إتمام الإخلاء'], answer: 2
      }, sources: [
        source('pz_wbone', 'bones', 'وادي الهياكل صفحة من أرشيف الأثر الأول.',
          'ماذا تضيف زيارة وادي الهياكل إلى دفتر الرحلة؟', ['ملف أسماء أصحاب الأثر','نسخة جديدة من ساعة الحارس','قياس حجر المرفأ'], 0),
        source('pz_wspore', 'spores', 'حديقة الأبواغ إحدى صفحات الاستكشاف الاختياري.',
          'متى يكتمل هذا السجل الاختياري؟', ['قبل بدء الحملة','بعد استكشاف مصدره وحله','بمجرد رؤية اسمه'], 1),
        source('pz_wlog', 'ship', 'السفينة التي لم تُبحر مصدر مستقل في فرع الأثر الأول.',
          'ما الذي يثبت إنجاز هذا المصدر؟', ['أن يظهر في القائمة','أن ينسخ شاهد روايته','أن يسجل المحرك حل العالم'], 2),
        source('pz_wlake', 'lake', 'بحيرة السماء من مصادر الفرع الاختياري.',
          'هل يكفي اكتشاف البحيرة من دون حل لغزها؟', ['لا، يلزم إنجازها الفعلي','نعم، بمجرد ظهورها','نعم، إن كُتبت ملاحظة'], 0),
        source('pz_wfirst', 'first', 'موطن الأثر الأول يُكمل أسماء أصحاب الأثر.',
          'كيف يرتبط هذا الفرع بالمسار الأساسي؟', ['يؤجل الإخلاء','يضيف أسماء بعد الخاتمة دون تعطيلها','يستبدل ملف الشهادة'], 1)
      ]
    }
  ];
  const byFile = new Map(files.map(f => [f.id, f]));
  const bySource = new Map(files.flatMap(f => f.sources.map(s => [s.id, { file: f, source: s }])));
  const safeRead = () => {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || 'null');
      return o && o.version === VERSION && o.files && typeof o.files === 'object' &&
        !Array.isArray(o.files) ? o : { version: VERSION, files: {} };
    } catch (_) { return { version: VERSION, files: {} }; }
  };
  const save = data => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (_) { return false; }
  };
  const done = (sourceId, status) => {
    try {
      const response = status(sourceId);
      return !!response && response.done === true;
    } catch (_) { return false; }
  };
  const timeOk = time => Number.isSafeInteger(time) && time > 0;
  function getFile(id, status) {
    const f = byFile.get(id);
    if (!f || typeof status !== 'function') return null;
    const entry = safeRead().files[id] || {};
    const entries = entry.proofs && typeof entry.proofs === 'object' ? entry.proofs : {};
    const sources = f.sources.map(s => {
      const p = entries[s.id];
      const completed = done(s.id, status);
      const verified = completed && p && p.answer === s.answer && timeOk(p.at);
      return { id:s.id, text:s.text, question:s.question, choices:s.choices.slice(),
        answer:s.answer, origin:s.origin, completed, verified:!!verified,
        verifiedAt:verified ? p.at : null };
    });
    const origins = new Set(sources.filter(s => s.verified).map(s => s.origin));
    const ready = origins.size >= f.required;
    const seal = entry.seal;
    const sealed = !!(ready && seal && seal.answer === f.inference.answer && timeOk(seal.at));
    return { id:f.id, required:f.required, optional:!!f.optional, question:f.question,
      inference:{ question:f.inference.question, choices:f.inference.choices.slice() },
      sources, verifiedCount:sources.filter(s=>s.verified).length, independentCount:origins.size,
      ready, sealed, sealAt:sealed ? seal.at : null,
      missing:sources.filter(s=>!s.verified).map(s=>s.id) };
  }
  function verifySource(sourceId, answer, status) {
    const lookup = bySource.get(sourceId);
    if (!lookup || !Number.isInteger(answer)) return { ok:false, reason:'unknown' };
    if (!done(sourceId, status)) return { ok:false, reason:'not-completed' };
    if (answer !== lookup.source.answer) return { ok:false, reason:'wrong-answer' };
    const data = safeRead(), id=lookup.file.id;
    const entry = data.files[id] || { proofs:{} };
    if (!entry.proofs || typeof entry.proofs !== 'object') entry.proofs={};
    const previous = entry.proofs[sourceId];
    if (previous && previous.answer === answer && timeOk(previous.at)) return {ok:true, awarded:false, at:previous.at};
    entry.proofs[sourceId] = { answer, at:Date.now() };
    data.files[id] = entry;
    if (!save(data)) return {ok:false,reason:'storage'};
    return {ok:true,awarded:true,at:entry.proofs[sourceId].at};
  }
  function infer(fileId, answer, status) {
    const f=byFile.get(fileId), snapshot=getFile(fileId,status);
    if (!f || !Number.isInteger(answer) || !snapshot) return {ok:false,reason:'unknown'};
    if (!snapshot.ready) return {ok:false,reason:'not-independent'};
    if (answer !== f.inference.answer) return {ok:false,reason:'wrong-answer'};
    const data=safeRead(), entry=data.files[fileId] || {proofs:{}};
    if (snapshot.sealed) return {ok:true,awarded:false,at:snapshot.sealAt};
    entry.seal={answer,at:Date.now()};
    data.files[fileId]=entry;
    if (!save(data)) return {ok:false,reason:'storage'};
    return {ok:true,awarded:true,at:entry.seal.at};
  }
  function list() { return files.map(f=>({id:f.id,required:f.required,optional:!!f.optional})); }
  window.MindlabEvidence = { key:KEY, list, getFile, verifySource, infer };
})();
