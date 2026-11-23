# النواة المشتركة — قبل نقل الألعاب

المسؤوليات المخطط لها: router، game lifecycle، save adapter، progress، sound، localization (Arabic RTL)، theme، offline support.
كل محرك لعبة مستقبلي يجب أن يقدم واجهة دورة حياة مستقلة (`mount`, `unmount`, `reset`) وتوثيق بيانات الحفظ.
**لا توجد محركات منقولة بعد.** ممنوع استيراد `research/` أو ملفات V5 مباشرة إلى إصدار اللاعب.
