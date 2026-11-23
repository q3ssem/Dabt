# مختبر العقل ٦٫٠ · ملف التصميم الموحّد لجمناي

هذا الملف يجمع البرومبت، المقاسات، دليل الأصول، ترتيب الألغاز، وشروط إعادة الفحص. يمكن إرفاقه كما هو وإرساله مع رابط المستودع. روابط البطاقات والأصول تفتح مراجعها المثبّتة على GitHub.

## البرومبت الجاهز للنسخ

> أنت مصمم تجربة اللعب والرسم ثنائي الأبعاد لمشروع «مختبر العقل» ٦٫٠ على iPhone وiPad. المستودع https://github.com/q3ssem/Dabt والفرع `work/mindlab-puzzle-editorial-20261123`. افتح هذا الملف أولًا https://github.com/q3ssem/Dabt/blob/work/mindlab-puzzle-editorial-20261123/docs/workshop/gemini-design/MINDLAB_GEMINI.md، واقرأ الملفات المرتبطة به قبل الرسم. راجع بطاقة اللغز ورسمه السابق والمصدر وتفسير الحل. إذا عجزت عن قراءة ملف، اذكر مساره واعمل على العناصر التي تحقق مرجعها.
>
> اشتغل على مهلك. ابدأ بالدفعة المعايرة من أربعة ألغاز: لغة التنانين، برج الساعات، قنوات الحديقة، وتحدي السجين الأخير. اعمل اختبار فهم وحل لكل واحد من منظور لاعب جديد. ارسم حالات فعلية، ووضّح أين يلمس اللاعب وكيف يرى أثر قراره، ثم راجع التصميم على أصغر iPhone وiPad. لا تنتقل إلى دفعة جديدة قبل تسجيل نتيجة إعادة الفحص للدفعة الحالية. اقرأ بند التغيير لكل معرّف: بعض التصاميم تحتاج إعادة توزيع مع الحفاظ على الرسم، وبعضها يحتاج إصلاح التفاعل وبعضها يحتاج إعادة بناء المشهد والقرائن.
>
> التزم بالقيم الحرفية في جدول المقاسات أدناه: 320×550 و390×730 و680×310 و744×1000 و1180×770 نقطة للحيّز الآمن. مساحة اللمس 44×44 نقطة على الأقل. لا تؤلف مقاسات شاشة أو أصول، ولا تمدد مستطيلًا جاهزًا لتغطية جهاز آخر. عند نقص مقاس أصل أو تعارض وثيقتين دوّن التعارض والمرجع واطلب حسمه قبل تصدير الأصل. أرسل لقطات المقاسات الخمسة وقِس أبعاد الملفات الفعلية بعد التصدير. افصل مقاس لوحة التصميم بالنقاط عن دقة الأصل بالبكسل.
>
> من «ابدأ» يدخل المستخدم إلى مشهد اللعب بملء الشاشة فورًا. صمّم خلفية بيضاء هادئة وثيمًا داكنًا ثانويًا. حافظ على العربية وRTL، واتجاه هندسة اللوحة، وهوية رواء ونهى وورد. اجعل الشخصية القائدة واضحة وكبيرة، والرسم ثنائي الأبعاد يدوي الطابع وأصوله Raster شفافة في طبقات. انقل القرينة إلى القطعة أو الصمام أو المسار، واستخدم الأزرار الضرورية فقط. أزل الخلفيات السابقة للعب والمستطيلات الزخرفية، وحافظ على حدود اللوحة ذات الوظيفة. لا تصمم للمتصفح أو التلفزيون أو سطح المكتب.
>
> سلّم لكل لغز ملفًا قابلًا للتحرير، ولقطات PNG بمقاساتها، وأصولًا شفافة مع أسمائها ومقاس البكسل ونقاط الارتكاز، وحالات اللعب وقاعدة الحركة. بعد كل دفعة أعد فحص المقاس واللمس والقراءة في العربي والثيمين، وحاول حلًا بديلًا وحالة خاطئة ثم صحّح وأعد الاختبار. دوّن ما فُحص بصريًا، وما فُحص بمنطق اللعبة، وما ينتظر فعليًا جهاز iPhone أو iPad. لا تعتمد التصميم قبل إرفاق دليل. حافظ على المعرفات والحفظ وفتح الفصول، وافصل أي اقتراح لتغيير المحرك كي يراجعه فريق الهندسة.

