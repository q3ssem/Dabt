# REGRESSION_RESULTS — نتائج الاختبارات لكل دفعة

الفرع: `dev/perf-cleanup` (لم يُدمج شيء في main). كل دفعة اختُبرت قبل الالتزام بها، ولم تُبنَ دفعة على أخرى فاشلة.
الأدوات: Node 22 (اختبارات المحركات والتكامل) + Playwright (Chromium headless، WebKit headless). **WebKit هنا محرك Safari في محاكٍ، وليس آيفون حقيقيًا.** لا يوجد جهاز آيفون في هذه البيئة.

| الدفعة | الالتزام | الاختبارات | النتيجة |
|---|---|---|---|
| A | 78530b1 | npm test؛ rush_board (main: 238 فشلًا ← 0)؛ controls_audit (Chromium+WebKit، الثيمان)؛ glyphs_audit؛ smoke؛ design10_play؛ fit_audit؛ expedition25_smoke | ناجحة |
| B | 0f7fe96 | npm test + 8 اختبارات node خارج npm test؛ smoke (Chromium+WebKit)؛ controls (Chromium+WebKit)؛ rush_board (+WebKit)؛ glyphs؛ fit_audit؛ design10_play؛ priority7_play 350/350؛ palace_statues 215/215؛ motion_play؛ expedition25_smoke؛ player_openings | ناجحة. fit_audit: 72 صفًّا مزدوجًا للأدوات — **نفس الـ72 بالضبط على main** (سابقة، عولجت في D) |
| C | dbc5083 | npm test + 8 node؛ smoke (Chromium+WebKit)؛ controls 176/176؛ priority7 350/350؛ palace 215/215؛ expedition25_smoke؛ atheran_campaign 122 فحصًا؛ مقارنة بكسل 48 شاشة × ثيمين؛ قياس المراقبات والخمول | ناجحة |
| D | 08599dd | npm test + 8 node؛ compact_hud 23/23؛ fit_audit Chromium 4 مقاسات **536/536**؛ fit_audit WebKit 390+320 **268/268**؛ smoke؛ controls؛ design10_play 852/852؛ palace 215/215 | ناجحة |
| E | e340ab6 | npm test + 8 node (watercolor.cjs موسَّع)؛ audio_audit 88 لغزًا بلا مخالفات؛ palace 215/215؛ smoke (Chromium+WebKit)؛ oldsave_compat 18/18؛ kids_smoke 210/210 | ناجحة |
| F | 9e86e88 | تحمّل 20 دقيقة (main مقابل الفرع)؛ leak_per_puzzle 88 لغزًا؛ palace_statues 215/215؛ npm test؛ kids_smoke WebKit 210/210؛ fit_audit WebKit 430×932 و844×390 ‏268/268؛ perf_bench 7 تشغيلات | ناجحة |

## اختبارات قديمة كانت تفشل على main نفسه (أُصلحت الاختبارات لا التطبيق)
| الاختبار | السبب على main | الإصلاح |
|---|---|---|
| smoke.py | طبقة القصة الافتتاحية ونافذة انتقال الرحلة تغطيان اللوح | إغلاقهما قبل اللعب (الدفعة A) |
| palace_statues، priority7_play، motion_play، motion_oldsave | الطبقة الافتتاحية تظهر بعد «ابدأ» | `dismiss_opening(page, 1500)` |
| motion_play، expedition25_smoke، fit_audit | زر `.ex10-launch-go` صار مخفيًا (الدخول من مركز الرحلة في 5.5.28) | `open_side_map` |
| atheran_campaign | زر `.ah-launch-go` مخفي للسبب نفسه | `ATHERAN_CAMPAIGN.open()` — نفس ما يستدعيه المركز؛ على main بعد الإصلاح: 122 فحصًا ناجحًا |
| priority7_play (pz_acity) | يتوقع صور الكائنات من `motion/art/` بينما صارت من `designs_art/priority7/` منذ design 01-10 | يقبل المسارين |
| journey-transitions.cjs | بيئة الاختبار تنقصها دوال | بدائل في الصندوق الرملي |
| motion_oldsave.py | محدد `.drd` لأبواب القصر لم يعد موجودًا في 5.5.28 | **لم يُعدَّل**؛ استُبدل بـ `oldsave_compat.py` الجديد |
| ui_reorg_accept.py | يفحص بطاقة رحلة جانبية نُقلت في 5.5.28 | **لم يُعدَّل ولم يُعتمد** |

## التوافق مع حفظ قديم (oldsave_compat.py)
حفظ حقيقي أنشأته نسخة main بدوالها (قصر المرايا، 7 محطات كنز، أثران، رحلة جانبية 6 محطات، 137 عملة) ثم حُمِّل كما هو في نسخة الفرع:
كل مفتاح وكل قيمة باقية حرفيًا، و`miran:v2` لم يفقد أي حقل، والتقدم المشتق متطابق: `{palaceProg:2, palaceDone:2, t7Done:7, atheranProg:2, atheranDone:2, coins:137, side:5}`. **18/18.**

## لم يُختبر
- Safari على آيفون حقيقي.
- استماع فعلي للأصوات.
- شبكة جوال حقيقية (القياس البطيء محاكاة CDP).
