# REMOVED_FILES_REPORT — تصنيف الملفات غير المرجعية

**لم يُحذف أي ملف.** لم يحقق أي ملف الشروط الثلاثة معًا: (1) لا مرجع وقت التشغيل، (2) لا اختبار/أداة تعتمد عليه، (3) ليس مصدرًا أصليًا (master) لأصل مستخدم. الحذف الفعلي في هذا الفرع كان كودًا ميتًا داخل الملفات (CODE_CLEANUP_REPORT.md).

المنهج: كل ملف متتبَّع في git ضمن مجلدات الإنتاج؛ بحث عن مساره واسمه في كل JS/CSS/HTML المشحون (مع استبعاد ملفات manifest/inventory التي تذكر الأسماء فقط)، ثم بحث منفصل في qa/ وtools/ و.github/، ثم فحص الأنماط الديناميكية (`art/${key}.webp`).

| الملف/المجموعة | الحجم | لا مرجع وقت التشغيل | يعتمد عليه | التصنيف | القرار |
|---|---|---|---|---|---|
| ui/designs_art/river_v2/* (19 ملف) | 7.1 MB | نعم | qa/tests/design-integration.cjs يفحص وجودها | يحتاج ترحيلًا | إبقاء — ولا يُحمَّل للاعب (ليس في offline-manifest) |
| ui/designs_art/characters/nuha_full, ward_full, nuha_expressions (png) | 5.8 MB | نعم | لا | مصدر رسم أصلي محتمل لـ crew_full_*.webp | إبقاء — أدلة غير كافية |
| ui/designs_art/journey/shared_props_atlas_draft.png | 2.7 MB | نعم | journey/manifest.json (مواصفة تسليم) | مسودة مصدر | إبقاء — يحتاج موافقتك |
| PNG الأصلية لست صور حُوِّلت WebP في الدفعة B (journey_map, transitions_atlas, خلفيات pz_pipe/stat/rid/rush) | — | نعم (بعد B) | transitions_atlas.png في اختبار | master | إبقاء — لإعادة التوليد |
| motion/preview/pz_rid.html | 5 KB | نعم | تقرير design-01-10 (قرار سابق موثّق) | معاينة مطوّر | إبقاء |
| legacy/art/motion.webp، watercolor/art/{tower,tracking,workbench}.webp | — | تُستدعى ديناميكيًا بالمفتاح | — | غير مباشر | إبقاء |
| *.md / OFL.txt / stages.csv / asset_manifest_exact.csv / specs_*.json | <13 KB لكل | نعم | توثيق/ترخيص | توثيق | إبقاء |

الأثر على اللاعب صفر في كل الحالات: هذه الملفات لا تُطلب ولا تُخزَّن في الكاش. أثرها حجم المستودع فقط.

**مسار التراجع** لأي حذف مستقبلي: الملفات في تاريخ git؛ `git checkout <commit>^ -- <path>`.

**يحتاج قرارك:** هل نحذف river_v2 (مع تعديل design-integration.cjs) وshared_props_atlas_draft.png ومسودات الشخصيات؟ يوفّر ~15.6 MB من المستودع، ولا يغيّر شيئًا للاعب.