## ملفات العمل بالترتيب

| الترتيب | الملف | ما تأخذه منه |
| --- | --- | --- |
| ١ | جدول المقاسات أدناه و[عقد التكوين](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-12/README.md) | خمسة إطارات للحيّز الآمن، ٤٤ نقطة لمس، وسلوك التدوير والثيمين وRTL |
| ٢ | قائمة تنفيذ الألغاز أدناه و[ملف التسليم](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-13/README.md) | المعرّف الأصلي، الأولوية، بطاقة النص والتفاعل، مرجع القاعدة، والظهور |
| ٣ | [دفعات إعادة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/README.md) و[سجل التقدم](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/EDITORIAL_PROGRESS.json) | النصوص الجديدة والحلول والتلميحات وطبقات الرسم المطلوبة. افتح بطاقة المعرّف قبل الرسم. |
| ٤ | [مرجع المصدر](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/EDITORIAL_SOURCE_INDEX.json) و[فهرس الظهور](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/appearances.json) | فرّق بين ٨٦ معرّفًا و٨٥ ظهورًا قصصيًا. ٤٠ ظهورًا تشارك لغز المكتبة و٤٥ لها محركات مستقلة. |
| ٥ | [بداية الورشة](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/EDITORIAL_START_HERE.md)، [بوابة الجودة](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/EDITORIAL_QUALITY_GATE.md)، [قالب البطاقة](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/PUZZLE_DELIVERY_TEMPLATE.md) | ضوابط النص والقاعدة، وشروط الدليل قبل الاعتماد. ارجع إلى الدفعة الأصلية الموازية عند وجود تفصيل ناقص. |
| ٦ | [لوحة iPhone](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-12/iphone.webp)، [لوحة iPad](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-12/ipad.webp)، [نموذج الأنابيب](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/pipe/index.html) | اللوحتان توضحان الفكرة والتكوين، وأحجامهما ليست مقاسات التسليم. نموذج الأنابيب يشرح التفاعل والمنطق؛ التسليم لتطبيق iPhone وiPad. |
| ٧ | دليل الأصول أدناه | الشخصيات والأدوات والأمثلة التي تُراجع قبل رسم أصل جديد |

## المقاسات المعتمدة

الأبعاد هي **عرض × ارتفاع الحيّز المتاح بعد الحافة الآمنة، بالنقاط**. ابدأ التصميم على القيم الحرفية في الجدول لكل لغز. التكوين يستجيب للمساحة الفعلية عند دمجه في التطبيق. لا تُضاعف النقاط داخل ملف التصميم ولا تضع شريط متصفح في الإطار.

| الإطار | الحيّز بالنقاط | صورة المراجعة 1× بالبكسل | صورة المراجعة 2× بالبكسل |
| --- | --- | --- | --- |
| iPhone عمودي ضيّق | 320 × 550 | 320 × 550 | 640 × 1100 |
| iPhone عمودي | 390 × 730 | 390 × 730 | 780 × 1460 |
| iPhone أفقي | 680 × 310 | 680 × 310 | 1360 × 620 |
| iPad عمودي | 744 × 1000 | 744 × 1000 | 1488 × 2000 |
| iPad أفقي | 1180 × 770 | 1180 × 770 | 2360 × 1540 |

