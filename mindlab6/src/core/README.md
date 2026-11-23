# النواة المشتركة — قبل نقل الألعاب

المسؤوليات المخطط لها: router، game lifecycle، save adapter، progress، sound، localization (Arabic RTL)، theme، offline support.
كل محرك لعبة مستقبلي يجب أن يقدم واجهة دورة حياة مستقلة (`mount`, `unmount`, `reset`) وتوثيق بيانات الحفظ.
المطبق الآن:
- `game-registry.js`: تسجيل عنصر مستقل ذي معرف ومحرك و`load()` كسول.
- `game-host.js`: `open/pause/resume/close/destroy` مع إبطال تحميل سابق، عزل DOM، تنظيف ودورة حياة آمنة.
- `graphics-capabilities.js`: كشف WebGL2 وإشارة WebGPU دون افتراض أن الجهاز نجح في اختيار المحول، وتحديد مبدئي لمقياس البكسلات.
- `../engines/README.md`: واجهة المحركات الاختيارية.
**المثبت تجريبيًا:** PixiJS 8.23.0 وPlayCanvas 2.24.2 داخل معمل Vite منفصل. لم تُنقل ألعاب ولا بيانات حفظ. لا يوجد محرك 3D معتمد إنتاجيًا ولا اختبار هاتف فعلي. ممنوع استيراد `research/` أو ملفات V5 مباشرة إلى إصدار اللاعب.
