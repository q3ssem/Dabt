# تقرير التصحيح البصري النهائي لمكتبة أَثْران — MindLab 5.5.28
(`VISUAL_FIXES_FINAL_REPORT_AR.md`)

## 1. الملفات الستة التي أعيد إنتاجها (الإصلاح الإلزامي)
1. `characters/layan/layan_talking.png` — مطابقة كاملة لـ `layan_default.png` (الغطاء الترابي ذو القلنسوة، القميص الزيتوني، المئزر الملطخ بالحبر، أنبوب الخرائط الجلدي على الظهر).
2. `characters/layan/layan_pointing.png` — مطابقة كاملة لـ `layan_default.png` مع تغيير الوضعية إلى الإشارة باليد وحمل خريطة.
3. `characters/badr/badr_talking.png` — مطابقة كاملة لـ `badr_default.png` (شاب بشعر أسود قصير دون عصابة رأس، لحية قصيرة مهذبة، قميص أزرق رمادي، صدرية جلدية/قماشية وحزام عدة).
4. `characters/badr/badr_pointing.png` — مطابقة كاملة لـ `badr_default.png` مع حمل المطرقة الخشبية والإشارة للأمام.
5. `characters/uncle_nawwar/uncle_nawwar_talking.png` — مطابقة كاملة لـ `uncle_nawwar_default.png` (القبعة الصوفية البنية المحبوكة دون قبعة قرصان، الوشاح الذهبي ذو الشراشيب، المعطف الكحلي بحواف بيج، اللحية الفضية القصيرة).
6. `characters/uncle_nawwar/uncle_nawwar_pointing.png` — مطابقة كاملة لـ `uncle_nawwar_default.png` مع الإشارة للأفق وحمل المنظار النحاسي.

## 2. التحسينات الاختيارية المنفذة (3 ملفات فقط)
* `puzzles/pz_aarch/pz_aarch_ledger_card_set.png`: إضافة إطار تأكيد ذهبي وعلامة اعتماد واضحة لتمييزها عن `default`.
* `puzzles/pz_aarch/pz_aarch_captain_seal_set.png`: إضافة إطار تأكيد ذهبي وعلامة اعتماد واضحة لتمييزها عن `default`.
* `puzzles/pz_alayer/pz_alayer_mineral_vein_used.png`: تخفيف التشبع وإضافة حلقة زيتونية وعلامة اعتماد لتمييز العرق المستخدم بوضوح عن `default`.

## 3. قائمة الملفات المتغيرة وبصمات SHA-256 الجديدة
| الفئة | المسار (`relative_path`) | البصمة الجديدة (`SHA-256`) |
| :--- | :--- | :--- |
| mandatory_npc_fix | `characters/layan/layan_talking.png` | `68cfe0ab57f1a6a8aaa62a057787d09849cce8d2b75576dbe3ba57615bafc328` |
| mandatory_npc_fix | `characters/layan/layan_pointing.png` | `191ac426b37fe21f22a8a64f4551f50269979bd1f01b684ea40040cb0d93d474` |
| mandatory_npc_fix | `characters/badr/badr_talking.png` | `88f1b3593d3e25fe1180b6e8e1141b2a099b1180ca7e0a6eb71512105926544d` |
| mandatory_npc_fix | `characters/badr/badr_pointing.png` | `48008b707ea96ab9016aff0332e9023ad00937d8157fecb89070fdf4e7ce2b5f` |
| mandatory_npc_fix | `characters/uncle_nawwar/uncle_nawwar_talking.png` | `28b3900efccde3c82124896076515a98c55c04502d93a5d1027790d4fadf5265` |
| mandatory_npc_fix | `characters/uncle_nawwar/uncle_nawwar_pointing.png` | `157977253c8830e4e4e3805eefd73907c1ae5fa38d4e19c7e9631af49d0f9fe8` |
| optional_state_clarity | `puzzles/pz_aarch/pz_aarch_ledger_card_set.png` | `94a5d33bdc2a7673e13ebc10d4cbf74c13fd0f803b6df4c0c97334020f54a8ae` |
| optional_state_clarity | `puzzles/pz_aarch/pz_aarch_captain_seal_set.png` | `c15f824baa8af31fdb923d66b86a7de377925c3e0312165183c26a7412c4a8af` |
| optional_state_clarity | `puzzles/pz_alayer/pz_alayer_mineral_vein_used.png` | `42592981ac402bec0860d44304d55326ae86ebb333a715329a00e135acbaa562` |

## 4. تأكيد عدم المساس ببقية المكتبة
* لم تتغير أي من صور رواء ونهى وورد، ولا الخلفيات الـ105، ولا الخرائط، ولا الآثار الـ14، ولا العوالم السرية الـ5، ولا لوحات الخاتمة الـ5، ولا كود اللعبة.
* تم حفظ نسخة احتياطية من جميع الملفات قبل التعديل، وتحديث `asset_inventory_master.json` بالبصمات الجديدة.