صورة 1× مطلوبة لكل إطار. 2× اختيارية للتدقيق البصري، والعمود يبيّن المضاعفة فقط. هذه ليست أبعاد ملفات الشخصيات والقطع. استخدم مقاس الأصل بالبكسل ونقطة ارتكازه كما في بطاقة اللغز أو جدول الأصل المعتمد. عند غياب مقاس أو تعارض مقاسين، سجّل الاسم والحالتين والمرجع واطلب اعتماد المقاس قبل تصدير ذلك الأصل، واستمر في العناصر المحسومة. احتفظ بنسبة الأصل ومساحته الشفافة. لا تستخدم قالب جهاز قديم أو حجم لقطة مرجعية لتحديد الأبعاد.

## التنفيذ على مهل

1. **دفعة المعايرة.** لغة التنانين، برج الساعات، قنوات الحديقة وتحدي السجين الأخير. أنجز حالة البداية وحالة تفاعل وحالة خطأ وحالة نجاح لكلٍ منها. اعرض نسخة iPhone الضيّق وiPad الأفقي أولًا للمقارنة، ثم تحقّق من الإطارات الخمسة والثيمين.
2. **الحركة والتخطيط.** الأنابيب، عبور النهر، موقف السيارات. اختبر الحركة ونقطة التوقف والتراجع قبل توسيع القوالب. في النهر تبقى الحيوانات على الضفة، وتقود ورد القارب، ويظل البدن مستقيمًا وتظهر قفزة الصعود والهبوط. أظهر القيد المنطقي في الأنابيب بالرسم بدل إضاءة الحل. في السيارات تحاكي القطعة طول المركبة ومحورها والخانات التي تمنع الحركة.
3. **بقية المعرفات.** اتبع قائمة التنفيذ. حافظ على التصميم السليم عند «إعادة توزيع»، وأعد بناء الفعل المعني عند «تحسين تفاعل»، وأعد بناء ترتيب اللعب والقرائن عند «إعادة تصميم». اسحب كل مجموعة من البطاقات بالمعرّف واحفظ سجل ما اكتمل قبل التالية.
4. **مراجعة من الصفر.** بعد كل دفعة، افتح التصديرات من مقاساتها الفعلية وطبّق اختبار لاعب جديد قبل قراءة الأجوبة. جرّب الحل وبديلًا والحالة الحدّية ثم قارِن ببطاقة القاعدة والمحرك. عند إخفاق، أصلح التكوين أو سجّل خلاف القاعدة، ثم أعد الفحص على الحالات المتأثرة.

في «لغة التنانين» تبقى قرينة الأسرة حين تقبل فرضيتان ناتجين مختلفين. في «برج الساعات» المعاينة منفصلة عن العدد المختار ويُقبل التزامن الموجب إذا حقق القيد. في «قنوات الحديقة» اشرح الانقسام عند نقطة التفرّع، واستخدم عقد الدفعة ١٢ لحالة الصفر وتراجع الحصص. في «السجين الأخير» ارسم الشهادات والماء والنقش بشاشات متتابعة داخل اللعب؛ خط الزمن يحفظ الفرضيات ولا يُقدَّم كشرط فوز جديد.

## شكل التسليم

سلّم لكل معرّف ملف تصميم قابلًا للتعديل ولقطات PNG بمقاساتها وطبقات أصول WebP/PNG شفافة منفصلة. ارفق حالات البداية، الاختيار، الحركة حسب نوع اللغز، الإلغاء أو الخطأ، التلميح، النجاح. ضع العربية وكميات اللعب في طبقة قابلة للتحرير. مواضع اللمس والارتكاز وحدود الاصطدام وتعريف كل حالة في ملف مواصفات بجوار الرسم. ضع تعبيرات رواء ونهى وورد حسب البطاقة، واجعل القائدة كبيرة وواضحة وفق مساحة اللوحة. لا تستبدل الهوية أو الأزياء المعتمدة.

أرفق سجلًا موجزًا بهذا الترتيب لكل لغز.

