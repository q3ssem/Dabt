# MINDLAB_ARCHITECTURE_AUDIT — خريطة الاعتماديات والمراقبات (فرع dev/perf-cleanup)

> الأرقام هنا مقاسة بـ Chromium (Playwright 1.x، headless، 390×844) على خادم محلي. لا شيء هنا تقديري.

## 1. طبقات التحميل (بعد الدفعة B)

التطبيق ملف `index.html` فيه المحرك المضمَّن (1.27 MB نص، بصمته محفوظة ولم تُمس في أي دفعة)، ثم طبقات عرض تلتف حول دوال المحرك.
بعد الدفعة B صار التحميل على مرحلتين: **إقلاع** (ما يلزم للشاشة الأولى) و**مؤجَّل** (طبقات اللعب، يُحمَّل بعد أول رسم أو عند فتح لغز).

| ترتيب | الملف | الحجم KB | التحميل |
|---|---|---|---|
| 0 | index.html (المحرك المضمَّن) | 1265 | إقلاع |
| 1 | qa/assessment-engine/Dabt_Assessment_Engine_v1.3.js | 12.3 | إقلاع |
| 2 | audio/mindlab-audio.js | 9.0 | إقلاع |
| 3 | upgrade/river-difficulty.js | 1.5 | إقلاع |
| 4 | upgrade/core.js | 16.6 | إقلاع |
| 5 | upgrade/mech.js | 60.8 | إقلاع |
| 6 | upgrade/games.js | 28.4 | إقلاع |
| 7 | upgrade/app.js | 10.3 | إقلاع |
| 8 | treasure/data.js | 46.0 | إقلاع |
| 9 | treasure/logic.js | 19.4 | إقلاع |
| 10 | treasure/boards.js | 77.1 | إقلاع |
| 11 | treasure/app.js | 38.0 | إقلاع |
| 12 | legacy/art.js | 20.6 | إقلاع |
| 13 | legacy/deep-manifest.js | 4.9 | إقلاع |
| 14 | legacy/deep.js | 10.9 | إقلاع |
| 15 | watercolor/manifest.js | 9.1 | إقلاع |
| 16 | watercolor/sprite-boxes.js | 3.4 | إقلاع |
| 17 | watercolor/app.js | 10.0 | إقلاع |
| 18 | watercolor/castle-ink.js | 20.9 | إقلاع |
| 19 | ui/rules.js | 23.0 | إقلاع |
| 20 | ui/app.js | 26.0 | إقلاع |
| 21 | assessment/common.js | 1.6 | إقلاع |
| 22 | assessment/sync.js | 0.8 | إقلاع |
| 23 | watercolor/atheran-ink.js | 20.2 | إقلاع |
| 24 | pwa.js | 1.8 | إقلاع |
| 25 | atheran/runtime/assets-runtime.js | 212.6 | مؤجَّل (scripts) |
| 26 | atheran/campaign/story.js | 11.7 | مؤجَّل (scripts) |
| 27 | atheran/campaign/campaign.js | 10.8 | مؤجَّل (scripts) |
| 28 | atheran/bindings/bindings.js | 20.8 | مؤجَّل (scripts) |
| 29 | motion/kit.js | 6.7 | مؤجَّل (scripts) |
| 30 | motion/atheran-motion.js | 38.6 | مؤجَّل (scripts) |
| 31 | motion/palace-motion.js | 32.1 | مؤجَّل (scripts) |
| 32 | motion/lab10.js | 46.5 | مؤجَّل (scripts) |
| 33 | motion/pirate-routes.js | 2.8 | مؤجَّل (scripts) |
| 34 | ui/fit.js | 19.0 | مؤجَّل (scripts) |
| 35 | ui/openings-data.js | 21.2 | مؤجَّل (scripts) |
| 36 | ui/openings.js | 6.4 | مؤجَّل (scripts) |
| 37 | ui/journey-story-data.js | 29.2 | مؤجَّل (scripts) |
| 38 | ui/board-art-data.js | 16.9 | مؤجَّل (scripts) |
| 39 | ui/designs_art/journey/v3/stations.js | 44.9 | مؤجَّل (scripts) |
| 40 | ui/journey-hub.js | 41.0 | مؤجَّل (scripts) |
| 41 | ui/puzzle-design.js | 14.2 | مؤجَّل (layers) |
| 42 | ui/adventure-design.js | 5.0 | مؤجَّل (layers) |
| 43 | atheran/campaign/campaign.css | 7.1 | مؤجَّل (styles) |
| 44 | atheran/bindings/bindings.css | 5.7 | مؤجَّل (styles) |
| 45 | motion/motion.css | 26.6 | مؤجَّل (styles) |
| 46 | motion/lab10.css | 20.9 | مؤجَّل (styles) |
| 47 | ui/fit.css | 23.2 | مؤجَّل (styles) |
| 48 | ui/openings.css | 3.9 | مؤجَّل (styles) |
| 49 | ui/journey-hub.css | 18.5 | مؤجَّل (styles) |
| 50 | motion/correction-art.css | 11.1 | مؤجَّل (styles) |
| 51 | motion/expedition-art.css | 130.1 | مؤجَّل (styles) |

