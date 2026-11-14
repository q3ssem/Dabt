'use strict';
/* worlds.js — جزيرة الكنز (٦ فصول، ١٨ منطقة، ٣٦ آلية بيئية) ورحلة الكواكب (٩ محطات، ٢٧ مهمة). */
(function () {
  const E = DX.el, AR = DX.AR, $ = DX.$;
  const KIND = { planks: 'ترميم الجسر', mirrors: 'مرايا الضوء', seals: 'قفل الأختام', gears: 'آلية التروس', pour: 'أحواض الماء', stroke: 'جسر الكوكبة' };
  const BLOCK = { planks: 'gap', stroke: 'gap', pour: 'water', mirrors: 'door', gears: 'door', seals: 'door' };
  const BLOCKMSG = { gap: 'الهوّة تقطع الطريق. شغّل الآلية القريبة لتعبر.', water: 'الماء يغمر الممر. اضبط الأحواض لينخفض.', door: 'الباب مغلق. شغّل الآلية القريبة ليفتح.' };

  /* ---------- جزيرة الكنز ---------- */
  DX.chapters = [
    { name: 'شاطئ الرسالة', tool: ['حبل الملاحة', '➰'], intro: 'وصلت زجاجة قديمة إلى الشاطئ، وفيها خريطة ناقصة. يقول الملاح العجوز: «كل طريق في هذه الجزيرة أُغلق بآلية. من يُعِد تشغيلها يصل إلى قلبها».',
      zones: [['مرسى القارب', 'island-0.jpg', 'day', 0, ['planks', 'mirrors'], 'الرسالة: «اتبع الضوء حين يُغلق الحجر، واتبع الخشب حين ينقطع الطريق».'], ['مخيم الخريطة', 'island-1.jpg', 'day', 0, ['seals', 'planks'], 'على خريطة القرصان علامة حمراء عند قلب الجزيرة، وحولها ستة رموز.'], ['رصيف الشعاب', 'island-2.jpg', 'day', 0, ['mirrors', 'gears'], 'نقش على الرصيف: «الترس لا يدور وحده؛ جاره يدور عكسه».']] },
    { name: 'غابة الجسور', tool: ['عدسة العلامات', '🔍'], intro: 'خلف الرصيف غابة انقطعت جسورها منذ زمن. تقول حارسة الدرب: «أعيدي الجسور ولا تقطعي غصنًا. الغابة تتذكر من يحترمها».',
      zones: [['جسر الشلال', 'island-3.jpg', 'day', 0, ['planks', 'stroke'], 'علامة على الجذع: نجوم محفورة يصل بينها خط واحد لا ينقطع.'], ['فسحة العلامات', 'island-3.jpg', 'dusk', 1, ['seals', 'pour'], 'حجر العلامات: «الماء يُكال ولا يُخمَّن».'], ['شرفة الغابة', 'island-6.jpg', 'day', 0, ['gears', 'planks'], 'من الشرفة تظهر فتحة كهف تلمع فيه بلورات.']] },
    { name: 'كهف البلور', tool: ['مشعل البلور', '🔥'], intro: 'في الكهف بلورات تحفظ الضوء. يهمس الصدى: «أعد الضوء إلى البلورة الكبرى ينفتح الطريق إلى المخيم القديم».',
      zones: [['مدخل الكهف', 'island-4.jpg', 'day', 0, ['mirrors', 'gears'], 'بلورة مكسورة تعكس الضوء بزاوية قائمة تمامًا.'], ['قاعة الأصداء', 'island-4.jpg', 'cool', 1, ['mirrors', 'stroke'], 'على السقف كوكبة مرسومة بخط واحد.'], ['بحيرة البلور', 'island-4.jpg', 'warm', 0, ['pour', 'seals'], 'لوح حجري: «أربعة أختام وأربعة أدلة، والجواب واحد».']] },
    { name: 'مخيم الميزان', tool: ['مفتاح الصمامات', '🗝'], intro: 'ترك القراصنة مخيمًا فيه ميزان ذهبي وأحواض ماء. يقول أمين المخيم: «هنا قُسمت الغنائم بالعدل. من يزن بدقة يمرّ».',
      zones: [['خيمة الميزان', 'island-5.jpg', 'day', 0, ['pour', 'gears'], 'دفتر القسمة: كل حصة كيلت بوعاءين فقط.'], ['سوق المساء', 'island-1.jpg', 'dusk', 1, ['pour', 'planks'], 'لافتة: «الطريق إلى المرصد يمر فوق الماء».'], ['مرفأ الغروب', 'island-2.jpg', 'dusk', 1, ['seals', 'mirrors'], 'منارة صغيرة تشير نحو قمة المرصد.']] },
    { name: 'مرصد النجوم', tool: ['خريطة النجوم', '✨'], intro: 'على القمة مرصد يحمل خريطة الطريق الأخير. تقول الراصدة: «النجوم لا تتغير، لكن من يصل بينها بخط واحد قليل».',
      zones: [['درج المرصد', 'island-6.jpg', 'dusk', 0, ['stroke', 'mirrors'], 'المنظار موجّه نحو خليج الحفر في الجنوب.'], ['قبة الكوكبات', 'island-6.jpg', 'night', 1, ['stroke', 'gears'], 'على القبة: «خمس نجوم، عشرة خطوط، وبداية تعود إليها».'], ['شاطئ الليل', 'island-0.jpg', 'night', 1, ['pour', 'seals'], 'المد ينحسر ليلًا ويكشف طريقًا إلى موقع الحفر.']] },
    { name: 'قلب الكنز', tool: ['خاتم الجزيرة', '💍'], intro: 'اجتمعت الأدوات كلها. يقول الملاح: «الكنز ليس الذهب وحده؛ هو الطريق الذي أعدتَ فتحه لأهل الجزيرة».',
      zones: [['موقع الحفر', 'island-7.jpg', 'day', 0, ['seals', 'gears'], 'لوح مدفون عليه نجمة ثُمانية تشبه نقش باب القاعة.'], ['الدهليز المضيء', 'island-4.jpg', 'warm', 1, ['stroke', 'planks'], 'الدهليز يقود إلى قاعة يملؤها ضوء ذهبي.'], ['قاعة الكنز', 'island-8.jpg', 'day', 0, ['pour', 'stroke'], 'على الصندوق: «لمن أعاد الطرق، لا لمن كسر الأقفال».']] }];
  DX.storyZones = DX.chapters.flatMap((c, ch) => c.zones.map(([name, art, tint, flip, kinds, clue], z) => ({ id: `story_${ch}_${z}`, ch, z, name, art, tint, flip, kinds, clue, chapter: c.name, lv: Math.min(6, 1 + ch + (z === 2 ? 1 : 0)), tool: 't' + ch })));

  /* ---------- رحلة الكواكب ---------- */
  DX.planets = [
    { id: 'moon', name: 'القمر', g: .165, gnote: 'جاذبية القمر سدس جاذبية الأرض تقريبًا: قفزتك هنا أعلى وأبطأ.', tool: 'عدسة الرصد', fact: 'القمر لا يضيء بنفسه؛ نرى منه الجزء الذي تضيئه الشمس. يتغير شكله خلال نحو ٢٩ يومًا ونصف لأن موضعه حول الأرض يتغير، لا لأن ظل الأرض يغطيه.', tasks: [['moon', 1, 'الأطوار الأربعة'], ['moon', 2, 'الأطوار الثمانية'], ['moon', 3, 'من الموضع إلى الشكل']] },
    { id: 'mercury', name: 'عطارد', g: .38, gnote: 'جاذبية عطارد نحو ٣٨٪ من جاذبية الأرض.', tool: 'درع حراري', fact: 'عطارد أقرب الكواكب إلى الشمس، ويكاد يخلو من غلاف جوي يحفظ الحرارة: يبلغ نهاره نحو ٤٣٠°م وليله نحو −١٨٠°م. لذلك تسلك العربة الظلال.', tasks: [['gridpath', 1, 'طريق الظلال', { heat: true }], ['gridpath', 3, 'حافة النهار', { heat: true }], ['gridpath', 5, 'عبور الفوهة', { heat: true }]] },
    { id: 'venus', name: 'الزهرة', g: .9, gnote: 'جاذبية الزهرة قريبة من جاذبية الأرض (نحو ٩٠٪).', tool: 'مقياس الضغط', fact: 'سطح الزهرة أسخن سطوح الكواكب (نحو ٤٦٥°م) وضغطه نحو ٩٢ ضعف ضغط الأرض. لكن على ارتفاع ٥٠ إلى ٥٥ كم يقترب الضغط والحرارة مما نعرفه على الأرض، ولذلك نستكشفها بمنطاد. المنصة الجوية هنا متخيَّلة.', tasks: [['hover', 1, 'قياس أول'], ['hover', 3, 'رياح أقوى'], ['hover', 5, 'نطاق ضيق']] },
    { id: 'earth', name: 'الأرض', g: 1, gnote: 'جاذبية الأرض هي المرجع: ١.', tool: 'مرشح الماء', fact: 'ماء الأرض يدور بلا توقف: يتبخر من البحار وينتح من النبات، يتكاثف سحبًا، يهطل، ثم يجري ويتجمع من جديد. كمية الماء الكلية تبقى ثابتة تقريبًا.', tasks: [['order', 1, 'دورة الماء', { ring: true, items: () => DX.kidData.WATER[2], text: 'رتّب مراحل دورة الماء من التبخر حتى التجمع في البحر.' }], ['pour', 3, 'محطة التنقية'], ['order', 1, 'الدورة الكاملة', { ring: true, items: () => DX.kidData.WATER[3], text: 'رتّب المراحل الست لدورة الماء، ومنها النتح وتكوّن السحب.' }]] },
    { id: 'mars', name: 'المريخ', g: .38, gnote: 'جاذبية المريخ نحو ٣٨٪ من جاذبية الأرض.', tool: 'بوصلة الرمال', fact: 'لون المريخ الأحمر من أكاسيد الحديد في تربته. تحتاج إشارة الراديو بين ٣ و٢٢ دقيقة لتصل إليه من الأرض، فلا تُقاد العربات لحظيًا بل تُرسل لها الأوامر مسبقًا.', tasks: [['rover', 1, 'أول برنامج'], ['rover', 3, 'بين الصخور'], ['rover', 5, 'الوادي الطويل']] },
    { id: 'jupiter', name: 'المشتري', g: 1, gnote: 'نحن في محطة مدارية بجاذبية صناعية. عند قمم سحب المشتري تبلغ الجاذبية نحو ضعفين ونصف جاذبية الأرض.', tool: 'راصد العواصف', fact: 'المشتري أكبر الكواكب، وهو عملاق غازي بلا سطح صلب. أقماره آيو وأوروبا وغانيميد في رنين مداري: مقابل كل دورة لغانيميد يدور أوروبا مرتين وآيو أربع مرات.', tasks: [['orbit', 1, 'لقاء غانيميد'], ['orbit', 2, 'لقاء أوروبا'], ['orbit', 3, 'لقاء آيو']] },
    { id: 'saturn', name: 'زحل', g: 1, gnote: 'محطة مدارية بجاذبية صناعية. زحل عملاق غازي بلا سطح نقف عليه.', tool: 'ماسح الحلقات', fact: 'حلقات زحل ليست قرصًا صلبًا: هي قطع لا تُحصى من الجليد والصخر، من حبيبات صغيرة إلى كتل بحجم البيوت. القطع الأقرب إلى الكوكب تدور أسرع، وبين الحلقات فجوات مثل «فاصل كاسيني».', tasks: [['rings', 1, 'ثلاث حلقات'], ['rings', 3, 'أربع حلقات'], ['rings', 5, 'خمس حلقات']] },
    { id: 'uranus', name: 'أورانوس', g: 1, gnote: 'محطة مدارية بجاذبية صناعية. أورانوس عملاق جليدي.', tool: 'مصحح الاتجاه', fact: 'محور أورانوس مائل نحو ٩٨°، فيبدو كأنه يدور على جنبه. سنته ٨٤ سنة أرضية، ولذلك يبقى كل قطب في ضوء الشمس نحو ٤٢ سنة ثم في الظلام مدة مماثلة.', tasks: [['season', 1, 'نهار القطب'], ['season', 2, 'القطبان'], ['season', 3, 'اقرأ الموضع']] },
    { id: 'neptune', name: 'نبتون', g: 1, gnote: 'محطة مدارية بجاذبية صناعية. نبتون عملاق جليدي.', tool: 'مفتاح العودة', fact: 'نبتون أبعد الكواكب الثمانية عن الشمس، وفي غلافه أسرع رياح مرصودة في المجموعة الشمسية: تتجاوز ٢٠٠٠ كم في الساعة.', tasks: [['wind', 1, 'نسيم أول'], ['wind', 3, 'رياح مضاعفة'], ['wind', 5, 'العاصفة']] }];

  /* ---------- الحالة ---------- */
  const SV = kind => DX.world(kind === 'planets' ? 'discoveryJourney' : 'discoveryCampaign');
  const zonesOf = kind => kind === 'planets' ? DX.planets : DX.storyZones;
  const taskIds = (kind, z) => kind === 'planets' ? z.tasks.map((_, i) => `dx_p_${z.id}_${i}`) : z.kinds.map((_, i) => `dx_p_${z.id}_${i}`);
  DX.zoneDone = (kind, i) => taskIds(kind, zonesOf(kind)[i]).every(id => SV(kind).done[id]);
  DX.zoneOpen = (kind, i) => i === 0 || DX.zoneDone(kind, i - 1);
  DX.worldStats = kind => { const zs = zonesOf(kind), ids = zs.flatMap(z => taskIds(kind, z)); return { done: ids.filter(id => SV(kind).done[id]).length, total: ids.length, zones: zs.filter((_, i) => DX.zoneDone(kind, i)).length, secrets: Object.keys(SV(kind).secrets).length }; };

  /* ---------- بناء مشهد منطقة ---------- */
  function buildZone(kind, i) {
    const sv = SV(kind), z = zonesOf(kind)[i], ids = taskIds(kind, z), space = kind === 'planets', r = DX.rng(1000 + i * 77), j = n => Math.round((r() - .5) * n), ents = [], anim = {};
    const prog = id => sv.done[id] ? Math.min(1, anim[id] == null ? 1 : (performance.now() - anim[id]) / 1400) : 0;
    const mech = (n, x, bx, kindName, extra = {}) => ents.push({ type: 'mech', id: ids[n], idx: n, x, bx, kind: kindName, block: space ? 'door' : BLOCK[kindName], solved: () => !!sv.done[ids[n]], prog: () => prog(ids[n]), open: () => prog(ids[n]) > .85, prompt: sv.done[ids[n]] ? 'أُنجزت ✓' : 'شغّل', ...extra });
    if (!space) {
      const c = DX.chapters[z.ch], hasTool = () => !!sv.tools[z.tool];
      ents.push({ type: 'read', id: 'clue', x: 185 + j(30), got: () => !!sv.clues[z.id], prompt: 'اقرأ' });
      if (z.z === 0) { ents.push({ type: 'plat', x: 300, w: 50, h: 44 }); ents.push({ type: 'pick', id: 'tool', x: 300, y: 175, glyph: c.tool[1], col: '#ffd25a', got: hasTool }); }
      else ents.push({ type: 'plat', x: 290 + j(40), w: 46, h: 40 });
      mech(0, 440 + j(20), 540, z.kinds[0], { needs: z.z === 0 ? null : z.tool });
      ents.push({ type: 'plat', x: 690, w: 50, h: 44 }, { type: 'plat', x: 742, w: 50, h: 84 });
      ents.push({ type: 'pick', id: 'secret', x: 742, y: 215, glyph: '★', col: '#58d6d0', got: () => !!sv.secrets[z.id], hidden: () => !hasTool() });
      mech(1, 880 + j(16), 965, z.kinds[1], { needs: z.tool });
      ents.push({ type: 'exit', id: 'exit', x: 1120, ready: () => ids.every(id => sv.done[id]), prompt: i === 17 ? 'افتح الكنز' : 'تابع' });
    } else {
      ents.push({ type: 'read', id: 'clue', x: 190, got: () => !!sv.clues[z.id], prompt: 'اقرأ' });
      mech(0, 370, 455, 'console');
      ents.push({ type: 'plat', x: 585, w: 54, h: 46 });
      ents.push({ type: 'pick', id: 'secret', x: 600, y: z.g < .5 ? 250 : 180, glyph: '★', col: '#58d6d0', got: () => !!sv.secrets[z.id] });
      mech(1, 700, 790, 'console'); mech(2, 925, 1010, 'console');
      ents.push({ type: 'exit', id: 'exit', x: 1130, ready: () => ids.every(id => sv.done[id]), prompt: i === 8 ? 'أكمل البعثة' : 'انطلق' });
    }
    return { z, ids, anim, zone: { art: space ? `planets-${i}.jpg` : z.art, flip: !!z.flip, tint: z.tint, space, gravity: space ? z.g : 1, hero: space ? 'astro' : 'explorer', width: 1200, startX: Math.max(60, Math.min(1140, sv.position[z.id] || 70)), ents } };
  }

  /* ---------- الواجهة ---------- */
  let W = null;   // العالم المفتوح حاليًا
  DX.closeWorld = () => { if (!W) return; W.leave(); W.root.remove(); document.body.style.overflow = ''; W = null; DX.hush(); renderAll(); };
  DX.openWorld = async (kind, index) => {
    if (kind === 'island') kind = 'campaign'; if (W) DX.closeWorld();
    const space = kind === 'planets', sv = SV(kind), zs = zonesOf(kind), title = space ? 'رحلة الكواكب' : 'جزيرة الكنز';
    const root = E('section', { id: 'dxWorld', class: 'dxw' + (space ? ' space' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    root.innerHTML = `<header class="dxw-top"><button class="dxw-b" id="dxwBack" aria-label="العودة للتطبيق">✕</button><div class="dxw-title"><small id="dxwSub"></small><b id="dxwName"></b></div><button class="dxw-b" id="dxwBook" aria-label="دفتر الرحلة">📖</button><button class="dxw-b" id="dxwMap" aria-label="الخريطة">🗺</button></header>
      <div class="dxw-stage"><canvas id="dxwCanvas" aria-label="مشهد المغامرة. الأسهم للحركة، المسافة للقفز، Enter للتفاعل" tabindex="0"></canvas><div class="dxw-load" id="dxwLoad">جارٍ تحميل المشهد…</div>
        <div class="dxw-hud" id="dxwHud"></div><div class="dxw-say" id="dxwSay" role="status" aria-live="polite"></div>
        <div class="dxw-pad l"><button data-k="left" aria-label="يسار">◀</button><button data-k="right" aria-label="يمين">▶</button></div>
        <div class="dxw-pad r"><button data-k="act" class="act" aria-label="تفاعل">✋<small>تفاعل</small></button><button data-k="jump" aria-label="قفز">⤒<small>قفز</small></button></div></div>
      <div class="dxw-panel" id="dxwPanel" hidden></div>`;
    document.body.append(root); document.body.style.overflow = 'hidden';
    const q = s => root.querySelector(s), panel = q('#dxwPanel'), sayBox = q('#dxwSay'); let scene = null, cur = -1, built = null, sayT = 0, solving = null;
    const say = (t, hold = 5200) => { sayBox.textContent = t; sayBox.classList.add('on'); clearTimeout(sayT); sayT = setTimeout(() => sayBox.classList.remove('on'), hold); DX.speak(t); };
    const savePos = () => { if (scene && built) { sv.position[built.z.id] = Math.round(scene.hero.x); sv.last = cur; S.save(); } };
    const hud = () => {
      const st = DX.worldStats(kind), z = built.z, left = built.ids.filter(id => !sv.done[id]).length;
      const obj = left ? (space ? `أنجز ${AR(left)} من مهام المحطة` : (z.z === 0 && !sv.tools[z.tool] ? `اقفز على الصندوق والتقط «${DX.chapters[z.ch].tool[0]}»` : `شغّل ${AR(left)} من آليات المنطقة`)) : (space ? 'اتجه إلى الصاروخ' : 'اتجه إلى البوابة');
      q('#dxwHud').innerHTML = `<span class="obj">🎯 ${obj}</span><span>✓ ${AR(st.done)}/${AR(st.total)}</span><span>★ ${AR(st.secrets)}</span>${space ? '' : DX.chapters.map((c, k) => `<span class="tool ${sv.tools['t' + k] ? 'on' : ''}" title="${c.tool[0]}">${c.tool[1]}</span>`).join('')}`;
    };
    function closePanel() { if (solving) { solving.dispose(); solving = null; } panel.hidden = true; panel.innerHTML = ''; scene && scene.freeze(false); q('#dxwCanvas').focus({ preventScroll: true }); }
    function openPanel(titleText, body, wide) { if (solving) { solving.dispose(); solving = null; } scene && scene.freeze(true); panel.hidden = false; panel.innerHTML = ''; const card = E('div', { class: 'dxw-card' + (wide ? ' wide' : '') }, E('div', { class: 'dxw-cardhead' }, E('h2', { text: titleText }), E('button', { class: 'dxw-b', 'aria-label': 'إغلاق', text: '✕', onclick: closePanel })), body); panel.append(card); card.querySelector('button:not(.dxw-b), .dxw-b').focus({ preventScroll: true }); return card; }

    /* تشغيل آلية/مهمة داخل المغامرة */
    function solve(ent) {
      const z = built.z, n = ent.idx, id = ent.id;
      if (!space && ent.needs && !sv.tools[ent.needs]) return say(`هذه الآلية تحتاج «${DX.chapters[z.ch].tool[0]}». ${z.z === 0 ? 'عد إلى الصندوق في أول المنطقة واقفز لتلتقطها.' : 'تجدها في أول منطقة من هذا الفصل.'}`);
      if (space && n > 0 && !sv.done[built.ids[n - 1]]) return say('أنجز المهمة السابقة أولًا ليُفتح هذا الطرف.');
      const [type, lv, name, opts] = space ? z.tasks[n] : [z.kinds[n], z.lv, KIND[z.kinds[n]], {}];
      const body = E('div', { class: 'dxw-solve' }), mk = () => {
        const task = DX.M[type](lv, { ...(opts || {}) }, Math.random), text = (opts && opts.text) || task.text;
        body.innerHTML = ''; const inst = E('p', { class: 'dx-inst', text }), host = E('div', { class: 'dx-body' }), nextB = E('button', { class: 'dx-btn primary', hidden: true, text: 'عُد إلى المشهد', onclick: () => { closePanel(); } });
        body.append(inst, host, E('div', { class: 'dx-acts' }, nextB, E('button', { class: 'dx-btn', text: '💡 تلميح', onclick: () => solving.hint() }), E('button', { class: 'dx-btn', text: '↻ لغز آخر', onclick: mk }), E('button', { class: 'dx-btn', 'aria-label': 'استمع', text: '🔊', onclick: () => DX.speak(text, true) })));
        if (solving) solving.dispose();
        solving = DX.mountTask(host, task, { win: () => { const first = !sv.done[id]; sv.done[id] = true; if (first) built.anim[id] = performance.now(); S.save(); hud(); nextB.hidden = false; nextB.focus({ preventScroll: true }); nextB.onclick = () => { closePanel(); after(ent, first); }; }, fail: () => { nextB.hidden = false; nextB.textContent = 'حاول بلغز جديد'; nextB.onclick = mk; } }, space ? 'space' : 'ink');
      };
      openPanel(sv.done[id] ? name + ' · إعادة للتدريب' : name, body, true); mk();
    }
    function after(ent, first) {
      if (!first) return; sfx.win && sfx.win(); scene.burst(ent.bx + 20, 300, '#ffd25a', 24);
      const z = built.z, all = built.ids.every(id => sv.done[id]);
      say(space ? (all ? `اكتملت مهام ${z.name}! حصلت على «${z.tool}». الصاروخ جاهز.` : 'فُتح باب القسم التالي. تابع إلى الطرف التالي.') : (all ? 'انفتح الطريق كله! اتجه إلى البوابة في آخر المنطقة.' : { gap: 'امتد الجسر فوق الهوّة. يمكنك العبور الآن.', water: 'انخفض الماء وظهر الممر.', door: 'ارتفع الباب الحجري. الطريق مفتوح.' }[ent.block]));
    }
    const hooks = {
      say, blocked: bx => { const m = built.zone.ents.find(e => e.type === 'mech' && e.bx === bx); say(space ? 'الباب الهوائي مغلق. أنجز مهمة الطرف القريب ليُفتح.' : BLOCKMSG[m.block]); },
      touch(e) {
        const z = built.z; sfx.ok(2);
        if (e.id === 'tool') { sv.tools[z.tool] = true; S.save(); hud(); say(`حصلت على «${DX.chapters[z.ch].tool[0]}»! بها تعمل بقية آليات هذا الفصل، وتكشف الأسرار المخفية.`, 7000); }
        else { sv.secrets[z.id] = true; S.save(); hud(); say(space ? `وجدت ختم ${z.name}! ${z.gnote}` : `وجدت نجمة سرية في ${z.name}! (${AR(Object.keys(sv.secrets).length)} من ${AR(zs.length)})`, 6500); }
      },
      interact(e) {
        const z = built.z;
        if (e.type === 'read') { const txt = space ? z.fact : z.clue; sv.clues[z.id] = txt; S.save(); sfx.ok(1); openPanel(space ? 'دليل علمي: ' + z.name : 'دليل: ' + z.name, E('div', {}, E('p', { class: 'dxw-clue', text: txt }), space ? E('p', { class: 'dx-muted', text: z.gnote }) : null, E('button', { class: 'dx-btn primary', text: 'فهمت', onclick: closePanel }))); }
        else if (e.type === 'mech') solve(e);
        else if (e.type === 'exit') { if (!e.ready()) return say(space ? 'الصاروخ ينتظر: أكمل مهام المحطة الثلاث.' : 'البوابة مغلقة: شغّل آليتَي المنطقة أولًا.'); savePos(); sv.position[z.id] = 70; if (cur + 1 < zs.length) enter(cur + 1, true); else ending(); }
      }
    };
    async function enter(i, fresh) {
      if (scene) { savePos(); scene.stop(); } cur = i; built = buildZone(kind, i); sv.last = i; S.save();
      const z = built.z; q('#dxwSub').textContent = space ? `${title} · المحطة ${AR(i + 1)} من ٩` : `الفصل ${AR(z.ch + 1)}: ${z.chapter} · ${AR(z.z + 1)}/٣`; q('#dxwName').textContent = z.name;
      const load = q('#dxwLoad'); load.hidden = false; await DX.preload([built.zone.art, 'heroes.png']); if (!root.isConnected || cur !== i) return; load.hidden = true;
      scene = DX.Scene(q('#dxwCanvas'), built.zone, hooks); W.scene = scene; hud();
      if (space) say(`${z.name}. ${z.gnote}`, 7000); else if (z.z === 0 && !built.ids.some(id => sv.done[id])) openPanel(`الفصل ${AR(z.ch + 1)}: ${z.chapter}`, E('div', {}, E('p', { class: 'dxw-clue', text: DX.chapters[z.ch].intro }), E('p', { class: 'dx-muted', text: `أداة هذا الفصل: ${DX.chapters[z.ch].tool[1]} ${DX.chapters[z.ch].tool[0]}` }), E('button', { class: 'dx-btn primary', text: 'ابدأ الاستكشاف', onclick: closePanel }))); else say(`${z.name}. ${fresh ? 'منطقة جديدة: ابحث عن الدليل والآليات.' : 'تابع من حيث توقفت.'}`);
    }
    function ending() {
      const st = DX.worldStats(kind), allS = st.secrets >= zs.length; sfx.win && sfx.win();
      openPanel(space ? 'اكتملت البعثة!' : 'فُتح الكنز!', E('div', {}, E('div', { class: 'dxw-end', text: space ? '🚀' : '👑' }), E('p', { class: 'dxw-clue', text: space ? 'زرت القمر والكواكب الثمانية، وأنجزت ٢٧ مهمة علمية. عادت البعثة إلى الأرض بسلام.' : (allS ? 'أعدتَ فتح طرق الجزيرة كلها وجمعت نجومها السرية الثماني عشرة. نقش الملاح اسمك على باب القاعة: «حافظ الطرق».' : 'أعدتَ تشغيل ٣٦ آلية وفتحت الطريق إلى قلب الجزيرة. ما زالت نجوم سرية تنتظرك في مناطق سابقة: عُد إليها بأدواتك.') }),
        E('p', { class: 'dx-muted', text: `المهام ${AR(st.done)}/${AR(st.total)} · النجوم السرية ${AR(st.secrets)}/${AR(zs.length)}` }), E('div', { class: 'dx-acts' }, E('button', { class: 'dx-btn primary', text: 'الخريطة', onclick: map }), E('button', { class: 'dx-btn', text: 'العودة للتطبيق', onclick: DX.closeWorld }))));
      sv.finished = true; S.save();
    }
    function map() {
      const list = E('div', { class: 'dxw-map' });
      const btn = (z, i) => { const open = DX.zoneOpen(kind, i), done = DX.zoneDone(kind, i); return E('button', { class: 'dxw-zone' + (i === cur ? ' cur' : '') + (done ? ' done' : ''), disabled: !open, 'data-zone': i, onclick: () => { closePanel(); if (i !== cur) enter(i, true); } }, E('i', { style: `background-image:url('upgrade/art/${space ? 'planets-' + i + '.jpg' : z.art}')` }), E('b', { text: z.name }), E('small', { text: done ? '✓ مكتملة' + (sv.secrets[z.id] ? ' · ★' : '') : open ? 'متاحة' : '🔒 أكمل السابقة' })); };
      if (space) zs.forEach((z, i) => list.append(btn(z, i))); else DX.chapters.forEach((c, ch) => list.append(E('h3', { text: `الفصل ${AR(ch + 1)}: ${c.name} ${sv.tools['t' + ch] ? c.tool[1] : ''}` }), E('div', { class: 'dxw-row' }, zs.filter(z => z.ch === ch).map(z => btn(z, zs.indexOf(z))))));
      openPanel(space ? 'خريطة البعثة' : 'خريطة الجزيرة', E('div', {}, list, space ? null : E('button', { class: 'dx-btn', text: 'محطات الجزيرة الأصلية (الألغاز القديمة)', onclick: () => { DX.closeWorld(); PZ_TRIP = true; tab('puz'); } })), true);
    }
    function book() {
      const z = built.z, clues = Object.values(sv.clues), note = E('textarea', { class: 'dx-search', maxlength: 600, placeholder: 'اكتب ملاحظتك عن هذه المنطقة', 'aria-label': 'ملاحظتك' }); note.value = sv.notes[z.id] || ''; note.oninput = () => { sv.notes[z.id] = note.value; S.save(); };
      openPanel('دفتر الرحلة', E('div', {}, space ? E('p', { class: 'dx-muted', text: 'الأدوات: ' + (zs.filter((_, i) => DX.zoneDone(kind, i)).map(p => p.tool).join('، ') || 'لا شيء بعد') }) : E('div', { class: 'dxw-tools' }, DX.chapters.map((c, k) => E('span', { class: sv.tools['t' + k] ? 'on' : '', text: `${c.tool[1]} ${c.tool[0]}` }))),
        E('h3', { text: `الأدلة (${AR(clues.length)})` }), clues.length ? E('ul', { class: 'dx-clues' }, clues.map(c => E('li', { text: c }))) : E('p', { class: 'dx-muted', text: 'لم تقرأ أي دليل بعد. ابحث عن اللفافة في كل منطقة.' }), E('h3', { text: 'ملاحظاتي' }), note), true);
    }
    /* أزرار اللمس: كل زر يتتبع مؤشره مستقلًا، فيعمل الضغط المتزامن للحركة والقفز */
    root.querySelectorAll('.dxw-pad button').forEach(b => {
      const k = b.dataset.k, held = new Set();
      const down = e => { e.preventDefault(); held.add(e.pointerId); try { b.setPointerCapture(e.pointerId); } catch (x) { } b.classList.add('on'); if (!scene) return; if (k === 'act') scene.interact(); else scene.press(k, true); };
      const up = e => { held.delete(e.pointerId); if (held.size) return; b.classList.remove('on'); if (scene && k !== 'act') scene.press(k, false); };
      b.addEventListener('pointerdown', down); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => b.addEventListener(n, up)); b.addEventListener('contextmenu', e => e.preventDefault());
    });
    const KEY = { ArrowLeft: 'left', ArrowRight: 'right', a: 'left', d: 'right', A: 'left', D: 'right', ' ': 'jump', ArrowUp: 'jump', w: 'jump', W: 'jump' };
    const kd = e => { if (!panel.hidden) { if (e.key === 'Escape') closePanel(); return; } if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || !scene) return; if (KEY[e.key]) { e.preventDefault(); scene.press(KEY[e.key], true); } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') { e.preventDefault(); scene.interact(); } else if (e.key === 'Escape') DX.closeWorld(); };
    const ku = e => { if (KEY[e.key] && scene) scene.press(KEY[e.key], false); };
    const blur = () => { if (scene) ['left', 'right', 'jump'].forEach(k => scene.press(k, false)); }, vis = () => { if (document.hidden) { blur(); savePos(); } };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku); window.addEventListener('blur', blur); document.addEventListener('visibilitychange', vis); window.addEventListener('pagehide', savePos);
    q('#dxwBack').onclick = DX.closeWorld; q('#dxwMap').onclick = map; q('#dxwBook').onclick = book;
    W = { root, kind, scene: null, enter, map, book, solve, get built() { return built; }, get cur() { return cur; }, leave() { savePos(); if (solving) solving.dispose(); scene && scene.stop(); clearTimeout(sayT); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); window.removeEventListener('blur', blur); document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', savePos); } };
    DX.W = W;
    let start = index; if (start == null) { start = sv.last != null && DX.zoneOpen(kind, sv.last) ? sv.last : zs.findIndex((_, i) => !DX.zoneDone(kind, i)); if (start < 0) start = zs.length - 1; } if (!DX.zoneOpen(kind, start)) start = 0;
    await enter(start, false);
  };
})();