| الحقل | ما يُكتب |
| --- | --- |
| المرجع | المعرّف واسم المرحلة وظهورها وملف القاعدة |
| التغيير | ما بقي من الرسم السابق وما تغير ولماذا |
| الإطارات | اسم كل إطار، المقاس المستهدف والمقاس المقاس فعلًا ونطاق الثيم والنص |
| الأصول | اسم الملف، الحالة، المقاس بالبكسل، الشفافية، نقطة الارتكاز أو الحركة، ومسار المرجع |
| التحقق | حالة سليمة، حالة خاطئة أو ملغاة، مسار بديل، وإعادة الفحص بعد التصحيح |
| الحكم | مصمم، يحتاج تعديلًا، أو ينتظر فحص جهاز. أرفق دليل كل نتيجة ومن قام بالاختبار. |

قِس أهداف اللمس على التكوين، وراجع النص العربي وقراءة الأرقام وأثر تكبير الخط، وفصل القرائن عن الخلفية. ثبّت أن تدوير الجهاز وإلغاء اللمس لا يستهلكان حركة ولا يمحوان القرار. اختبر الدخول من «ابدأ» إلى اللعب مباشرة. ارفع مقترحات تعديل المنطق أو مراحل البيانات منفصلة، مع حالة اختبار وسبب؛ لا تعدّل الحفظ أو ترتيب الفصول أو معرّفات الألغاز أو main أو فرع هندسة ٦٫٠. يبقى فحص iPhone وiPad الفعلي شرط اعتماد؛ سمِّ المخرجات «تصميم» حتى يتوفر اختبار دمج موثق.

## دليل الأصول الموجودة

## البطلات وهوية القصة

| المرجع | الملف أو المجلد | المقاس أو الاستعمال |
| --- | --- | --- |
| رواء | [crew_full_rawaa.webp](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/treasure/art/story5/crew_full_rawaa.webp) | 443 × 860؛ الهيئة الكاملة |
| نهى | [crew_full_nuha.webp](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/treasure/art/story5/crew_full_nuha.webp) | 359 × 860؛ الهيئة الكاملة |
| ورد | [crew_full_ward.webp](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/treasure/art/story5/crew_full_ward.webp) | 462 × 858؛ الهيئة الكاملة |
| تعبيرات البطلات | [ملفات الشخصيات](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/characters) | الهيئة والأطلس ومواقع التعبيرات. تتجاور صور PNG مع المانيفست في المجلد. |
| الحركة والإشارات | [أطلس انتقالات الحملة](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/journey/transitions_atlas.webp) و[المانيفست](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/journey/manifest.json) | استخدم الأسماء الموجودة في الأطلس، وأضف فقط التعبير أو الوضعية التي يتطلبها فعل من بطاقة اللغز. |

## دفعة المعايرة

| اللغز | الملفات ونطاق استخدامها |
| --- | --- |
| لغة التنانين | [رأس التنين](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/dragons/dragon.webp) 126 × 121، و[الدرج والرموز](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/dragons). الرمز الأول 48 × 48. افحص بقية ملفات الرموز قبل التصدير، ووحّد طريقة عرض الرمز في السطر والدرج. |
| برج الساعات | [الوجه](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/clock/face.webp) 125 × 126 و[العقرب](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/clock/hand.webp) 19 × 126 و[الجرس](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/clock/bell.webp) 125 × 126. ثبّت محور العقرب عند مركز وجهه في ملف التصميم. |
| قنوات الحديقة | [النافورة](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/garden/fountain.webp) 126 × 98، [البوابة](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/garden/gate.webp) 126 × 107، [الزهرة](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/garden/flower.webp) 123 × 126. الماء والبوابة وحالتي الزهرة طبقات مستقلة. |
| تحدي السجين الأخير | [السجين](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/legacy/art/embedded-char_prisoner.webp) 269 × 360، و[رموز الأحداث](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised/boards-70/pjail). افحص الشفافية حول السجين، وصمّم أثر حركة الشهادات والخزانات والنقش كلًا في حالته. |