CSS boot: fonts/fonts.css, upgrade/style.css, treasure/style.css, legacy/style.css, legacy/deep.css, watercolor/style.css, ui/style.css

ملاحظة: `qa/assessment-engine/…js` يُحمَّل في الإنتاج رغم أن مساره تحت `qa/` — هو محرك التقييم الفعلي (12 KB) وليس ملف اختبار؛ أُبقي وسُمح له في sw.js.

## 2. سلاسل الالتفاف على دوال المحرك (wrapper chains)

كل طبقة تحفظ الدالة الأصلية وتستبدلها (`const x0 = x; x = function(){…}`). عدد الطبقات الملتفّة حول كل دالة:

| الدالة | عدد الأغلفة | الملفات |
|---|---|---|
| header | 5 | upgrade/app.js → legacy/art.js → legacy/deep.js → watercolor/app.js → ui/app.js |
| closePlay | 5 | upgrade, legacy/art, legacy/deep, watercolor, ui |
| showIntro | 4 | المحرك (مرتان) + upgrade + legacy/art |
| renderMe | 3 | المحرك + upgrade/app.js + ui/app.js |
| countdown / renderPuz | 3 لكل منهما | legacy/art, deep, watercolor |

الحكم: البنية تعمل ومختبرة، وتفكيكها يعني إعادة كتابة طبقات العرض — وهذا خارج الأمر («لا تعِد بناء…»). لم يُغيَّر ترتيبها. التوصية لاحقًا: سجلّ hooks واحد بدل الأغلفة المتداخلة، بنفس الأسلوب الذي طُبِّق على getContext (أدناه).

## 3. ترقيع `HTMLCanvasElement.prototype.getContext`

| قبل | بعد (الدفعة C) |
|---|---|
| ترقيعان متداخلان: legacy/deep.js ثم watercolor/app.js، كل استدعاء getContext يمر بغلافين | ترقيع واحد في legacy/art.js (`LA.canvasHook`) وسجل hooks؛ deep.js وwatercolor يسجّلان دوالهما فيه بنفس الترتيب السابق |

السلوك نفسه (deep ثم watercolor)، والأخطاء داخل أي hook لا تكسر getContext. الاختبارات: deep.art.cjs، watercolor.cjs، legacy.art.cjs ناجحة.

## 4. MutationObservers — قياس فعلي وإصلاح السبب

القياس: غلاف حول `MutationObserver` يسجّل لكل مراقب (حسب ملف الإنشاء) عدد الاستدعاءات والزمن، خلال جلسة ثابتة 18.7 ث (12 لغزًا مع نقرات + تنقّل بين التبويبات).

