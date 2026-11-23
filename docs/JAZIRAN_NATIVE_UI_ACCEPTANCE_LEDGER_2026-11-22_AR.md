# سجل القبول الحديث — 86 لغزًا بمدخلات واجهة اللاعب

**تحديث:** 22 نوفمبر 2026. المرجع الحالي عند بدء الورشة: `main` = `d27d189`، وطلب القبول قيد المراجعة [PR #15](https://github.com/q3ssem/Dabt/pull/15). **هذا المستند يحدّث سجلًا أقدم كان يثبت 15/86 فقط عند رأس فرع سابق؛ لا يجوز إبقاء الرقم التاريخي بوصفه الحالة النهائية لجميع الاختبارات اللاحقة.**

## مستوى الإثبات وحدوده

- جُمعت أدلة الاختبارات الفعلية التي نجحت على فرع المراجعة ذي الرأس `5daa2a09` في [PR #13](https://github.com/q3ssem/Dabt/pull/13)، حيث نجحت **19/19 مجموعة GitHub Actions**. تتبع الاختبارات حلول الألغاز بإدخال اللاعب إلى الأزرار والسحب، لا باستدعاء دوال الفوز.
- **86/86 معرفًا فعالًا لديه دليل فوز آلي في متصفح محاكى**، بربط كل معرّف باختبار مُسمّى وتحقّق من انتهاء الاختبار بنجاح. هذا يعادل **تغطية أسماء الألغاز**، ولا يعني إثبات جميع حالات التصميم العشوائية، ولا كل وضعيات الهاتف، ولا كل مستويات جميع الألغاز.
- الاستثناء الذي تم كشفه: اختبار `pz_door` السابق استخدم `__test.pz.set()` في حالة كل مستوى؛ أُزيل التجاوز في PR #15، ونجح اختباره على [تشغيل 45050387532](https://github.com/q3ssem/Dabt/actions/runs/45050387532): **280/280 فحصًا لكل من Chromium وWebKit**، مع حل اللوحات بالسحب والتدوير وثبوت الحفظ في الجلسة العادية.
- اختبار أبواب القصر صار يختبر كل مستوى عبر مدخلات اللاعب؛ لا تستخدم تقارير `witness` التي تستدعي دوال الحل الداخلية باعتبارها قبولًا فرديًا.
- *مهم*: أغلب روابط الأدلة تعود إلى فرع PR #13 المختبر وليس إلى نسخة منشورة بعد PR #15؛ ولذلك يتطلب قبول المرشح النهائي نجاح اختبارات الانحدار على آخر Commit وألا يكون قد تغير محرك اللعب، فضلًا عن اختبار Safari على iPhone فعلي.

## سجل المعرّفات والدليل المباشر

### التدريب — 19 لغزًا

| معرّف اللغز | اختبار مدخلات اللاعب الناجح |
|---|---|
| `pz_rid` | [Actions #45046123255](https://github.com/q3ssem/Dabt/actions/runs/45046123255) |
| `pz_river` | [Actions #45046123141](https://github.com/q3ssem/Dabt/actions/runs/45046123141) |
| `pz_rush` | [Actions #45046123038](https://github.com/q3ssem/Dabt/actions/runs/45046123038) |
| `pz_lock` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_pipe` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_grid` | [Actions #45046123255](https://github.com/q3ssem/Dabt/actions/runs/45046123255) |
| `pz_scale` | [Actions #45046123038](https://github.com/q3ssem/Dabt/actions/runs/45046123038) |
| `pz_laser` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_soko` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_sudo` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_flow` | [Actions #45046123038](https://github.com/q3ssem/Dabt/actions/runs/45046123038) |
| `pz_tan` | [Actions #45046123038](https://github.com/q3ssem/Dabt/actions/runs/45046123038) |
| `pz_tent` | [Actions #45046123255](https://github.com/q3ssem/Dabt/actions/runs/45046123255) |
| `pz_door` | [Actions #45050387532](https://github.com/q3ssem/Dabt/actions/runs/45050387532) |
| `pz_lights` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_untangle` | [Actions #45046123038](https://github.com/q3ssem/Dabt/actions/runs/45046123038) |
| `pz_stroke` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_binary` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |
| `pz_ice` | [Actions #45046122982](https://github.com/q3ssem/Dabt/actions/runs/45046122982) |

### البحار السبعة — 22 لغزًا

| معرّف اللغز | اختبار مدخلات اللاعب الناجح |
|---|---|
| `pz_tpath` | [Actions #45046123187](https://github.com/q3ssem/Dabt/actions/runs/45046123187) |
| `pz_xreef` | [Actions #45046123187](https://github.com/q3ssem/Dabt/actions/runs/45046123187) |
| `pz_xbridge` | [Actions #45046123187](https://github.com/q3ssem/Dabt/actions/runs/45046123187) |
| `pz_xcave` | [Actions #45046123187](https://github.com/q3ssem/Dabt/actions/runs/45046123187) |
| `pz_xloot` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_tmap` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_tdig` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_xlock` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_ybell` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_ymap` | [Actions #45046123187](https://github.com/q3ssem/Dabt/actions/runs/45046123187) |
| `pz_yhold` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_ytide` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_ydoor` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_zcomp` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_zroute` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_zcur` | [Actions #45046123055](https://github.com/q3ssem/Dabt/actions/runs/45046123055) |
| `pz_zcode` | [Actions #45046123055](https://github.com/q3ssem/Dabt/actions/runs/45046123055) |
| `pz_zharp` | [Actions #45046123055](https://github.com/q3ssem/Dabt/actions/runs/45046123055) |
| `pz_zshadow` | [Actions #45046123055](https://github.com/q3ssem/Dabt/actions/runs/45046123055) |
| `pz_znim` | [Actions #45046123112](https://github.com/q3ssem/Dabt/actions/runs/45046123112) |
| `pz_zstars` | [Actions #45046123055](https://github.com/q3ssem/Dabt/actions/runs/45046123055) |
| `pz_zthrone` | [Actions #45046123055](https://github.com/q3ssem/Dabt/actions/runs/45046123055) |

### قصر المرايا — 19 لغزًا

| معرّف اللغز | اختبار مدخلات اللاعب الناجح |
|---|---|
| `pz_plock` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_pliar` | [Actions #45046123452](https://github.com/q3ssem/Dabt/actions/runs/45046123452) |
| `pz_pclock` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_pboss1` | [Actions #45046122996](https://github.com/q3ssem/Dabt/actions/runs/45046122996) |
| `pz_plib` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_pmirror` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_pgarden` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_pqueen` | [Actions #45046123048](https://github.com/q3ssem/Dabt/actions/runs/45046123048) |
| `pz_parm` | [Actions #45046122996](https://github.com/q3ssem/Dabt/actions/runs/45046122996) |
| `pz_pjail` | [Actions #45046122996](https://github.com/q3ssem/Dabt/actions/runs/45046122996) |
| `pz_pobs` | [Actions #45046123452](https://github.com/q3ssem/Dabt/actions/runs/45046123452) |
| `pz_peng` | [Actions #45046123048](https://github.com/q3ssem/Dabt/actions/runs/45046123048) |
| `pz_pmaze` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_pcrypt` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_pvalve` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_plast` | [Actions #45046123048](https://github.com/q3ssem/Dabt/actions/runs/45046123048) |
| `pz_pdragon` | [Actions #45046123087](https://github.com/q3ssem/Dabt/actions/runs/45046123087) |
| `pz_phall` | [Actions #45046123048](https://github.com/q3ssem/Dabt/actions/runs/45046123048) |
| `pz_pheart` | [Actions #45046122996](https://github.com/q3ssem/Dabt/actions/runs/45046122996) |

### أَثْران — 21 لغزًا

| معرّف اللغز | اختبار مدخلات اللاعب الناجح |
|---|---|
| `pz_aarch` | [Actions #45046123452](https://github.com/q3ssem/Dabt/actions/runs/45046123452) |
| `pz_aport` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_alight` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_acur` | [Actions #45046122996](https://github.com/q3ssem/Dabt/actions/runs/45046122996) |
| `pz_ashell` | [Actions #45046122996](https://github.com/q3ssem/Dabt/actions/runs/45046122996) |
| `pz_aroot` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_aring` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_ashade` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_aswarm` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_aecho` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_avsong` | [Actions #45046122996](https://github.com/q3ssem/Dabt/actions/runs/45046122996) |
| `pz_agiant` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_aherd` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_abridge` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_asilent` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_alayer` | [Actions #45046123452](https://github.com/q3ssem/Dabt/actions/runs/45046123452) |
| `pz_acity` | [Actions #45046123452](https://github.com/q3ssem/Dabt/actions/runs/45046123452) |
| `pz_asong` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_aflow` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |
| `pz_arelic` | [Actions #45046123452](https://github.com/q3ssem/Dabt/actions/runs/45046123452) |
| `pz_aheart` | [Actions #45046123082](https://github.com/q3ssem/Dabt/actions/runs/45046123082) |

### موطن الأثر الأول — 5 لغزًا

| معرّف اللغز | اختبار مدخلات اللاعب الناجح |
|---|---|
| `pz_wbone` | [Actions #45046123164](https://github.com/q3ssem/Dabt/actions/runs/45046123164) |
| `pz_wspore` | [Actions #45046123164](https://github.com/q3ssem/Dabt/actions/runs/45046123164) |
| `pz_wlog` | [Actions #45046123164](https://github.com/q3ssem/Dabt/actions/runs/45046123164) |
| `pz_wlake` | [Actions #45046123164](https://github.com/q3ssem/Dabt/actions/runs/45046123164) |
| `pz_wfirst` | [Actions #45046123164](https://github.com/q3ssem/Dabt/actions/runs/45046123164) |

## الرحلة الجانبية مستقلة عن الـ86

24 محطة مختلفة `ml10_01..ml10_25` مع غياب `ml10_15`. سجّل [Actions #45046123218](https://github.com/q3ssem/Dabt/actions/runs/45046123218) نجاح 24 حلًا عبر واجهات التحكم، و72 نجمة إجمالية، مع عدم تغيير الحفظ الرسمي وفق سجلات الاختبار. إثبات حل المحطة مباشرة يختلف عن فحص فتحها حسب تقدم القصة.

## بوابات القبول غير المغلقة

1. تأكيد 86/86 بعد أي تغيير حقيقي للمحركات أو الصور ذات المراجع الديناميكية؛ لا تنقل نتائج فرع قديم إلى نسخة جديدة إذا تغيّر المنطق.
2. أدلة التعافي من الانقطاع، حفظ التقدم بعد إعادة التحميل، وكل مستوى من المستويات التي تتطلب ذلك (تختلف التغطية حسب اختبار كل معرّف).
3. مراجعة الواجهات في الثيمين، وأهداف اللمس على 320/390/430، والصوت والموسيقى والتفاعل الميداني.
4. **Safari على iPhone فعلي، وموقع النشر النهائي:** غير مثبتين بهذه التشغيلات؛ يبقيان حاجزي قبول.
5. لا دمج لطلبات التنظيف #13 و#14 قبل إغلاق مراحل القبول الست وموافقة صاحب المشروع.

**نتيجة قابلة للتدقيق:** تغطية الفوز الآلي لأسماء الألغاز **86 من 86** في اختبارات المتصفح المرجعية؛ القبول النهائي للإصدار **غير مكتمل**.