## المصادر لبقية الدفعات

| المجموعة | مرجع الرسم والربط |
| --- | --- |
| الأنابيب، النهر، السيارات، والألغاز الكلاسيكية | [عناصر الحركة](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/art10)، [أصول النهر](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/river_stage1)، [مخطط نقاط الارتكاز](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/river_stage1/anchors_manifest.json) |
| أدوات القصر والشخصيات والشارات | [الأصول](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/priority7)، [جدول المقاسات والارتكاز](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/priority7/asset_manifest_exact.csv)، [الرسوم المراجعة](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/revised) |
| البحار والحطام والمغامرة | [رسوم القراصنة](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/motion/pirate-revised)، [أدوات الرحلة](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/expedition10/art/props)، [المشاهد](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/expedition10/art/scenes) |
| خرائط الحملة ومشاهد المحطات | [أصول الحملة](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/journey/v3)، [أصول القصة](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/treasure/art/story5)، [حالات العناصر](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/ui/designs_art/work_review) |
| أَثْرَان ومناطق الاكتشاف | [فهرس الأصول](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/atheran/assets/asset_inventory_master.json)، [الأصول](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/atheran/assets)، [ربط الرسوم باللعب](https://github.com/q3ssem/Dabt/tree/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/atheran/bindings) |

في الجداول القديمة، قد يبقى مسار يعود لإصدار سابق أو قالب بمقاس تعريفي مختلف. حدد الملف الموجود فعليًا بالاسم في المجلد؛ اتبع أبعاد الحزمة الحالية لشاشة اللعب، واستعمل مقاس الأصل الموثّق عند المحافظة عليه. الخلفيات في المجلدات مرجع للألوان والهوية أو عنصر لمشهد اللعب. أخرج الأصول الجديدة تحت اسم البطاقة بعد مطابقة المقاس والحالة ونقطة الارتكاز. ارفع بيانًا يفرّق بين أصل معاد استخدامه، ورسم جديد، ومواصفة تنتظر الرسم.

## قائمة التنفيذ لـ٨٦ لغزًا

افتح بطاقة التدقيق قبل رسم أي لغز واستعمل المعرّف للعثور على النص والقاعدة ومقاس كل أصل. تبدأ القائمة بالمعايرة ثم الحركة. راجع [فهرس الظهور](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/appearances.json) للحملة والرحلة الجانبية.

| المعرّف | اللغز | الترتيب | التغيير | مراجع التنفيذ |
| --- | --- | --- | --- | --- |
| `pz_pdragon` | لغة التنانين | المعايرة | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) · [ملاحظات الجهاز](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-12/README.md) |
| `pz_pclock` | برج الساعات | المعايرة | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) · [ملاحظات الجهاز](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-12/README.md) |
| `pz_pgarden` | قنوات الحديقة | المعايرة | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) · [ملاحظات الجهاز](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-12/README.md) |
| `pz_plast` | تحدي السجين الأخير | المعايرة | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) · [ملاحظات الجهاز](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-12/README.md) |
| `pz_pipe` | الأنابيب | الحركة | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) |
| `pz_river` | عبور النهر | الحركة | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) |
| `pz_rush` | موقف السيارات | الحركة | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) |
| `pz_flow` | وصّل الألوان | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) |
| `pz_tan` | تانغرام المربعات | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) |
| `pz_untangle` | فك التشابك | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) |
| `pz_ice` | الجليد المنزلق | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-01/README.md) |
| `pz_rid` | ألغاز القصة | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) · [الأسئلة الـ٣٢](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/riddles.json) |
| `pz_grid` | شبكة المنطق | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) |
| `pz_sudo` | سودوكو الأشكال | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) |
| `pz_tent` | الخيام والأشجار | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) |
| `pz_binary` | شمس وقمر | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) |
| `pz_door` | أبواب القصر | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) |
| `pz_plib` | صفحات اليوميات | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-02/README.md) |
| `pz_tpath` | خريطة القرصان | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_xreef` | ممر الشعاب | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_xbridge` | جسر الوادي | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_xcave` | مشاعل الكهف | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_xloot` | قسمة الغنيمة | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_tmap` | أين دُفن الكنز؟ | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_tdig` | احفر بذكاء | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_xlock` | قفل الصندوق | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-03/README.md) |
| `pz_ybell` | أجراس الحطام | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_ymap` | الخريطة الممزقة | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_yhold` | السفينة الغارقة | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_ytide` | صخور المدّ | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_ydoor` | باب المعبد | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_zcomp` | بوصلة النجوم | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_zroute` | الطريق الآمن | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_zcur` | بوابات المرجان | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-04/README.md) |
| `pz_zcode` | سجلات القبطان | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_zharp` | قيثارة الحورية | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_zshadow` | ظلال الخندق | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_znim` | لعبة التنين | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_zstars` | كوكبة المعبد | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_zthrone` | عرش المحيط | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_plock` | أقفال البوابة | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_pliar` | التماثيل المتكلمة | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-05/README.md) |
| `pz_lock` | القفل السري | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_scale` | الميزان والقطعة المزيفة | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_laser` | الليزر والمرايا | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_soko` | صناديق المخزن | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_lights` | أطفئ الأنوار | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_stroke` | بخط واحد | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_pboss1` | اختبار حارس البوابة | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_pmirror` | مرايا الألوان | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-06/README.md) |
| `pz_pqueen` | تحدي ملكة المرايا | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_parm` | تركيب الأدوات | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_pjail` | شهادات السجناء | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_pobs` | الخريطتان الشفافتان | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_peng` | اختبار مهندس الساعات | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_pmaze` | المتاهة الدوّارة | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_pcrypt` | النقش المخفي | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_pvalve` | صمامات الأعماق | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-07/README.md) |
| `pz_phall` | قاعة الملوك السبعة | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) |
| `pz_pheart` | القلب الأخير | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) |
| `pz_aarch` | أرشيف الرحلات | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) |
| `pz_aport` | ميناء ما وراء المد | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) |
| `pz_alight` | المنارة الأخيرة | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) |
| `pz_acur` | حيث تعود الأشياء | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-08/README.md) |
| `pz_ashell` | أغنية الأصداف | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_aroot` | ممرات راعي الجذور | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_aring` | شجرة الأسماء | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_ashade` | ساعة الظل | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_aswarm` | سرب البياض | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_aecho` | مصدر الصوت | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_avsong` | الوادي يغني | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_agiant` | عادات العمالقة | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-09/README.md) |
| `pz_aherd` | عبور القطيع | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_abridge` | جسور الضباب | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_asilent` | الماء الصافي | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_alayer` | طبقات الزمن | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_acity` | المدينة الحية | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_asong` | أغاني الأعماق | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_aflow` | مفترقات التيار | الدفعات التالية | إعادة تصميم | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_arelic` | أرشيف الآثار الأولى | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-10/README.md) |
| `pz_aheart` | قلب أَثْرَان | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-11/README.md) |
| `pz_wbone` | وادي الهياكل | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-11/README.md) |
| `pz_wspore` | حديقة الأبواغ | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-11/README.md) |
| `pz_wlog` | السفينة التي لم تُبحر | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-11/README.md) |
| `pz_wlake` | بحيرة السماء | الدفعات التالية | إعادة توزيع | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-11/README.md) |
| `pz_wfirst` | موطن الأثر الأول | الدفعات التالية | تحسين تفاعل | [بطاقة التدقيق](https://github.com/q3ssem/Dabt/blob/8a0378f3c9e45de6666338a9be0bc1ab6ad41cd0/docs/workshop/v6-audit/batch-11/README.md) |