| | قبل | بعد |
|---|---|---|
| مراقبات منشأة | 25 | 25 |
| استدعاءات المراقبات | 4259 | 676 |
| زمن داخل callbacks | 441 ms | 81 ms |
| assets-runtime.js:102 | 1264 استدعاء / 321 ms | ≈0 |
| bindings.js:248 | 1264 / 10 ms | 70 / 1.2 ms |
| ui/adventure-design.js:75 | 1253 / 2.9 ms | ≈0 |
| المحرك المضمَّن (deEmo) | 196 / 103 ms | 195 / 76 ms (لم يُمس — داخل السكربت المحمي) |

**السبب الجذري (اكتشاف جديد، موجود أيضًا على main):** حلقة دائمة بمعدل كل إطار (~60/ث) حتى على الشاشة الرئيسية:
- `atheran/runtime/assets-runtime.js` يراقب `class/style` على `#play`، وفي كل استدعاء ينفّذ `classList.remove('ah-stage-art')` حتى لو لم يكن الصنف موجودًا. حسب مواصفة DOM هذا يعيد كتابة السمة ويولّد سجل تغيير جديد → يعيد جدولة requestAnimationFrame → وهكذا للأبد.
- `atheran/bindings/bindings.js` يعيد `classList.add('ah-piece', …)` على كل قطعة في كل رسم، ومراقبه يراقب `class` → نفس الحلقة داخل محطات أثران (720 تغييرًا/ث).

الإصلاح: كتابة التغيير الحقيقي فقط (`contains` قبل add/remove، مقارنة القيمة قبل setProperty/setAttribute). لم يُحذف أي مراقب ولم يُدمج — السبب كان الكتابة لا عدد المراقبات.

أثره على الخيط الرئيسي في الخمول (Performance.getMetrics، متوسط 5 ث):

| الحالة | قبل (ms عمل/ث) | بعد |
|---|---|---|
| الشاشة الرئيسية | 26.4 | 1.5 |
| محطة أثران مفتوحة (pz_aarch) | 41.6 | 0.8 |
| pz_rush مفتوح | 25.2 | 0.7 |

التحقق: لقطات main مقابل الفرع لست محطات (صنف ah-stage-art، عدد القطع، الحالات) متطابقة، وتغيّر حالة القطعة بعد التفاعل ما زال يُرسم (pz_arelic: selected).

## 5. مستمعو الأحداث
- التسرب الذي ذكرته في CLAUDE_INITIAL_FINDINGS (+1 مستمع لكل فتح لغز) **تبيّن أنه أثر القياس نفسه**: مقابض Playwright التي يحتفظ بها DevTools. حلقة الفتح/الإغلاق داخل الصفحة (40 مرة) ثابتة: عقد 1065، مستمعون 160، heap ≈3.56 MB. لا تسرب في التطبيق.
- **تسرب حقيقي وجده اختبار التحمل (20 دقيقة، موجود على main):** لوحات تماثيل القصر (`motion/palace-motion.js`) تضيف مستمع `resize` على window ولا تزيله إلا عند تغيّر حجم لاحق، فتبقى كل لوحة مغلقة حيّة (pz_door ‏+232 عقدة و+18 مستمعًا لكل فتح، pz_pliar ‏+267/+22). الإصلاح: تسجيل الإزالة في قائمة تنظيف الجولة (`cleanup`). بعده لا يحتفظ أي لغز من 88 بأكثر من 12 عقدة لكل فتح (`leak_per_puzzle.py`).
- الدفعة B أضافت 18 مستمع onload/onerror على وسوم السكربت المؤجلة؛ صارت تُفرَّغ بعد التحميل (106 مستمعًا عند الإقلاع مقابل 110 على main).

## 6. AudioContext
- كان هناك سياق صوتي ثانٍ مستقل في `watercolor/app.js` (صوت دوران التماثيل). عولج في الدفعة E (انظر AUDIO_QA_REPORT.md).
