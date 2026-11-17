# تقرير التحقق — MindLab 5.5.25

## التغييرات التي يغطيها الاختبار

- توسيع وضعيات البطلات من 9 إلى 15 صورة WebP.
- خمس حالات لكل واحدة: `welcome`, `thinking`, `curious`, `worried`, `happy`.
- ربط `curious` و`happy` بأصول مخصصة وتحميلها مسبقاً.
- إضافة الصور الست إلى `offline-manifest.js`.
- رفع `package.json` وService Worker إلى 5.5.25.
- تحديث توقعات الإصدار القديمة في اختبارات التكامل حتى لا ترفض الإصدار الجديد لمجرد الرقم السابق.

## النتائج

| مجموعة التحقق | النتيجة |
|---|---|
| `expedition25.polish.cjs` | ناجح — 73 تحققاً |
| `expedition10.logic.cjs` | ناجح |
| `expedition10.integration.cjs` | ناجح |
| `expedition20.logic.cjs` | ناجح |
| `expedition20.integration.cjs` | ناجح |
| `expedition25.logic.cjs` | ناجح |
| `expedition25.integration.cjs` | ناجح |
| Storybook / legacy art / deep art / watercolor / generators | ناجحة عند التشغيل المنفرد |
| Release 4.2–5.5.2 / puzzle city / design / adventure | ناجحة عند التشغيل المنفرد |
| Atheran ink / hints / quality / mechanics / campaign | ناجحة عند التشغيل المنفرد |
| Mirror Palace quality | ناجح — 4,700 assertion |
| Hasad integration | ناجح — 787 تحققاً |

## حدود التحقق

- سلسلة `npm test` الكاملة تجاوزت 300 ثانية في الجلسة الموحدة. لم يُسجل هذا كفشل؛ أُعيد تشغيل ما تبقى من مجموعات الاختبار منفرداً واجتاز.
- اختبارات المصدر والمحاكاة لا تعادل فحصاً بصرياً في Chromium أو لمساً على iOS/Android.
- لم يتم اعتماد اختبار متصفح/هاتف في هذه الدفعة؛ بقي قيد Chromium المحلي `ERR_BLOCKED_BY_ADMINISTRATOR` من المحاولات السابقة.

## سلامة التوافق

- معرّفات المراحل `ml10_01` إلى `ml10_25` محفوظة.
- المفتاح `mindlab:expedition10:v1` محفوظ.
- لا كتابة إلى `miran:v2`.
- 25 مشهداً أصلياً موجودة، و15 وضعية للبطلات مدرجة في Offline Precache.

## فحص أصول الصور

تم التحقق من أن صور الوضعيات الست الجديدة بصيغة WebP ذات قناة شفافية، وأن الأصول الخمسة عشر موجودة في مجلد البطلات، وأن ملفات WebP الخمسة عشر مسجلة في Offline Precache.
