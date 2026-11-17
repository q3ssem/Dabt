# أَثْرَان — تنظيم المجلد

| المجلد | المحتوى |
|---|---|
| `campaign/` | `story.js` نصوص القصة · `campaign.js` الأطلس والمحطات والعوالم السرية وترتيب مكتبة الألغاز · `campaign.css` |
| `runtime/` | `assets-runtime.js` سجل الأصول الـ546 وربطها بالمشاهد · `assets.css` |
| `bindings/` | `bindings.js` و`bindings.css`: حالات القطع الـ80، الإطارات الـ14، المؤثرات، الخريطة، العمل دون اتصال · `frames/` حواف مشتقة من الإطارات المعتمدة |
| `assets/` | الأصول المعتمدة (546) بمساراتها ومعرفاتها الأصلية — لا تُنقل |
| `library.json` | فهرس الألغاز: 21 محطة × 3 مراحل، 5 عوالم سرية، و25 محطة للرحلة الجانبية (للمراجعة فقط) |

ترتيب التحميل (من `ui/app.js`): `runtime/assets-runtime.js` ← `campaign/story.js` ← `campaign/campaign.js` ← `bindings/bindings.js`.
محركات الألغاز الـ63 داخل `index.html` (محمي ببصمة)، ولم تُنقل. الرحلة الجانبية في `expedition10/` ومستقلة.
فحص المراجع بعد أي نقل: `node qa/tests/references.cjs`.
