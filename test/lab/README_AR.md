# دراسة Phaser 4 — نموذج «تتبع الكرات» (منفصل عن التطبيق)

هذه الحزمة دراسة فقط، لا تمس مختبر العقل 5.4.8.

## التشغيل
1. انسخ مجلد `prototype` إلى داخل مجلد التطبيق باسم `lab` (حتى يشارك الحفظ miran:v2 وService Worker)، أو شغّله منفردًا:
   `python3 -m http.server 8096` داخل مجلد prototype.
2. افتح:
   - `play.html?r=canvas` — العارض الحالي (Canvas 2D)
   - `play.html?r=phaser` — Phaser 4.2.1 · WebGL (أضف `&pr=canvas` لعارض Canvas في Phaser)
   - `play.html?r=pixi` — PixiJS 8.23 · WebGL
   - أضف `&tv=1` لوضع التلفزيون (أسهم + OK)، و`&sleep=1` لإيقاف الحلقة في الشاشات الثابتة.
3. **القياس على جوالك:** افتح `bench.html` واضغط «ابدأ القياس» ثم «نسخ النتائج» وأرسلها.

## الملفات
- `mot-core.js` منطق اللعبة مطابق لقواعد runMOT، بلا رسم. يكتب lv.motK وlv.motS فقط في miran:v2.
- `renderers/` العارضات الثلاثة.
- `vendor/` phaser.min.js وpixi.min.js مع رخصتيهما (MIT).
- `measurements/` سكربتات القياس (Playwright) والنتائج الخام results.json.

## حدود القياس
بيئة القياس بلا معالج رسوميات، فـWebGL يعمل بالبرمجيات؛ أرقام WebGL تحت الضغط لا تمثل الجوال. البطارية مقيسة بزمن المعالج كمؤشر بديل.
