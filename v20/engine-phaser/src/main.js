import Phaser from 'phaser';
import { resolveElementInteraction } from '../../src/adventures/elemental-systems.js';
import { stepEnemyAI } from '../../src/adventures/enemy-ai.js';
import { resolveElementalCombat } from '../../src/adventures/elemental-combat.js';
import { resolveBossElement } from '../../src/adventures/boss-elemental.js';
import { getCampaignConsequence, resolveAreaConsequence } from '../../src/adventures/campaign-consequences.js';

const W = 1280, H = 720;
const SAVE_KEY = 'dabt-pro-phaser-v100';
const RELICS = { island:['قطعة من خريطة الأطلس','صدفة المدّ','عدسة المرصد'], planet:['عينة غبار قمري','بلورة المريخ','شظية جليد نبتون'] };
const palette = {
  ink: '#243b3b', paper: '#f4e7c8', gold: '#e6b65c', leaf: '#537c58', sea: '#5b9eaa',
  mars: '#b95f43', night: '#293c56', cream: '#fff4d8'
};
const worlds = {
  island: {
    title: 'جزيرة الكنز',
    areas: [
      {subtitle:'أطلس الرماد · الفصل الأول: الشاطئ الذي يتذكر',bg:'island',tint:0xf4dca9,ground:0x806044,
       platforms:[[0,650,1280,70],[260,540,190,24],[560,455,190,24],[870,535,210,24],[1100,405,170,24]],
       clues:[
        {x:340,y:492,title:'نقش المدّ',intro:'على الصخرة ثلاث علامات: موجة، قمر، وشمس. نقش صغير يقول: اتبع ما يعود قبل أن يرحل.',question:'أي ترتيب يصف دورة المدّ في هذا اللغز؟',options:['قمر ← مدّ ← جزر','شمس ← جزر ← قمر','مدّ ← شمس ← قمر'],answer:0,explain:'القمر يؤثر في المدّ، ثم ينحسر الماء مع دورة الجزر.'},
        {x:655,y:405,title:'مرآة الحارس',intro:'مرآة برونزية لا تفتح الباب إلا إذا وصل الضوء إلى العلامة الهلالية.',question:'أي مرآة تغيّر اتجاه الشعاع نحو الهلال؟',options:['المرآة المائلة 45°','المرآة المسطحة','المرآة المعتمة'],answer:0,explain:'الميل يغيّر مسار الانعكاس باتجاه العلامة.'},
        {x:970,y:485,title:'صندوق البحّار',intro:'ثلاثة أوزان على الصندوق. الرسالة تقول: الأخف أولاً، والأثقل أخيراً.',question:'ما ترتيب الأوزان الصحيح؟',options:['1 ثم 2 ثم 3','3 ثم 2 ثم 1','2 ثم 1 ثم 3'],answer:0,explain:'الترتيب التصاعدي يطابق الرسالة.'}
       ],exit:{x:1200,y:570,label:'مدخل الكهف'}},
      {subtitle:'الفصل الثاني: الكهف الذي يتنفس',bg:'cave',tint:0x7e8d88,ground:0x555b55,
       platforms:[[0,650,1280,70],[220,535,180,24],[480,445,190,24],[760,520,180,24],[1030,420,210,24]],
       clues:[
        {x:310,y:490,title:'أنفاس الكهف',intro:'ثلاث فتحات تهوي بالتتابع. الغبار يكشف أن الهواء يخرج من فتحة ثم يعود من أخرى.',question:'أي فتحة تفتح أولاً إذا كان الهواء يتحرك من الضغط الأعلى إلى الأقل؟',options:['الفتحة ذات الضغط الأعلى','الفتحة ذات الضغط الأقل','كل الفتحات معاً'],answer:0,explain:'الهواء يتحرك من منطقة ضغط أعلى إلى منطقة ضغط أقل.'},
        {x:570,y:395,title:'تروس الحارس',intro:'ترس صغير يدير ترساً كبيراً متشابكاً معه.',question:'إذا دار الترس الأول مع عقارب الساعة، كيف يدور الثاني؟',options:['عكس عقارب الساعة','مع عقارب الساعة','لا يدور'],answer:0,explain:'التروس المتشابكة تدور في اتجاهين متعاكسين.'},
        {x:860,y:470,title:'جسر البلورات',intro:'الجسر لا يثبت إلا إذا وضعت البلورات من الأقصر إلى الأطول.',question:'أي قاعدة ترتيب تحقق المطلوب؟',options:['تصاعدي حسب الطول','تنازلي حسب اللمعان','حسب اللون فقط'],answer:0,explain:'الترتيب التصاعدي للطول يطابق نقش الجسر.'}
       ],exit:{x:1200,y:570,label:'مرصد الأطلس'}},
      {subtitle:'الفصل الثالث: مرصد الأطلس',bg:'observatory',tint:0x303b5b,ground:0x4d526a,
       platforms:[[0,650,1280,70],[230,540,190,24],[510,450,190,24],[790,525,190,24],[1080,410,170,24]],
       clues:[
        {x:320,y:495,title:'خريطة النجوم',intro:'ثلاث نجوم تصنع مثلثاً. أقدم خريطة تشير إلى أن النجم اللامع في الأعلى هو نقطة البداية.',question:'من أي نقطة تبدأ قراءة الخريطة؟',options:['النجم العلوي اللامع','النجم الأقرب للحافة','أي نقطة عشوائياً'],answer:0,explain:'علامة البداية تحدد اتجاه قراءة الكوكبة.'},
        {x:610,y:400,title:'ساعة الكوكبة',intro:'تتحرك العلامات حول القرص بترتيب ثابت، لكن واحدة منها مفقودة.',question:'ما أفضل طريقة لإكمال النمط الدوري؟',options:['تحديد وحدة التكرار ثم إعادتها','اختيار الرمز الأكثر لمعاناً','عكس الترتيب بالكامل'],answer:0,explain:'اكتشاف وحدة التكرار هو أساس إكمال النمط الدوري.'},
        {x:920,y:475,title:'قفل الأطلس',intro:'ثلاثة أختام تمثل المكان والزمان والاتجاه. لا يفتح القفل إلا بالترتيب المنطقي.',question:'ما الترتيب الأنسب لقراءة دليل رحلة؟',options:['المكان ثم الزمن ثم الاتجاه','الاتجاه ثم المكان ثم اللون','الزمن ثم اللون ثم الوزن'],answer:0,explain:'تحديد المكان ثم زمن الحدث ثم الاتجاه يبني وصفاً متماسكاً للمسار.'}
       ],exit:{x:1200,y:570,label:'بوابة العودة'}}
    ]
  },
  planet: {
    title: 'رحلة الكواكب',
    areas: [
      {subtitle:'أطياف المدار · المحطة الأولى: قمر الظلال',bg:'moon',tint:0xd9d4c8,ground:0x686b75,
       platforms:[[0,650,1280,70],[240,545,190,24],[500,445,190,24],[800,525,190,24],[1060,405,190,24]],
       clues:[
        {x:330,y:495,title:'ساعة الظلال',intro:'على سطح القمر الظلال حادة، ويتغير طولها مع زاوية سقوط الضوء.',question:'إذا كانت الشمس منخفضة قرب الأفق، كيف يصبح الظل؟',options:['طويلاً','قصيراً جداً','يختفي'],answer:0,explain:'زاوية الضوء المنخفضة تنتج ظلاً أطول.'},
        {x:590,y:400,title:'مسار الفوهات',intro:'تحتاج العربة لعبور حقل فوهات بأقل قفزات ممكنة.',question:'أي مسار يتجنب الفوهة العميقة؟',options:['المنصة المرتفعة ثم المسطحة','الهبوط في القاع','العودة للخلف'],answer:0,explain:'المنصة المرتفعة تمنح مساراً آمناً فوق الحافة.'},
        {x:900,y:480,title:'موازن الجاذبية',intro:'تتحرك الكتل ببطء أكبر في الجاذبية المنخفضة، لكن كتلتها لا تختفي.',question:'ما الذي يتغير على القمر مقارنة بالأرض؟',options:['الوزن يقل والكتلة ثابتة','الكتلة تقل والوزن ثابت','كلاهما يختفي'],answer:0,explain:'الوزن يعتمد على الجاذبية، أما الكتلة فتبقى ثابتة.'}
       ],exit:{x:1200,y:570,label:'بوابة المريخ'}},
      {subtitle:'المحطة الثانية: سهول المريخ الحمراء',bg:'mars',tint:0xc4775b,ground:0x87523e,
       platforms:[[0,650,1280,70],[230,535,190,24],[510,445,190,24],[800,525,190,24],[1080,405,180,24]],
       clues:[
        {x:320,y:490,title:'ممر العاصفة',intro:'غبار المريخ يضعف الرؤية. راقب اتجاه الرياح قبل عبور الممر.',question:'أي علامة تساعدك على اختيار المسار الأقل تعرضاً للغبار؟',options:['اتجاه الرياح خلف الحاجز','لون الصخور فقط','أقصر مسافة دون اعتبار الرياح'],answer:0,explain:'اتجاه الرياح والحواجز يحددان مناطق الحماية من الغبار.'},
        {x:610,y:395,title:'ماء تحت السطح',intro:'تظهر طبقات جليد تحت سطح بارد. يجب اختيار نقطة حفر لا تخلط الطبقات.',question:'ما الدليل الأفضل على وجود طبقة جليدية؟',options:['انعكاس راداري متوافق مع طبقة مدفونة','صخرة حمراء منفردة','ظل طويل فقط'],answer:0,explain:'الإشارة الرادارية المتوافقة مع طبقة تحت السطح دليل أقوى من اللون أو الظل.'},
        {x:920,y:470,title:'مسار العربة',intro:'العربة محدودة الطاقة. كل التفاف يستهلك جزءاً من البطارية.',question:'أي خطة تقلل استهلاك الطاقة مع تجنب المنحدر الحاد؟',options:['مسار متوسط الميل مع نقاط توقف','أقصر خط عبر المنحدر','الدوران حول المنطقة مرتين'],answer:0,explain:'المسار المتوسط مع نقاط توقف يوازن بين المسافة والانحدار.'}
       ],exit:{x:1200,y:570,label:'بوابة نبتون'}},
      {subtitle:'المحطة الثالثة: نبتون الأزرق',bg:'neptune',tint:0x477caa,ground:0x345b80,
       platforms:[[0,650,1280,70],[240,540,190,24],[510,450,190,24],[800,525,190,24],[1080,410,180,24]],
       clues:[
        {x:330,y:490,title:'ميزان الرياح',intro:'تدور الرياح بسرعة شديدة. تظهر الأسهم المتتابعة اتجاهات متغيرة.',question:'كيف تتعامل مع اتجاه يتغير بين قراءة وأخرى؟',options:['تجمع عدة قراءات وتبحث عن النمط','تعتمد أول قراءة فقط','تتجاهل اتجاه الرياح'],answer:0,explain:'تجميع القراءات يقلل أثر التغير اللحظي.'},
        {x:610,y:400,title:'جليد الميثان',intro:'بلورات جليدية لامعة تغطي ممراً. لا تخلط بين اللمعان والصلابة.',question:'ما التصرف الأكثر أماناً قبل عبور الجليد؟',options:['اختبار ثبات نقطة صغيرة أولاً','الجري مباشرة','القفز دون فحص'],answer:0,explain:'اختبار نقطة صغيرة يقلل المخاطرة قبل تحميل السطح.'},
        {x:920,y:475,title:'شفرة المدار',intro:'ثلاث إشارات ضوئية تتكرر على إيقاع ثابت قبل فتح منصة العودة.',question:'ما الاستراتيجية الأفضل لفك الإشارة؟',options:['تسجيل التسلسل ثم تحديد وحدة التكرار','الضغط بسرعة عشوائية','حذف أول إشارة'],answer:0,explain:'تسجيل التسلسل واكتشاف وحدته يكشف النمط المتكرر.'}
       ],exit:{x:1200,y:570,label:'بوابة العودة'}}
    ]
  }
 };

// Authored campaign expansion: six island chapters and nine planetary stops.
function authoredArea(subtitle,bg,ground,clues,exitLabel){
  return {subtitle,bg,tint:0xf4e7c8,ground,
    platforms:[[0,650,1280,70],[210,535,190,24],[455,445,190,24],[710,520,190,24],[970,420,190,24],[1130,540,140,24]],
    clues:clues.map((c,i)=>({x:[300,620,930][i],y:[490,395,465][i],title:c[0],intro:c[1],question:c[2],options:c[3],answer:c[4],explain:c[5]})),
    exit:{x:1200,y:570,label:exitLabel}};
}
worlds.island.areas.push(
  authoredArea('الفصل الرابع: حطام السفينة التي لا تغرق','island',0x665a4c,[
    ['سجل القبطان','تتكرر في السجل ثلاث رحلات، لكن تاريخاً واحداً يسبق العاصفة.','أي معلومة تساعدك على ترتيب الرحلات زمنياً؟',['مقارنة التواريخ أولاً','اختيار أطول وصف','ترتيب الأسماء أبجدياً'],0,'التواريخ هي الدليل المباشر على الترتيب الزمني'],
    ['رافعة الحطام','توازن الرافعة يعتمد على بُعد الثقل عن نقطة الارتكاز.','كيف تقلل القوة اللازمة لرفع صندوق ثقيل؟',['إبعاد نقطة تأثير القوة عن الارتكاز','تقريب القوة من الارتكاز','إزالة ذراع الرافعة'],0,'زيادة ذراع القوة تمنح عزماً أكبر بالقوة نفسها'],
    ['إشارة المنارة الغارقة','ثلاث ومضات قصيرة تسبق ومضة طويلة في كل دورة.','ما وحدة النمط المتكرر؟',['ثلاث قصيرة ثم طويلة','قصيرة ثم طويلة فقط','أربع طويلة'],0,'تحديد الوحدة الكاملة يكشف تكرار الإشارة']
  ],'ممر المنغروف'),
  authoredArea('الفصل الخامس: غابة الجذور المتشابكة','cave',0x52634f,[
    ['جسر الجذور','لا يتحمل الجسر إلا إذا وزعت الألواح بالتساوي على الدعامات.','أي توزيع أكثر اتزاناً؟',['توزيع متساوٍ على الدعامات','تكديسها في طرف واحد','ترك الوسط فارغاً'],0,'التوزيع المتوازن يقلل الحمل الموضعي'],
    ['أصوات المستنقع','يتكرر نداء الطائر كل أربع نبضات، ويقطعه صوت ماء كل ثلاث.','متى يتزامن الصوتان مجدداً بعد البداية؟',['بعد 12 نبضة','بعد 7 نبضات','بعد 9 نبضات'],0,'أصغر مضاعف مشترك لـ3 و4 هو 12'],
    ['بذرة الحارس','ثلاث بذور تختلف في الحجم والوزن واللون. النقش يطلب الأكبر وزناً لا حجماً.','أي دليل يحسم الاختيار؟',['قياس الوزن','مقارنة اللون','تقدير الحجم بالنظر'],0,'المعيار المطلوب هو الوزن تحديداً']
  ],'منارة الأطلس'),
  authoredArea('الفصل السادس: منارة الأطلس الأخيرة','observatory',0x4d526a,[
    ['غرفة العدسات','تجمع عدستان الضوء في بؤرة واحدة عند ضبط المسافة.','ما الذي ينبغي تغييره أولاً إذا كانت البؤرة خلف العلامة؟',['تقليل المسافة البصرية تدريجياً','تدوير الغرفة عشوائياً','إطفاء كل المصابيح'],0,'التعديل التدريجي لمتغير واحد يساعد على تحديد الضبط الصحيح'],
    ['شفرة البحّارة','الرسالة تقول: كل رمز ينتقل خانتين إلى الأمام في الأبجدية الرمزية.','ما أفضل طريقة لفك الرسالة؟',['تطبيق إزاحة ثابتة على كل رمز','عكس ترتيب الكلمات','حذف الرموز المتكررة'],0,'قاعدة الإزاحة الثابتة تطبق على جميع الرموز'],
    ['قلب الأطلس','لا يستقر الأطلس إلا إذا ربطت الدليل بالمكان ثم بالحدث.','أي ترتيب يبني تفسيراً متماسكاً؟',['المكان ثم الدليل ثم الحدث','الحدث ثم التخمين ثم المكان','اللون ثم الاسم ثم الوزن'],0,'ربط المكان بالدليل ثم الحدث يقلل القفز إلى استنتاجات']
  ],'قلب الأطلس')
);
worlds.planet.areas.push(
  authoredArea('المحطة الرابعة: غيوم الزهرة الكثيفة','mars',0x98704c,[
    ['نافذة الضغط','مسبار يتحمل ضغطاً محدوداً. تتصاعد القراءة كلما هبط أعمق.','ما القرار الأكثر أماناً عند الاقتراب من الحد؟',['إيقاف الهبوط قبل تجاوز حد التحمل','زيادة سرعة الهبوط','تجاهل القراءة الأخيرة'],0,'الالتزام بحدود تحمل الجهاز يمنع فشل المهمة'],
    ['ميزان الحرارة','تتغير حرارة السطح بين النهار والليل بشكل كبير.','أي قياس يعطي مقارنة عادلة؟',['القياس في التوقيت والموضع نفسيهما','قياسان في منطقتين مختلفتين','الاعتماد على لون السطح'],0,'تثبيت ظروف القياس يجعل المقارنة أكثر موثوقية'],
    ['مرشح الغلاف','ثلاث طبقات ترشيح تزيل جسيمات بأحجام مختلفة.','ما ترتيب الاستخدام المنطقي؟',['الأخشن ثم الأدق','الأدق ثم الأكبر دائماً','اختيار عشوائي'],0,'الترشيح من الخشن إلى الأدق يقلل انسداد المرشح الدقيق']
  ],'مدار المشتري'),
  authoredArea('المحطة الخامسة: عواصف المشتري','moon',0x6b6259,[
    ['عين العاصفة','تظهر دوامة كبيرة وبداخلها مناطق حركة مختلفة.','كيف تحدد مركز الدوران من مسارات السحب؟',['تتبع اتجاهات الحركة حول نقطة مشتركة','اختيار أفتح سحابة','قياس عرض الصورة فقط'],0,'اتجاهات الحركة المنحنية تكشف مركز الدوران'],
    ['قمر أوروبا','إشارة رادارية تعبر قشرة جليدية ثم تنعكس من طبقة أسفلها.','ما الاستنتاج الحذر؟',['قد توجد طبقة مختلفة تحت الجليد وتحتاج أدلة إضافية','ثبت وجود حياة','الإشارة تعني محيطاً مؤكداً'],0,'الرادار قد يكشف اختلاف الطبقات لكنه لا يثبت الحياة'],
    ['مناورة الجاذبية','المركبة تمر قرب قمر لتعديل مسارها.','ما فائدة المناورة بالجاذبية؟',['تغيير السرعة والاتجاه بالنسبة للكوكب','إيقاف الجاذبية','زيادة كتلة المركبة'],0,'الجذب يغير متجه سرعة المركبة خلال المرور']
  ],'حلقات زحل'),
  authoredArea('المحطة السادسة: حلقات زحل','neptune',0x625a4f,[
    ['فجوة كاسيني','تظهر فجوة بين نطاقين من الحلقات.','أي تفسير علمي مناسب لتشكل فجوة مستقرة؟',['تأثيرات رنين مداري مع قمر','غياب الجاذبية','توقف دوران زحل'],0,'الرنين المداري قد ينظم توزيع الجسيمات'],
    ['تركيب الحلقة','تختلف الجسيمات في الحجم والانعكاس.','ما أفضل طريقة لمقارنة تركيبها؟',['جمع قياسات طيفية من أكثر من طول موجي','الاعتماد على صورة واحدة','تقدير اللون بالعين فقط'],0,'القياسات الطيفية المتعددة تساعد على تمييز المواد'],
    ['مسار القمر الصغير','قمر صغير يمر قرب حافة الحلقة ويؤثر في الجسيمات.','ما الأثر المتوقع قرب مساره؟',['اضطراب محلي أو فجوة في توزيع الجسيمات','اختفاء كل الحلقات','توقف دوران الكوكب'],0,'الجاذبية المحلية قد تعيد توزيع الجسيمات']
  ],'أفق أورانوس'),
  authoredArea('المحطة السابعة: ميل أورانوس الغريب','moon',0x55717b,[
    ['محور مائل','يدور أورانوس بميل محوري كبير مقارنة بمعظم الكواكب.','ما النتيجة المناخية طويلة المدى؟',['فصول شديدة الطول واختلاف كبير في الإضاءة','اختفاء الفصول','ثبات الإضاءة على كل خط عرض'],0,'الميل الكبير يغير توزيع ضوء الشمس خلال المدار'],
    ['ظل القطب','يرصد الفريق تغير الإضاءة قرب القطب عبر سنوات.','أي بيانات تحتاجها لتفسير التغير؟',['سلسلة زمنية طويلة مع موقع الرصد','صورة واحدة','درجة حرارة جهاز واحد'],0,'السلاسل الزمنية تميز التغير الموسمي عن التذبذب العابر'],
    ['توازن المركبة','تتغير زاوية الألواح الشمسية مع اتجاه الضوء.','ما الذي يحسن استقبال الطاقة؟',['توجيه الألواح عمودياً تقريباً على الأشعة','توجيهها بعيداً عن الضوء','طي الألواح'],0,'المساحة المواجهة للأشعة تزيد الطاقة المستقبلة']
  ],'بوابة نبتون'),
  authoredArea('المحطة الثامنة: رياح نبتون','neptune',0x345b80,[
    ['نافذة الرياح','تتغير سرعة الرياح على فترات قصيرة.','كيف تتجنب قراراً مبنياً على قراءة شاذة؟',['تجميع عدة قراءات ومقارنة المتوسط والمدى','اختيار أعلى قراءة','حذف كل القراءات'],0,'تعدد القراءات يساعد على تمييز التغير الحقيقي من الشذوذ'],
    ['بلورات الميثان','تتجمع البلورات على حافة باردة.','أي عامل يفسر الترسب على السطح؟',['انخفاض الحرارة إلى حد يسمح بالتكاثف أو التجمد','زيادة لون السماء','قرب المركبة من الكاميرا'],0,'الحرارة تحدد حالة المادة وإمكان ترسبها'],
    ['توجيه الهوائي','تحتاج الإشارة إلى المرور عبر نافذة اتصال قصيرة.','ما الخطة الأفضل؟',['حساب نافذة الاتصال وتوجيه الهوائي مسبقاً','انتظار انقطاع الإشارة','تغيير التردد عشوائياً'],0,'التحضير المسبق يستغل نافذة الاتصال المحدودة']
  ],'المحطة الأخيرة'),
  authoredArea('المحطة التاسعة: حافة النظام الشمسي','observatory',0x344d65,[
    ['خريطة المسافة','تظهر الكواكب على خريطة بمقياس غير خطي.','ما الذي يجب التحقق منه قبل مقارنة المسافات؟',['وحدة القياس ومقياس الرسم','لون الرموز','حجم أسماء الكواكب'],0,'لا تصح المقارنة دون فهم المقياس والوحدات'],
    ['إشارة العودة','تصل ثلاث إشارات بتأخيرات مختلفة بسبب المسافة.','كيف تقدر زمن الذهاب والعودة؟',['تجمع زمن الذهاب وزمن العودة','تستخدم زمن إشارة واحدة فقط','تطرح المسافة من التردد'],0,'زمن الاتصال يتضمن رحلة الإشارة في الاتجاهين'],
    ['بوابة الأطياف','تتوافق ثلاثة قياسات مستقلة على هدف واحد.','ما الذي يجعل الاستنتاج أقوى؟',['تقارب أدلة مستقلة معروفة الحدود','كثرة التخمينات','إهمال القياس المخالف دون تفسير'],0,'تقارب الأدلة المستقلة يدعم الاستنتاج مع بقاء حدود القياس']
  ],'بوابة العودة')
);
function loadSave(){
  try{
    const current=localStorage.getItem(SAVE_KEY);
    if(current)return JSON.parse(current);
    // One-way migration preserves v6.0 progress and inventory.
    const legacy=localStorage.getItem('dabt-pro-phaser-v90')||localStorage.getItem('dabt-pro-phaser-v80')||localStorage.getItem('dabt-pro-phaser-v70')||localStorage.getItem('dabt-pro-phaser-v60');
    const data=legacy?JSON.parse(legacy):{};
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
    return data;
  }catch{return {}}
}
function save(data){localStorage.setItem(SAVE_KEY,JSON.stringify(data));}

class BootScene extends Phaser.Scene {
  constructor(){super('Boot')}
  preload(){
    this.load.spritesheet('hero','./assets/characters/explorer-spritesheet.png',{frameWidth:128,frameHeight:160});
    ['island','cave','observatory','moon','mars','neptune'].forEach(k=>this.load.image(`bg-${k}`,`./assets/backgrounds/${k}-parallax.svg`));
    ["coast", "cave", "observatory", "wreck", "forest", "lighthouse", "moon", "mars", "ice", "venus", "jupiter", "saturn", "uranus", "neptune", "edge"].forEach(k=>this.load.image(`art-${k}`,`./assets/backgrounds/${k}-handdrawn.svg`));
  }
  create(){
    this.anims.create({key:'hero-idle',frames:this.anims.generateFrameNumbers('hero',{start:0,end:3}),frameRate:5,repeat:-1});
    this.anims.create({key:'hero-walk',frames:this.anims.generateFrameNumbers('hero',{start:2,end:7}),frameRate:10,repeat:-1});
    this.scene.start('Menu');
  }
}

class MenuScene extends Phaser.Scene {
  constructor(){super('Menu')}
  create(){
    const g=this.add.graphics(); g.fillGradientStyle(0x294b4b,0x294b4b,0x172e3d,0x172e3d,1);g.fillRect(0,0,W,H);
    this.add.text(W/2,105,'ضبط دماغك PRO',{fontFamily:'Tahoma',fontSize:54,color:palette.cream,bold:true}).setOrigin(.5);
    this.add.text(W/2,165,'مغامرتان مرسومتان يدوياً · محرك Phaser',{fontFamily:'Tahoma',fontSize:22,color:'#e5c88e'}).setOrigin(.5);
    this.add.text(W/2,260,'اختر رحلتك',{fontFamily:'Tahoma',fontSize:28,color:'#fff4d8'}).setOrigin(.5);
    this.makeCard(380,430,'جزيرة الكنز','استكشف الشاطئ واكشف سر الأطلس','island');
    this.makeCard(900,430,'رحلة الكواكب','انطلق إلى القمر واختبر فهمك للفضاء','planet');
    this.add.text(W/2,665,'الحركة: ← → أو A / D · القفز: Space · التفاعل: E · القدرة الخاصة: Shift · دفتر الرحلة: J',{fontFamily:'Tahoma',fontSize:17,color:'#d7d5bd'}).setOrigin(.5);
  }
  makeCard(x,y,title,desc,world){
    const c=this.add.container(x,y); const bg=this.add.graphics(); bg.fillStyle(0xf4e7c8,1);bg.fillRoundedRect(-205,-125,410,250,24);bg.lineStyle(5,0xe6b65c,1);bg.strokeRoundedRect(-205,-125,410,250,24);c.add(bg);
    c.add(this.add.text(0,-58,title,{fontFamily:'Tahoma',fontSize:34,color:'#243b3b',bold:true}).setOrigin(.5));
    c.add(this.add.text(0,0,desc,{fontFamily:'Tahoma',fontSize:19,color:'#4e6257',align:'center',wordWrap:{width:340}}).setOrigin(.5));
    const btn=this.add.rectangle(0,77,190,54,0x537c58).setInteractive({useHandCursor:true});c.add(btn);
    c.add(this.add.text(0,77,'ابدأ المغامرة',{fontFamily:'Tahoma',fontSize:22,color:'#fff4d8',bold:true}).setOrigin(.5));
    btn.on('pointerover',()=>btn.setFillStyle(0x719467));btn.on('pointerout',()=>btn.setFillStyle(0x537c58));btn.on('pointerdown',()=>this.scene.start('World',{world}));
  }
}

class WorldScene extends Phaser.Scene {
  constructor(){super('World')}
  init(data){this.saveData=loadSave();this.worldKey=data.world||'island';this.areaIndex=data.area||0;this.base=worlds[this.worldKey];this.cfg={title:this.base.title,...this.base.areas[this.areaIndex]};this.artKey=['coast','cave','observatory','wreck','forest','lighthouse','moon','mars','ice','venus','jupiter','saturn','uranus','neptune','edge'][this.worldKey==='island'?this.areaIndex:this.areaIndex+6];this.switchKey=`${this.worldKey}-${this.areaIndex}-switches`;this.switchState=new Set(this.saveData[this.switchKey]||[]);this.secretKey=`${this.worldKey}-${this.areaIndex}-secret-found`;this.secretFound=!!this.saveData[this.secretKey];this.checkpoint={x:100,y:520};this.hitCooldown=false;this.toolCharges=this.saveData[`${this.worldKey}-tool-charges`]??3;this.mechanismSolved=!!this.saveData[`${this.worldKey}-${this.areaIndex}-mechanism`];this.progressKey=`${this.worldKey}-${this.areaIndex}`;this.solved=new Set(this.saveData[this.progressKey]?.solved||[]);this.relics=new Set(this.saveData[`${this.worldKey}-relics`]||[]);this.activePuzzle=null;this.interactLock=false;this.questKey=`${this.worldKey}-sidequest`;this.quest=this.saveData[this.questKey]||{status:'new'};this.toolKey=`${this.worldKey}-tool`;this.tool=this.saveData[this.toolKey]||null;this.guardianMemoryKey=`${this.worldKey}-guardian-memory`;this.bossKey=`${this.worldKey}-guardian-defeated`;this.bossBattle=null;}
  create(){
    const c=this.cfg;
    this.add.image(W/2,H/2,`art-${this.artKey}`).setDisplaySize(W,H).setScrollFactor(.12);
    this.add.rectangle(W/2,40,W,80,0x203d3d,.82).setScrollFactor(0);
    this.add.text(28,20,c.title,{fontFamily:'Tahoma',fontSize:28,color:'#fff4d8',bold:true}).setOrigin(0,0).setScrollFactor(0);
    this.add.text(28,55,c.subtitle,{fontFamily:'Tahoma',fontSize:15,color:'#e6c98f'}).setOrigin(0,0).setScrollFactor(0);
    this.physics.world.setBounds(0,0,W,H);
    this.platforms=this.physics.add.staticGroup();
    c.platforms.forEach(([x,y,w,h])=>{const p=this.add.rectangle(x+w/2,y+h/2,w,h,c.ground).setStrokeStyle(3,0x3e4b3c);this.platforms.add(p)});
    this.hero=this.physics.add.sprite(100,520,'hero',0).setScale(.78).setDepth(5);this.hero.setCollideWorldBounds(true);this.hero.body.setSize(48,100).setOffset(40,48);this.hero.setBounce(0.02);this.checkpoint=this.saveData[`${this.worldKey}-${this.areaIndex}-checkpoint`]||{x:100,y:520};this.hero.setPosition(this.checkpoint.x,this.checkpoint.y);
    this.physics.add.collider(this.hero,this.platforms);
    // Animated traversal: a moving platform and a timed hazard lane.
    this.movingPlatform=this.add.rectangle(660,360,150,20,0xc49b5b).setStrokeStyle(3,0xffe4a8);
    this.physics.add.existing(this.movingPlatform,true);
    this.physics.add.collider(this.hero,this.movingPlatform);
    this.tweens.add({targets:this.movingPlatform,x:860,duration:2600,yoyo:true,repeat:-1,ease:'Sine.InOut',onUpdate:()=>{this.movingPlatform.body.updateFromGameObject();}});
    this.hazard=this.add.rectangle(1040,600,110,24,0xb95f43).setStrokeStyle(3,0xffd5a6).setDepth(4);
    this.physics.add.existing(this.hazard,true);
    this.tweens.add({targets:this.hazard,alpha:.18,duration:700,yoyo:true,repeat:-1,onUpdate:()=>this.hazard.body.updateFromGameObject()});
    this.campaignConsequence=getCampaignConsequence(this.saveData[`${this.worldKey}-ending`]);
    this.areaConsequence=resolveAreaConsequence({ending:this.campaignConsequence?.id,hazardActive:true,toolCharges:this.toolCharges});
    if(this.campaignConsequence?.id==='restore'){
      this.hazard.body.enable=false;this.hazard.setVisible(false);
      this.platforms.getChildren().forEach(platform=>platform.setStrokeStyle(3,0x78a987));
    }
    this.physics.add.overlap(this.hero,this.hazard,()=>{if(this.hazard.body.enable)this.takeHazardHit();},null,this);
    this.checkpointMarker=this.add.star(160,610,4,10,20,0x78b7a0).setStrokeStyle(3,0xe6f2cb).setDepth(6);
    this.checkpointMarker.setInteractive({useHandCursor:true});
    this.checkpointMarker.on('pointerdown',()=>this.activateCheckpoint());
    this.environmentDevice=this.add.container(1120,590).setDepth(7);
    this.environmentDevice.add(this.add.circle(0,0,25,0x2f6470).setStrokeStyle(4,0xe6b65c));
    this.environmentDevice.add(this.add.text(0,0,'⌘',{fontFamily:'Tahoma',fontSize:26,color:'#fff4d8'}).setOrigin(.5));
    this.add.text(1120,550,'جهاز البيئة',{fontFamily:'Tahoma',fontSize:13,color:'#fff4d8'}).setOrigin(.5);
    this.physics.add.overlap(this.hero,this.environmentDevice,()=>{this.deviceNear=true;},null,this);

    // V10: a persistent elemental seal makes each area contribute to a world-wide chain.
    this.elementOrder=['water','light','energy','fire'];
    this.elementTargets={water:'hot-surface',light:'mirror',energy:'dormant-machine',fire:'frozen-lock'};
    this.requiredElement=this.elementOrder[this.areaIndex%this.elementOrder.length];
    this.elementFlag=`${this.worldKey}-${this.areaIndex}-element-seal`;
    this.elementSolved=!!this.saveData[this.elementFlag];
    this.elementAltar=this.add.container(760,590).setDepth(7);
    this.elementAltar.add(this.add.circle(0,0,29,this.elementSolved?0x6b9b68:0x394f67).setStrokeStyle(4,0xe6b65c));
    this.elementAltar.add(this.add.text(0,-1,this.elementSolved?'✦':'◇',{fontFamily:'Tahoma',fontSize:27,color:'#fff4d8'}).setOrigin(.5));
    this.elementAltar.add(this.add.text(0,-48,'ختم العناصر',{fontFamily:'Tahoma',fontSize:13,color:'#fff4d8',backgroundColor:'#243b3b',padding:4}).setOrigin(.5));
    this.elementAltar.setInteractive?.();

    // V10: simple patrol-to-chase enemy with a clear proximity trigger and collision response.
    this.enemy={minX:790,maxX:1080,direction:1,speed:88,alert:false,state:'patrol',lastHeard:null,nextAttackAt:0,hp:2,stunnedUntil:0,slowedUntil:0,disabledUntil:0,defeated:false};
    this.enemyBody=this.add.rectangle(930,585,42,58,0x8b5548).setStrokeStyle(3,0x2b3338).setDepth(6);
    this.physics.add.existing(this.enemyBody);
    this.enemyBody.body.setAllowGravity(false);this.enemyBody.body.setImmovable(true);
    this.enemyMark=this.add.circle(930,553,7,0xe6b65c).setDepth(7);
    this.physics.add.overlap(this.hero,this.enemyBody,()=>{if(!this.enemy.defeated)this.takeHazardHit();},null,this);
    const enemyDefeatFlag=`${this.worldKey}-${this.areaIndex}-enemy-defeated`;
    if(this.saveData[enemyDefeatFlag]){this.enemy.defeated=true;this.enemy.hp=0;this.enemy.state='defeated';this.enemyBody.setVisible(false);this.enemyBody.body.enable=false;this.enemyMark.setVisible(false);}

    this.makeGuideNPC();
    this.cursors=this.input.keyboard.createCursorKeys();this.keys=this.input.keyboard.addKeys('A,D,W,E,J,I,T,SPACE,ESC,SHIFT,ONE,TWO,THREE,FOUR');
    this.markers=[];
    c.clues.forEach((p,i)=>{const done=this.solved.has(i);const m=this.add.container(p.x,p.y);const orb=this.add.circle(0,0,23,done?0x6b9b68:0xe6b65c).setStrokeStyle(4,0xfff0c8);const txt=this.add.text(0,-2,done?'✓':'?',{fontFamily:'Tahoma',fontSize:25,color:'#263b36',bold:true}).setOrigin(.5);m.add([orb,txt]);m.setDepth(4);this.markers.push({data:p,container:m,index:i,done});});
    this.pickups=[];
    const relicNames=RELICS[this.worldKey];
    const pickupPositions=[[475,585],[735,585],[1010,585]];
    relicNames.forEach((name,i)=>{
      const id=`${this.worldKey}-${this.areaIndex}-${i}`;
      if(this.relics.has(id))return;
      const [x,y]=pickupPositions[i];
      const gem=this.add.container(x,y).setDepth(7);
      gem.add(this.add.star(0,0,5,9,19,0xe6b65c).setStrokeStyle(3,0xfff4d8));
      gem.add(this.add.circle(0,0,4,0xfff4d8));
      gem.add(this.add.text(0,-31,'✦',{fontFamily:'Tahoma',fontSize:18,color:'#fff4d8'}).setOrigin(.5));
      this.pickups.push({id,name,x,y,container:gem});
    });
    // Two environmental sigils form a local exploration puzzle in every area.
    this.switches=[];
    [[430,600],[850,600]].forEach(([x,y],i)=>{
      const active=this.switchState.has(i);
      const node=this.add.container(x,y).setDepth(6);
      node.add(this.add.circle(0,0,21,active?0x72aa83:0x354e59).setStrokeStyle(4,0xe6b65c));
      node.add(this.add.text(0,-1,active?'✦':'◇',{fontFamily:'Tahoma',fontSize:25,color:'#fff4d8'}).setOrigin(.5));
      this.switches.push({x,y,index:i,active,container:node});
    });
    this.secretBridge=null;
    if(this.switchState.size===2)this.openSecretBridge(false);
    if(this.secretFound&&this.secretCache)this.secretCache.setVisible(false);
    this.exitMarker=this.add.container(c.exit.x,c.exit.y);this.exitMarker.add([this.add.rectangle(0,0,80,120,0x5c7890,.85).setStrokeStyle(5,0xe6b65c),this.add.text(0,-5,'بوابة',{fontFamily:'Tahoma',fontSize:18,color:'#fff4d8'}).setOrigin(.5)]);
    this.hud=this.add.text(W-28,24,this.progressText(),{fontFamily:'Tahoma',fontSize:19,color:'#fff4d8',align:'right'}).setOrigin(1,0).setScrollFactor(0);
    this.relicHud=this.add.text(W-28,55,`المقتنيات ${this.relics.size}/${RELICS[this.worldKey].length*this.base.areas.length}`,{fontFamily:'Tahoma',fontSize:15,color:'#f4d58d',align:'right'}).setOrigin(1,0).setScrollFactor(0);
    this.questHud=this.add.text(W-28,78,this.tool?`الأداة: ${this.tool}`:'مهمة جانبية: تحدث مع الدليل',{fontFamily:'Tahoma',fontSize:13,color:'#c9d9c8',align:'right'}).setOrigin(1,0).setScrollFactor(0);
    this.prompt=this.add.text(W/2,H-35,'استكشف المنطقة · فعّل علامتي البيئة · E تفاعل · J دفتر الرحلة',{fontFamily:'Tahoma',fontSize:19,color:'#243b3b',backgroundColor:'#f4e7c8',padding:{x:16,y:9}}).setOrigin(.5).setScrollFactor(0);
    this.input.keyboard.on('keydown-ESC',()=>{if(this.mechanismItems)this.closeMechanism();else if(this.activePuzzle)this.closePuzzle();else if(this.overlayItems)this.closeOverlay();else this.scene.start('Menu')});
    this.makeTouchControls();
    this.cameras.main.setBounds(0,0,W,H);this.cameras.main.startFollow(this.hero,true,.08,.08);
  }
  progressText(){return `المنطقة ${this.areaIndex+1}/${this.base.areas.length} · الأختام ${this.solved.size}/${this.cfg.clues.length}`}
  makeTouchControls(){
    const mk=(x,label,key)=>{const b=this.add.circle(x,H-86,34,0x243b3b,.72).setStrokeStyle(2,0xf4e7c8).setScrollFactor(0).setInteractive();this.add.text(x,H-86,label,{fontFamily:'Tahoma',fontSize:26,color:'#fff4d8'}).setOrigin(.5).setScrollFactor(0);b.on('pointerdown',()=>{this.touchKey=key;if(key==='jump')this.touchJumpPressed=true});b.on('pointerup',()=>this.touchKey=null);b.on('pointerout',()=>this.touchKey=null)};
    mk(70,'◀','left');mk(150,'▶','right');mk(270,'م','water');mk(345,'ض','light');mk(420,'ط','energy');mk(495,'ن','fire');mk(W-205,'✦','dash');mk(W-125,'▲','jump');mk(W-55,'E','use');
  }
  update(){
    if(this.activePuzzle||this.overlayItems)return;
    if(this.bossBattle&&!this.bossBattle.finished){
      const bossElementKeys=[['water',this.keys.ONE],['light',this.keys.TWO],['energy',this.keys.THREE],['fire',this.keys.FOUR]];
      for(const [name,key] of bossElementKeys){if(Phaser.Input.Keyboard.JustDown(key))this.selectedElement=name;}
      if(['water','light','energy','fire'].includes(this.touchKey))this.selectedElement=this.touchKey;
      const left=this.cursors.left.isDown||this.keys.A.isDown||this.touchKey==='left';
      const right=this.cursors.right.isDown||this.keys.D.isDown||this.touchKey==='right';
      const jump=Phaser.Input.Keyboard.JustDown(this.cursors.space)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||Phaser.Input.Keyboard.JustDown(this.keys.W)||this.touchJumpPressed;
      if(left){this.hero.setVelocityX(-280);this.hero.setFlipX(true);this.hero.anims.play('hero-walk',true);}else if(right){this.hero.setVelocityX(280);this.hero.setFlipX(false);this.hero.anims.play('hero-walk',true);}else this.hero.setVelocityX(0);
      if(jump&&this.hero.body.blocked.down){this.hero.setVelocityY(-610);this.touchJumpPressed=false;}
      if((Phaser.Input.Keyboard.JustDown(this.keys.E)||this.touchKey==='use')&&!this.bossHitLock){this.bossHitLock=true;if(this.bossBattle.exposed)this.damageBoss(this.selectedElement||'water');else if(this.bossBattle.attackLock&&this.selectedElement==='energy')this.interruptBossAttack();this.time.delayedCall(350,()=>this.bossHitLock=false);}
      return;
    }
    const left=this.cursors.left.isDown||this.keys.A.isDown||this.touchKey==='left';const right=this.cursors.right.isDown||this.keys.D.isDown||this.touchKey==='right';const jump=Phaser.Input.Keyboard.JustDown(this.cursors.space)||Phaser.Input.Keyboard.JustDown(this.keys.SPACE)||Phaser.Input.Keyboard.JustDown(this.keys.W)||this.touchJumpPressed;
    if(left){this.hero.setVelocityX(-250);this.hero.setFlipX(true);this.hero.anims.play('hero-walk',true)}else if(right){this.hero.setVelocityX(250);this.hero.setFlipX(false);this.hero.anims.play('hero-walk',true)}else{this.hero.setVelocityX(0);this.hero.anims.play('hero-idle',true)}
    if(this.touchKey==='dash'&&!this.touchDashLock){this.touchDashLock=true;if(this.worldKey==='island'){this.hero.setVelocityX(this.hero.flipX?-520:520);this.hero.setVelocityY(-90);}else{this.hero.setVelocityY(Math.max(this.hero.body.velocity.y-260,-420));}this.emitNoise(430,'اندفاع');this.time.delayedCall(650,()=>this.touchDashLock=false);}
    if(jump&&this.hero.body.blocked.down){this.hero.setVelocityY(this.worldKey==='planet'?-660:-560);this.touchJumpPressed=false;this.emitNoise(220,'قفزة');}
    // Distinct movement identity: island tide-burst; planetary low-gravity drift.
    if(Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)){
      if(this.worldKey==='island'){this.hero.setVelocityX(this.hero.flipX?-520:520);this.hero.setVelocityY(-90);}
      else {this.hero.setVelocityY(Math.max(this.hero.body.velocity.y-260,-420));}
      this.emitNoise(430,'اندفاع');
    }
    if(this.worldKey==='planet'&&this.hero.body.velocity.y>0)this.hero.setVelocityY(Math.min(this.hero.body.velocity.y,360));
    const near=this.markers.find(m=>!m.done&&Phaser.Math.Distance.Between(this.hero.x,this.hero.y,m.data.x,m.data.y)<88);
    const pickupNear=this.pickups.find(p=>Phaser.Math.Distance.Between(this.hero.x,this.hero.y,p.x,p.y)<76);
    const npcNear=Phaser.Math.Distance.Between(this.hero.x,this.hero.y,this.guide.x,this.guide.y)<92;
    const switchNear=this.switches.find(q=>Phaser.Math.Distance.Between(this.hero.x,this.hero.y,q.x,q.y)<92&&!q.active);
    const cacheNear=this.secretCache&&!this.secretFound&&Phaser.Math.Distance.Between(this.hero.x,this.hero.y,640,520)<88;
    const deviceNear=Phaser.Math.Distance.Between(this.hero.x,this.hero.y,1120,590)<88;
    const checkpointNear=Phaser.Math.Distance.Between(this.hero.x,this.hero.y,160,610)<70;
    const exitNear=Phaser.Math.Distance.Between(this.hero.x,this.hero.y,this.cfg.exit.x,this.cfg.exit.y)<100;
    const altarNear=Phaser.Math.Distance.Between(this.hero.x,this.hero.y,760,590)<100;
    const enemyNear=!this.enemy.defeated&&Phaser.Math.Distance.Between(this.hero.x,this.hero.y,this.enemyBody.x,this.enemyBody.y)<118;
    const elementKeys=[['water',this.keys.ONE],['light',this.keys.TWO],['energy',this.keys.THREE],['fire',this.keys.FOUR]];
    for(const [name,key] of elementKeys){if(Phaser.Input.Keyboard.JustDown(key))this.selectedElement=name;}
    if(['water','light','energy','fire'].includes(this.touchKey))this.selectedElement=this.touchKey;
    // V12: patrol / investigate sound / pursue / telegraph / attack / recover.
    this.updateEnemyAI();
    if(altarNear){
      const chosen=this.keys.ONE.isDown||this.touchKey==='water'?'water':this.keys.TWO.isDown||this.touchKey==='light'?'light':this.keys.THREE.isDown||this.touchKey==='energy'?'energy':this.keys.FOUR.isDown||this.touchKey==='fire'?'fire':null;
      if(chosen&&!this.elementSolved&&!this.elementUseLock){this.elementUseLock=true;this.time.delayedCall(350,()=>this.elementUseLock=false);this.applyElementToSeal(chosen);}
    }
    this.prompt.setText(enemyNear?`E · استخدم ${this.elementArabic(this.selectedElement||'light')} على الحارس`:near?`E · ${near.data.title}`:pickupNear?`E · التقط ${pickupNear.name}`:npcNear?'E · تحدث مع دليل الرحلة':switchNear?`E · فعّل علامة ${switchNear.index+1}`:cacheNear?'E · خذ جوهرة المسار السري':deviceNear?'E · شغّل جهاز البيئة':altarNear?(this.elementSolved?'ختم العناصر مكتمل':`1 ماء · 2 ضوء · 3 طاقة · 4 نار (المطلوب: ${this.elementRequiredLabel()})`):checkpointNear?'E · ثبّت نقطة العودة':exitNear?'البوابة · اقترب بعد جمع الأختام':'استكشف المنطقة · فعّل علامتي البيئة · E تفاعل · J دفتر الرحلة');
    if(Phaser.Input.Keyboard.JustDown(this.keys.J)||Phaser.Input.Keyboard.JustDown(this.keys.I))this.openJournal();
    if(Phaser.Input.Keyboard.JustDown(this.keys.T))this.useFieldTool(near);
    if((Phaser.Input.Keyboard.JustDown(this.keys.E)||this.touchKey==='use')&&!this.interactLock){this.interactLock=true;this.time.delayedCall(220,()=>this.interactLock=false);if(enemyNear&&this.selectedElement)this.useElementOnEnemy(this.selectedElement);else if(near)this.openPuzzle(near);else if(pickupNear)this.collectRelic(pickupNear);else if(npcNear)this.openGuideDialog();else if(switchNear)this.activateSwitch(switchNear);else if(cacheNear)this.collectSecretCache();else if(deviceNear)this.activateEnvironmentDevice();else if(altarNear)this.showElementHint();else if(checkpointNear)this.activateCheckpoint();else if(exitNear)this.tryExit()}
  }
  emitNoise(radius,label){
    this.enemy.lastHeard={x:this.hero.x,y:this.hero.y,radius,at:this.time.now,label};
    const ring=this.add.circle(this.hero.x,this.hero.y,12,0xe6b65c,.18).setStrokeStyle(3,0xfff4d8).setDepth(12);
    this.tweens.add({targets:ring,scale:radius/12,alpha:0,duration:420,ease:'Sine.Out',onComplete:()=>ring.destroy()});
  }
  updateEnemyAI(){
    const e=this.enemy, now=this.time.now;
    if(e.defeated){this.enemyBody.setVisible(false);this.enemyMark.setVisible(false);return;}
    if(now<e.stunnedUntil||now<e.disabledUntil){this.enemyBody.body.setVelocityX(0);this.enemyMark.setFillStyle(0x9de2d0);return;}
    const dx=this.hero.x-this.enemyBody.x, dy=this.hero.y-this.enemyBody.y;
    const distance=Math.hypot(dx,dy);
    const facingPlayer=(dx===0)||(Math.sign(dx)===e.direction);
    const visible=distance<285&&Math.abs(dy)<115&&facingPlayer;
    const heard=e.lastHeard&&now-e.lastHeard.at<1900&&Math.hypot(e.lastHeard.x-this.enemyBody.x,e.lastHeard.y-this.enemyBody.y)<e.lastHeard.radius;
    const heardPosition=heard?e.lastHeard:null;
    const next=stepEnemyAI({state:e.state,visible,heard:!!heard,heardX:heardPosition?.x??null,heardY:heardPosition?.y??null,enemyX:this.enemyBody.x,enemyY:this.enemyBody.y,playerX:this.hero.x,playerY:this.hero.y,lastKnown:e.lastKnown||null,now,recoverUntil:e.recoverUntil||0,attackUntil:e.attackUntil||0,searchUntil:e.searchUntil||0});
    e.state=next.state;e.alert=next.state!=='patrol';e.lastKnown=next.lastKnown||e.lastKnown;
    if(next.direction)e.direction=next.direction;
    if(next.state==='patrol'){
      if(this.enemyBody.x<=e.minX)e.direction=1;
      if(this.enemyBody.x>=e.maxX)e.direction=-1;
      this.enemyBody.body.setVelocityX(e.direction*(now<e.slowedUntil?e.speed*.35:e.speed));
    }else if(next.state==='investigate'){
      const target=e.lastKnown?.x??this.hero.x, diff=target-this.enemyBody.x;
      this.enemyBody.body.setVelocityX(Math.abs(diff)>24?Math.sign(diff)*112:0);
      if(Math.abs(diff)<=24){e.state='search';e.searchUntil=now+700;e.lastHeard=null;}
    }else if(next.state==='search'){
      this.enemyBody.body.setVelocityX(0);
      if(now>(e.searchUntil||0)){e.state='patrol';e.lastHeard=null;e.lastKnown=null;}
    }else if(next.state==='chase'){
      this.enemyBody.body.setVelocityX(Math.sign(dx)*(now<e.slowedUntil?55:158));
      if(distance<92&&now>=(e.nextAttackAt||0)){
        e.state='telegraph';e.attackUntil=now+520;this.enemyBody.body.setVelocityX(0);
        this.enemyMark.setFillStyle(0xe78b68);
        this.time.delayedCall(520,()=>{
          if(!this.scene.isActive()||this.enemy.state!=='telegraph')return;
          const d=Phaser.Math.Distance.Between(this.hero.x,this.hero.y,this.enemyBody.x,this.enemyBody.y);
          if(d<112)this.takeHazardHit();
          this.enemy.state='recover';this.enemy.recoverUntil=this.time.now+850;this.enemy.nextAttackAt=this.time.now+1450;
          this.enemyMark.setFillStyle(0xe6b65c);
        });
      }
    }else if(next.state==='telegraph'||next.state==='recover'){
      this.enemyBody.body.setVelocityX(0);
    }
    this.enemyMark.setPosition(this.enemyBody.x,this.enemyBody.y-34);
    this.enemyMark.setFillStyle(e.state==='telegraph'?0xe78b68:e.state==='chase'?0xd65d45:e.state==='investigate'?0x78b7a0:0xe6b65c);
  }

  elementArabic(name){
    return ({water:'الماء',light:'الضوء',energy:'الطاقة',fire:'النار'})[name]||'عنصر';
  }
  useElementOnEnemy(element){
    const e=this.enemy, now=this.time.now;
    const result=resolveElementalCombat({element,hp:e.hp,defeated:e.defeated});
    if(!result.ok){this.showOverlay('لم يتأثر الحارس',result.reason,'متابعة');return;}
    if(element==='water')e.slowedUntil=now+4200;
    if(element==='light')e.stunnedUntil=now+1900;
    if(element==='energy')e.disabledUntil=now+2600;
    if(element==='fire')e.hp=result.hp;
    if(result.defeated){
      e.defeated=true;e.state='defeated';e.hp=0;
      this.saveData[`${this.worldKey}-${this.areaIndex}-enemy-defeated`]=true;save(this.saveData);
      this.enemyBody.body.setVelocityX(0);this.enemyBody.body.enable=false;this.enemyBody.setFillStyle(0x4d5960);this.enemyBody.setVisible(false);this.enemyMark.setVisible(false);
      this.showOverlay('تغلبت على الحارس',`استخدمت ${this.elementArabic(element)} لاستغلال نقطة ضعف الحارس. أصبح الممر أكثر أماناً.`,'متابعة');
      return;
    }
    this.enemyMark.setFillStyle(element==='light'?0xf5e9a8:element==='water'?0x69b9d0:element==='energy'?0x9de2d0:0xe78b68);
    const feedback={
      water:'الماء أبطأ حركة الحارس. استغل الوقت لعبور المنطقة.',
      light:'الضوء أربك الحارس وكشف حركته للحظات.',
      energy:'الطاقة عطلت آلية الحارس مؤقتاً.',
      fire:`النار أصابت الحارس. بقيت له ${e.hp} نقطة قوة.`
    };
    this.showOverlay('تفاعل عنصري ناجح',feedback[element],'متابعة');
  }

  elementRequiredLabel(){return ({water:'الماء',light:'الضوء',energy:'الطاقة',fire:'النار'})[this.requiredElement];}
  showElementHint(){
    const prior=this.areaIndex>0?this.saveData[`${this.worldKey}-${this.areaIndex-1}-element-seal`]:true;
    const text=prior?`الختم يحتاج ${this.elementRequiredLabel()}. اختر العنصر بالأرقام 1–4 وأنت قرب الختم.`:'الختم ينتظر صدى المنطقة السابقة. ارجع وأكمل ختمها أولاً.';
    this.showOverlay('ختم العناصر',text,'فهمت');
  }
  applyElementToSeal(element){
    const prior=this.areaIndex>0?this.saveData[`${this.worldKey}-${this.areaIndex-1}-element-seal`]:true;
    if(!prior){this.showOverlay('السلسلة غير مكتملة','هذا الختم مرتبط بختم المنطقة السابقة. أكمل التفاعل هناك أولاً.','متابعة');return;}
    const target=this.elementTargets[this.requiredElement];
    const result=resolveElementInteraction({element,target,state:{}});
    if(!result.ok){this.showOverlay('لم يستجب الختم',`العنصر ${({water:'الماء',light:'الضوء',energy:'الطاقة',fire:'النار'})[element]} لا يطابق آلية هذه المنطقة. اقرأ العلامة وجرب عنصراً آخر.`,'حاول مجدداً');return;}
    this.elementSolved=true;this.saveData[this.elementFlag]=true;save(this.saveData);
    this.elementAltar.list[0].setFillStyle(0x6b9b68);this.elementAltar.list[1].setText('✦');
    this.showOverlay('استجاب ختم العناصر',`تفاعل ${this.elementRequiredLabel()} مع الآلية وأرسل إشارة إلى المنطقة التالية. أصبحت سلسلة العالم أقوى.`,'متابعة');
  }
  takeHazardHit(){
    if(this.hitCooldown||this.overlayItems||this.activePuzzle)return;
    this.hitCooldown=true;this.hero.setTint(0xe78b68);this.hero.setVelocityY(-300);
    this.time.delayedCall(250,()=>this.hero.clearTint());
    this.time.delayedCall(900,()=>{this.hero.setPosition(this.checkpoint.x,this.checkpoint.y);this.hero.setVelocity(0,0);this.hitCooldown=false;});
  }
  activateCheckpoint(){
    this.checkpoint={x:this.checkpointMarker.x,y:this.checkpointMarker.y-70};
    this.saveData[`${this.worldKey}-${this.areaIndex}-checkpoint`]=this.checkpoint;save(this.saveData);
    this.checkpointMarker.setFillStyle(0x9dd7a8);
    this.showOverlay('نقطة عودة ثبتت','إذا لامست منطقة الخطر ستعود إلى هذه النقطة بدلاً من بداية المنطقة.','متابعة');
  }
  activateEnvironmentDevice(){
    if(!this.tool){this.showOverlay('الجهاز غير متزامن','تحتاج إلى أداة الرحلة التي تحصل عليها من المهمة الجانبية لتشغيل هذا الجهاز.','فهمت');return;}
    if(this.mechanismSolved){this.showOverlay('الجهاز يعمل','لقد فعّلت هذا الجهاز مسبقاً. المسار البيئي أصبح مستقراً.','متابعة');return;}
    if(this.toolCharges<=0){this.showOverlay('نفدت الشحنات','لا توجد شحنات كافية لتشغيل الجهاز في هذه المنطقة.','متابعة');return;}
    this.toolCharges--;
    this.mechanismSolved=true;
    this.saveData[`${this.worldKey}-tool-charges`]=this.toolCharges;
    this.saveData[`${this.worldKey}-${this.areaIndex}-mechanism`]=true;save(this.saveData);
    // Tool action changes the level: lower a hazard gate and create a shortcut.
    this.tweens.add({targets:this.hazard,y:760,alpha:0,duration:900,ease:'Cubic.In',onUpdate:()=>this.hazard.body.updateFromGameObject()});
    const shortcut=this.add.rectangle(970,500,190,18,0x78b7a0).setStrokeStyle(3,0xe6f2cb).setDepth(3);
    this.physics.add.existing(shortcut,true);this.platforms.add(shortcut);
    this.showOverlay('تغيّرت البيئة','استخدمت أداة الرحلة لتعديل تردد الجهاز. انطفأ مسار الخطر وظهر ممر اختصار. بقيت شحنات: '+this.toolCharges,'استمر');
  }
  collectSecretCache(){
    this.secretFound=true;this.saveData[this.secretKey]=true;save(this.saveData);
    this.secretCache?.setVisible(false);
    this.showOverlay('جوهرة المسار السري','وجدت جوهرة خفية لم تكن ضمن المقتنيات العادية. سُجل اكتشافك في دفتر الرحلة.','احتفظ بها');
  }
  activateSwitch(sw){
    sw.active=true;this.switchState.add(sw.index);
    sw.container.list[0].setFillStyle(0x72aa83);sw.container.list[1].setText('✦');
    this.saveData[this.switchKey]=[...this.switchState];save(this.saveData);
    if(this.switchState.size===2){
      this.openSecretBridge(true);
      this.showOverlay('استجابت المنطقة','تزامنت العلامتان وظهر جسر خفي. لقد كشفت مساراً جانبياً ومكافأة استكشاف.','اعبر الجسر');
    }else this.showOverlay('علامة البيئة الأولى','سمعت صدى عميقاً من جهة أخرى. ابحث عن العلامة الثانية في هذه المنطقة.','متابعة');
  }
  openSecretBridge(animate=true){
    if(this.secretBridge)return;
    const x=640,y=575;
    const bridge=this.add.rectangle(x,y,300,20,0xd6b16a).setStrokeStyle(3,0xffedc1).setDepth(3);
    this.physics.add.existing(bridge,true);this.platforms.add(bridge);this.secretBridge=bridge;
    const cache=this.add.container(640,520).setDepth(8);
    cache.add(this.add.star(0,0,6,12,28,0xe6b65c).setStrokeStyle(4,0xfff4d8));
    cache.add(this.add.text(0,-45,'سر مكشوف',{fontFamily:'Tahoma',fontSize:16,color:'#fff4d8',backgroundColor:'#243b3b',padding:5}).setOrigin(.5));
    this.secretCache=cache;
    if(animate){bridge.setAlpha(0);this.tweens.add({targets:bridge,alpha:1,duration:800,ease:'Sine.Out'});this.tweens.add({targets:cache,scale:1.15,yoyo:true,repeat:2,duration:300});}
  }
  collectRelic(pickup){
    this.relics.add(pickup.id);
    this.saveData[`${this.worldKey}-relics`]=[...this.relics];
    save(this.saveData);
    pickup.container.destroy();
    this.pickups=this.pickups.filter(p=>p.id!==pickup.id);
    this.relicHud.setText(`المقتنيات ${this.relics.size}/${RELICS[this.worldKey].length*this.base.areas.length}`);
    const questCount=this.relics.size;
    const questNote=this.quest.status==='active'&&questCount>=2?'\nاكتمل شرط المهمة الجانبية. عد إلى الدليل لاستلام الأداة.':'';
    this.showOverlay('أثر جديد في الرحلة',`عثرْت على: ${pickup.name}\nسُجل هذا الأثر في سجل مقتنياتك.${questNote}`,'إلى المغامرة');
  }
  makeGuideNPC(){
    this.guide={x:165,y:575};
    const g=this.add.container(this.guide.x,this.guide.y).setDepth(6);
    g.add(this.add.ellipse(0,47,62,15,0x263b36,.28));
    g.add(this.add.rectangle(0,5,36,54,0x5b7b69).setStrokeStyle(3,0x243b3b));
    g.add(this.add.circle(0,-30,22,0xd8a06c).setStrokeStyle(3,0x243b3b));
    g.add(this.add.ellipse(0,-45,54,20,0x6a4937).setStrokeStyle(3,0x243b3b));
    g.add(this.add.text(0,-82,'الدليل سالم',{fontFamily:'Tahoma',fontSize:15,color:'#fff4d8',backgroundColor:'#243b3b',padding:5}).setOrigin(.5));
  }
  openGuideDialog(){
    const count=this.relics.size;
    const toolName=this.worldKey==='island'?'بوصلة المدّ':'ماسح الأطياف';
    const baseIntro=this.worldKey==='island'
      ? 'أنا سالم، آخر من حفظ خرائط الجزيرة. لا تثق بالطريق الأقصر؛ فالأطلس يغيّر ممراته مع المدّ.'
      : 'أنا نورة، مهندسة البعثة. قراءة البيئة تسبق تشغيل الأجهزة؛ سجّل ملاحظاتك ولا تتسرع.';
    const intro=this.campaignConsequence?`${baseIntro}\n\n${this.campaignConsequence.guideEpilogue}`:baseIntro;
    if(this.quest.status==='new'){
      this.quest={status:'active',startedAt:this.areaIndex};
      this.saveData[this.questKey]=this.quest;save(this.saveData);
      this.showOverlay('مهمة جانبية: أثران مفقودان',`${intro}\nأحتاج إلى أثرين نادرين من هذه الرحلة. اجمع أي أثرين ثم عد إليّ. سأعطيك ${toolName} لتقرأ العلامات الخفية.`,'قبلت المهمة');
      return;
    }
    if(this.quest.status==='active'&&count>=2){
      this.quest={status:'complete',completedAt:this.areaIndex};
      this.tool=this.worldKey==='island'?'بوصلة المدّ':'ماسح الأطياف';
      this.saveData[this.questKey]=this.quest;this.saveData[this.toolKey]=this.tool;this.toolCharges=this.saveData[`${this.worldKey}-tool-charges`]??3;this.saveData[`${this.worldKey}-tool-charges`]=this.toolCharges;save(this.saveData);this.questHud?.setText(`الأداة: ${this.tool}`);
      this.showOverlay('اكتملت المهمة الجانبية',`أحسنت. حصلت على ${this.tool}.\nاستخدم زر T قرب أي ختم غير محلول للحصول على تلميح ميداني دون كشف الإجابة مباشرة.`,'استلام الأداة');
      return;
    }
    const status=this.quest.status==='complete'?`معك الآن ${this.tool}. اقترب من ختم غير محلول واضغط T للحصول على تلميح.`:`جمعت ${count} من الأثر. تحتاج إلى أثرين قبل العودة لاستلام ${toolName}.`;
    this.showOverlay('حديث دليل الرحلة',`${intro}\n${status}`,'متابعة');
  }
  useFieldTool(marker){
    if(!this.tool){this.prompt.setText('الأداة الميدانية تُكتسب من المهمة الجانبية · تحدث مع الدليل');return;}
    if(!marker){this.prompt.setText('اقترب من ختم غير محلول ثم اضغط T لاستخدام الأداة');return;}
    const hint=this.worldKey==='island'
      ? `الأداة: ${this.tool}. افحص كلمات الدليل أولاً: ${marker.data.intro}`
      : `الأداة: ${this.tool}. راقب الظاهرة المذكورة في الدليل: ${marker.data.intro}`;
    this.showOverlay('قراءة ميدانية',hint,'العودة إلى الاستكشاف');
  }
  openJournal(){
    const solved=this.cfg.clues.filter((c,i)=>this.solved.has(i));
    const clues=solved.length?solved.map(c=>`• ${c.title}: ${c.explain}`).join('\n'):'لم تجمع أدلة في هذه المنطقة بعد.';
    const found=this.saveData[`${this.worldKey}-relics`]||[];
    const items=found.length?found.map(id=>`✦ ${id.replace(`${this.worldKey}-`,'أثر ').replaceAll('-',' / ')}`).join('\n'):'لم تعثر على مقتنيات نادرة بعد.';
    const environmentLabel=`علامات البيئة: ${this.switchState.size}/2 · ${this.switchState.size===2?'الجسر السري مفتوح':'ابحث عن علامتين مضيئتين'} · الجوهرة: ${this.secretFound?'مكتشفة':'مخفية'}`;
    const questLabel=this.quest.status==='complete'?`مكتملة · الأداة: ${this.tool}`:this.quest.status==='active'?`قيد التنفيذ · ${Math.min(this.relics.size,2)}/2 آثار`:'لم تبدأ بعد';
    const consequenceNote=this.campaignConsequence?`\n\n${this.campaignConsequence.journalEpilogue}`:'';
    this.showOverlay('دفتر الرحلة · الأدلة والمقتنيات',`${clues}\n\nالمقتنيات:\n${items}\n\nالمهمة الجانبية: ${questLabel}\nالأداة: ${this.tool||'لا توجد'} · الشحنات: ${this.toolCharges}${consequenceNote}`,'العودة إلى المغامرة');
  }
  showOverlay(title,body,buttonLabel){
    if(this.overlayItems)return;this.physics.world.pause();
    const shade=this.add.rectangle(W/2,H/2,W,H,0x142b32,.82).setScrollFactor(0).setDepth(30);
    const panel=this.add.rectangle(W/2,H/2,760,390,0xf4e7c8).setStrokeStyle(6,0xe6b65c).setScrollFactor(0).setDepth(31);
    const h=this.add.text(W/2,215,title,{fontFamily:'Tahoma',fontSize:30,color:'#243b3b',bold:true}).setOrigin(.5).setScrollFactor(0).setDepth(32);
    const b=this.add.text(W/2,365,body,{fontFamily:'Tahoma',fontSize:21,color:'#40584e',align:'center',wordWrap:{width:650},lineSpacing:10}).setOrigin(.5).setScrollFactor(0).setDepth(32);
    const btn=this.add.rectangle(W/2,515,300,52,0x537c58).setInteractive({useHandCursor:true}).setScrollFactor(0).setDepth(32);
    const bt=this.add.text(W/2,515,buttonLabel,{fontFamily:'Tahoma',fontSize:20,color:'#fff4d8'}).setOrigin(.5).setScrollFactor(0).setDepth(33);
    btn.on('pointerdown',()=>this.closeOverlay());this.overlayItems=[shade,panel,h,b,btn,bt];
  }
  closeOverlay(){this.overlayItems?.forEach(x=>x.destroy());this.overlayItems=null;this.physics.world.resume();if(this.saveData[this.bossKey]&&this.areaIndex>=this.base.areas.length-1&&!this.saveData[this.progressKey]?.completed)this.tryExit();}
  openPuzzle(marker){
    // Two authored encounters use a mechanical interaction rather than a multiple-choice question.
    if(marker.data.title==='مرآة الحارس'){this.openMirrorMechanism(marker);return;}
    if(marker.data.title==='تروس الحارس'){this.openGearMechanism(marker);return;}
    this.activePuzzle=marker;this.physics.world.pause();this.hero.anims.pause();
    const shade=this.add.rectangle(W/2,H/2,W,H,0x142b32,.84).setScrollFactor(0).setDepth(20);
    const panel=this.add.rectangle(W/2,H/2,790,490,0xf4e7c8).setStrokeStyle(6,0xe6b65c).setScrollFactor(0).setDepth(21);
    const title=this.add.text(W/2,175,marker.data.title,{fontFamily:'Tahoma',fontSize:32,color:'#243b3b',bold:true}).setOrigin(.5).setScrollFactor(0).setDepth(22);
    const intro=this.add.text(W/2,245,marker.data.intro,{fontFamily:'Tahoma',fontSize:20,color:'#4e6257',align:'center',wordWrap:{width:690},lineSpacing:8}).setOrigin(.5).setScrollFactor(0).setDepth(22);
    const q=this.add.text(W/2,325,marker.data.question,{fontFamily:'Tahoma',fontSize:22,color:'#243b3b',bold:true,align:'center',wordWrap:{width:700}}).setOrigin(.5).setScrollFactor(0).setDepth(22);
    const items=[shade,panel,title,intro,q];
    marker.data.options.forEach((opt,i)=>{const y=405+i*62;const rect=this.add.rectangle(W/2,y,610,48,0x537c58).setInteractive({useHandCursor:true}).setScrollFactor(0).setDepth(22);const t=this.add.text(W/2,y,opt,{fontFamily:'Tahoma',fontSize:19,color:'#fff4d8'}).setOrigin(.5).setScrollFactor(0).setDepth(23);items.push(rect,t);rect.on('pointerover',()=>rect.setFillStyle(0x719467));rect.on('pointerout',()=>rect.setFillStyle(0x537c58));rect.on('pointerdown',()=>this.answerPuzzle(marker,i,items));});
    this.puzzleItems=items;
  }
  openMirrorMechanism(marker){
    this.activePuzzle=marker;this.physics.world.pause();this.hero.anims.pause();
    this.mechanismItems=[];
    const add=(o)=>{o.setScrollFactor(0).setDepth(42);this.mechanismItems.push(o);return o;};
    add(this.add.rectangle(W/2,H/2,W,H,0x142b32,.88));
    add(this.add.rectangle(W/2,H/2,820,520,0xf4e7c8).setStrokeStyle(6,0xe6b65c));
    add(this.add.text(W/2,165,'مختبر انعكاس الضوء',{fontFamily:'Tahoma',fontSize:31,color:'#243b3b',bold:true}).setOrigin(.5));
    add(this.add.text(W/2,215,'أدر المرآة حتى ينعكس الشعاع نحو الهلال. كل ضغطة تغيّر زاويتها 45°.',{fontFamily:'Tahoma',fontSize:19,color:'#4e6257'}).setOrigin(.5));
    this.mirrorAngle=0;
    const g=this.add.graphics();add(g);
    const angleText=add(this.add.text(W/2,475,'',{fontFamily:'Tahoma',fontSize:20,color:'#243b3b',bold:true}).setOrigin(.5));
    const draw=()=>{
      g.clear();
      g.lineStyle(7,0xd69b35,1);g.beginPath();g.moveTo(350,390);g.lineTo(560,390);g.strokePath();
      const reflected=-this.mirrorAngle*Math.PI/2;g.lineStyle(7,0x4b9da5,1);g.beginPath();g.moveTo(560,390);g.lineTo(560+140*Math.cos(reflected),390+140*Math.sin(reflected));g.strokePath();
      g.fillStyle(0xe6b65c,1);g.fillCircle(350,390,10);g.fillStyle(0x6b9b68,1);g.fillCircle(560,245,17);
      g.lineStyle(10,0x334d4c,1);g.beginPath();g.moveTo(560-48*Math.cos(this.mirrorAngle*Math.PI/4),390+48*Math.sin(this.mirrorAngle*Math.PI/4));g.lineTo(560+48*Math.cos(this.mirrorAngle*Math.PI/4),390-48*Math.sin(this.mirrorAngle*Math.PI/4));g.strokePath();
      angleText.setText(`زاوية المرآة: ${this.mirrorAngle*45}°`);
    };
    const rotate=add(this.add.rectangle(450,545,150,52,0x537c58).setInteractive({useHandCursor:true}));
    add(this.add.text(450,545,'تدوير 45°',{fontFamily:'Tahoma',fontSize:20,color:'#fff4d8'}).setOrigin(.5));
    rotate.on('pointerdown',()=>{this.mirrorAngle=(this.mirrorAngle+1)%8;draw();});
    const check=add(this.add.rectangle(650,545,150,52,0x537c58).setInteractive({useHandCursor:true}));
    add(this.add.text(650,545,'اختبار الشعاع',{fontFamily:'Tahoma',fontSize:20,color:'#fff4d8'}).setOrigin(.5));
    check.on('pointerdown',()=>this.finishMechanism(marker,this.mirrorAngle===1,'انعكاس الضوء يساوي زاوية السقوط زاوية الانعكاس. وجّهت الشعاع إلى الهلال.'));
    const cancel=add(this.add.text(W/2,605,'إغلاق · Esc',{fontFamily:'Tahoma',fontSize:17,color:'#6b5140'}).setOrigin(.5).setInteractive());
    cancel.on('pointerdown',()=>this.closeMechanism());draw();
  }
  openGearMechanism(marker){
    this.activePuzzle=marker;this.physics.world.pause();this.hero.anims.pause();this.mechanismItems=[];
    const add=(o)=>{o.setScrollFactor(0).setDepth(42);this.mechanismItems.push(o);return o;};
    add(this.add.rectangle(W/2,H/2,W,H,0x142b32,.88));add(this.add.rectangle(W/2,H/2,820,520,0xf4e7c8).setStrokeStyle(6,0xe6b65c));
    add(this.add.text(W/2,165,'آلية التروس المتشابكة',{fontFamily:'Tahoma',fontSize:31,color:'#243b3b',bold:true}).setOrigin(.5));
    add(this.add.text(W/2,215,'حرّك الترس الصغير حتى تتطابق العلامتان. الترس المتشابك يدور بعكس اتجاه جاره.',{fontFamily:'Tahoma',fontSize:19,color:'#4e6257'}).setOrigin(.5));
    this.gearTurn=0;const g=this.add.graphics();add(g);
    const status=add(this.add.text(W/2,485,'',{fontFamily:'Tahoma',fontSize:20,color:'#243b3b',bold:true}).setOrigin(.5));
    const draw=()=>{g.clear();const gear=(x,y,r,turn,color)=>{g.lineStyle(12,color,1);g.strokeCircle(x,y,r);for(let i=0;i<8;i++){const a=(i*Math.PI/4)+(turn*Math.PI/4);g.lineBetween(x+Math.cos(a)*(r-3),y+Math.sin(a)*(r-3),x+Math.cos(a)*(r+15),y+Math.sin(a)*(r+15));}g.fillStyle(0x334d4c,1);g.fillCircle(x,y,8);g.lineStyle(5,0xf4e7c8,1);g.lineBetween(x,y,x+Math.cos(turn*Math.PI/4)*(r-12),y+Math.sin(turn*Math.PI/4)*(r-12));};gear(500,385,72,this.gearTurn,0xb98543);gear(650,385,48,-this.gearTurn,0x5b8b91);status.setText(`موضع الترس: ${this.gearTurn} / 4`);};
    const turn=add(this.add.rectangle(470,545,150,52,0x537c58).setInteractive({useHandCursor:true}));add(this.add.text(470,545,'حرّك الترس',{fontFamily:'Tahoma',fontSize:20,color:'#fff4d8'}).setOrigin(.5));turn.on('pointerdown',()=>{this.gearTurn=(this.gearTurn+1)%5;draw();});
    const check=add(this.add.rectangle(660,545,150,52,0x537c58).setInteractive({useHandCursor:true}));add(this.add.text(660,545,'فحص التعشيق',{fontFamily:'Tahoma',fontSize:20,color:'#fff4d8'}).setOrigin(.5));check.on('pointerdown',()=>this.finishMechanism(marker,this.gearTurn===2,'التروس المتشابكة تدور في اتجاهين متعاكسين، ويجب أن تتوافق أسنانها دون انزلاق.'));
    const cancel=add(this.add.text(W/2,605,'إغلاق · Esc',{fontFamily:'Tahoma',fontSize:17,color:'#6b5140'}).setOrigin(.5).setInteractive());cancel.on('pointerdown',()=>this.closeMechanism());draw();
  }
  finishMechanism(marker,correct,explanation){
    if(this.mechanismLock)return;
    if(!correct){this.mechanismLock=true;const msg=this.add.text(W/2,625,'لم تتطابق الآلية بعد. عدّل الوضع ثم أعد الفحص.',{fontFamily:'Tahoma',fontSize:18,color:'#9b473c',backgroundColor:'#fff4d8',padding:9}).setOrigin(.5).setScrollFactor(0).setDepth(50);this.time.delayedCall(1100,()=>{msg.destroy();this.mechanismLock=false;});return;}
    marker.done=true;this.solved.add(marker.index);marker.container.list[0].setFillStyle(0x6b9b68);marker.container.list[1].setText('✓');this.saveData[this.progressKey]={...(this.saveData[this.progressKey]||{}),solved:[...this.solved]};save(this.saveData);this.hud.setText(this.progressText());this.closeMechanism();this.showOverlay('نجحت الآلية',explanation,'متابعة');
  }
  closeMechanism(){this.mechanismItems?.forEach(x=>x.destroy());this.mechanismItems=null;this.activePuzzle=null;this.physics.world.resume();this.hero.anims.resume();this.mechanismLock=false;}

  answerPuzzle(marker,choice,items){
    if(this.answerLock)return;this.answerLock=true;
    const correct=choice===marker.data.answer;
    const feedback=this.add.text(W/2,620,correct?`أحسنت · ${marker.data.explain}`:'ليست هذه الإجابة. اقرأ الدليل وحاول مجدداً.',{fontFamily:'Tahoma',fontSize:18,color:correct?'#315e3c':'#9b473c',backgroundColor:'#fff4d8',padding:{x:12,y:8},align:'center',wordWrap:{width:700}}).setOrigin(.5).setScrollFactor(0).setDepth(24);
    if(correct){marker.done=true;this.solved.add(marker.index);marker.container.list[0].setFillStyle(0x6b9b68);marker.container.list[1].setText('✓');this.saveData[this.progressKey]={...(this.saveData[this.progressKey]||{}),solved:[...this.solved]};save(this.saveData);this.hud.setText(this.progressText());}
    this.time.delayedCall(correct?1800:1250,()=>{feedback.destroy();this.answerLock=false;if(correct)this.closePuzzle();});
  }
  closePuzzle(){this.puzzleItems?.forEach(x=>x.destroy());this.puzzleItems=null;this.activePuzzle=null;this.physics.world.resume();this.hero.anims.resume();}
  openBossChallenge(){
    if(this.mechanismItems)return;
    this.activePuzzle='guardian';this.physics.world.pause();this.hero.anims.pause();this.mechanismItems=[];
    const add=(o)=>{o.setScrollFactor(0).setDepth(60);this.mechanismItems.push(o);return o;};
    add(this.add.rectangle(W/2,H/2,W,H,0x101d2a,.92));
    add(this.add.rectangle(W/2,H/2,850,520,0xf4e7c8).setStrokeStyle(7,0xe6b65c));
    add(this.add.text(W/2,155,this.worldKey==='island'?'حارس الأطلس الأخير':'حارس المدار الأخير',{fontFamily:'Tahoma',fontSize:34,color:'#243b3b',bold:true}).setOrigin(.5));
    add(this.add.text(W/2,210,'احفظ تسلسل الإشارات، ثم أعد إدخاله بعد اختفائه. ثلاث محاولات متاحة.',{fontFamily:'Tahoma',fontSize:19,color:'#4e6257'}).setOrigin(.5));
    const symbols=['☀','☾','✦'];const sequence=this.worldKey==='island'?[2,0,1,2]:[1,2,0,1];
    const display=add(this.add.text(W/2,300,sequence.map(i=>symbols[i]).join('   '),{fontFamily:'Tahoma',fontSize:52,color:'#9a713b',bold:true}).setOrigin(.5));
    const status=add(this.add.text(W/2,365,'راقب التسلسل...',{fontFamily:'Tahoma',fontSize:20,color:'#243b3b'}).setOrigin(.5));
    this.bossInput=[];this.bossAttempts=3;this.bossReady=false;
    const buttons=[];
    symbols.forEach((sym,i)=>{
      const x=440+i*200;
      const b=add(this.add.rectangle(x,475,112,90,0x537c58).setStrokeStyle(3,0x243b3b).setInteractive({useHandCursor:true}));
      add(this.add.text(x,475,sym,{fontFamily:'Tahoma',fontSize:42,color:'#fff4d8'}).setOrigin(.5));
      b.on('pointerdown',()=>{
        if(!this.bossReady)return;
        this.bossInput.push(i);
        const idx=this.bossInput.length-1;
        if(this.bossInput[idx]!==sequence[idx]){
          this.bossAttempts--;
          this.bossInput=[];
          if(this.bossAttempts<=0){status.setText('تراجع الحارس. أعد المحاولة من البوابة.');this.bossReady=false;this.time.delayedCall(1400,()=>this.closeMechanism());}
          else status.setText(`تسلسل غير صحيح · المحاولات المتبقية ${this.bossAttempts}`);
          return;
        }
        status.setText(`صحيح · ${this.bossInput.length}/4`);
        if(this.bossInput.length===sequence.length){
          this.saveData[this.guardianMemoryKey]=true;save(this.saveData);status.setText('انكشف نمط الحارس!');
          this.time.delayedCall(650,()=>{this.closeMechanism();this.startBossBattle();});
        }
      });
      buttons.push(b);
    });
    this.time.delayedCall(2600,()=>{if(!this.mechanismItems)return;display.setText('؟   ؟   ؟   ؟');status.setText('أعد الإشارات بالترتيب');this.bossReady=true;});
    const cancel=add(this.add.text(W/2,585,'إغلاق · Esc',{fontFamily:'Tahoma',fontSize:17,color:'#6b5140'}).setOrigin(.5).setInteractive());
    cancel.on('pointerdown',()=>this.closeMechanism());
  }
  startBossBattle(){
    if(this.bossBattle||this.saveData[this.bossKey])return;
    this.bossBattle={hp:3,phase:1,exposed:false,attackLock:false,pattern:0,finished:false,energyInterruptUsed:false};
    this.selectedElement='water';
    this.physics.world.pause();this.hero.setVelocity(0,0);
    this.bossBody=this.add.rectangle(1040,540,92,112,0x674b78).setStrokeStyle(6,0xf1c56b).setDepth(18);
    this.bossCore=this.add.circle(1040,535,19,0xf4d58d).setStrokeStyle(4,0xfff4d8).setDepth(19);
    this.bossTitle=this.add.text(W/2,112,'المواجهة الأخيرة · اكشف نقطة الضعف',{fontFamily:'Tahoma',fontSize:27,color:'#fff4d8',backgroundColor:'#243b3b',padding:10}).setOrigin(.5).setScrollFactor(0).setDepth(55);
    this.bossHealth=this.add.text(W-30,150,'قوة الحارس: 3 / 3',{fontFamily:'Tahoma',fontSize:20,color:'#fff4d8',backgroundColor:'#243b3b',padding:8}).setOrigin(1,0).setScrollFactor(0).setDepth(55);
    this.bossHint=this.add.text(W/2,H-92,'اختر الماء 1 · اقترب واضغط E عند انكشاف القلب · الطاقة 3 توقف شحنة واحدة',{fontFamily:'Tahoma',fontSize:18,color:'#243b3b',backgroundColor:'#f4e7c8',padding:10}).setOrigin(.5).setScrollFactor(0).setDepth(55);
    this.bossDanger=this.add.rectangle(640,585,900,34,0xd65d45,.18).setStrokeStyle(2,0xffb18c).setDepth(16).setVisible(false);
    this.bossAttackTimer=this.time.delayedCall(1200,()=>this.bossTelegraph());
    this.physics.world.resume();
  }
  bossTelegraph(){
    const b=this.bossBattle;if(!b||b.finished||b.exposed)return;
    b.attackLock=true;b.pattern++;
    const width=b.phase===1?760:b.phase===2?930:1080;
    this.bossDanger.setPosition(640,b.phase===1?590:b.phase===2?560:530).setSize(width,42).setVisible(true).setFillStyle(0xd65d45,.30);
    this.bossHint.setText(b.phase===1?'الحارس يشحن موجة أرضية · اقفز الآن':b.phase===2?'هجوم مزدوج قادم · اندفع ثم غيّر موقعك':'الهجوم الأخير واسع · راقب التوقيت واقفز');
    this.bossStrikeTimer=this.time.delayedCall(b.phase===1?850:650,()=>this.bossStrike());
  }
  bossStrike(){
    const b=this.bossBattle;if(!b||b.finished)return;
    const laneY=this.bossDanger.y;
    const safe=this.hero.y<laneY-78||Math.abs(this.hero.x-this.bossBody.x)>520;
    this.bossDanger.setFillStyle(0xd65d45,.72);
    if(!safe){this.hero.setTint(0xe78b68);this.hero.setVelocityY(-260);this.time.delayedCall(280,()=>this.hero.clearTint());this.bossHint.setText('أصابك الهجوم · غيّر توقيت القفز أو ابتعد عن المسار');}
    else this.bossHint.setText('تفاديت الهجوم · قلب الحارس مكشوف!');
    this.time.delayedCall(260,()=>{
      if(!this.bossBattle||this.bossBattle.finished)return;
      this.bossDanger.setVisible(false);b.attackLock=false;b.exposed=true;
      this.bossCore.setFillStyle(0x9de2d0);this.bossCore.setScale(1.35);
      this.bossHint.setText(`نافذة ضعف · ${this.bossWeaknessLabel()} مطلوب · اختر العنصر ثم اضغط E`);
      this.time.delayedCall(1700,()=>{
        if(!this.bossBattle||b.finished||!b.exposed)return;
        b.exposed=false;this.bossCore.setFillStyle(0xf4d58d);this.bossCore.setScale(1);
        this.bossHint.setText('أغلق الحارس قلبه · استعد للهجوم التالي');
        this.time.delayedCall(850,()=>this.bossTelegraph());
      });
    });
  }
  bossWeaknessLabel(){return ({water:'الماء (1)',light:'الضوء (2)',fire:'النار (4)'})[({1:'water',2:'light',3:'fire'})[this.bossBattle?.phase||1]]||'الماء';}
  interruptBossAttack(){
    const b=this.bossBattle;if(!b||!b.attackLock||b.exposed||b.energyInterruptUsed)return;
    const result=resolveBossElement({phase:b.phase,element:'energy',exposed:b.exposed,attackLock:b.attackLock,energyInterruptUsed:b.energyInterruptUsed,hp:b.hp});
    if(!result.ok)return;
    b.energyInterruptUsed=result.energyInterruptUsed;b.attackLock=false;this.bossStrikeTimer?.remove(false);this.bossDanger.setVisible(false);
    this.bossHint.setText('أوقفت الطاقة الهجوم! هذه فرصة نادرة للاستعداد.');
    this.time.delayedCall(1000,()=>{if(this.bossBattle&&!this.bossBattle.finished&&!this.bossBattle.exposed)this.bossTelegraph();});
  }
  damageBoss(element='water'){
    const b=this.bossBattle;if(!b||!b.exposed||b.finished)return;
    const distance=Phaser.Math.Distance.Between(this.hero.x,this.hero.y,this.bossBody.x,this.bossBody.y);
    if(distance>145){this.bossHint.setText('اقترب أكثر من قلب الحارس قبل التفاعل');return;}
    const result=resolveBossElement({phase:b.phase,element,exposed:b.exposed,attackLock:b.attackLock,energyInterruptUsed:b.energyInterruptUsed,hp:b.hp});
    if(!result.ok){this.bossHint.setText(result.reason);return;}
    b.hp=result.hp;b.exposed=false;b.phase=b.hp<=1?3:b.hp===2?2:1;
    this.bossCore.setFillStyle(0xf4d58d).setScale(1);this.bossHealth.setText(`قوة الحارس: ${b.hp} / 3`);
    this.bossBody.setFillStyle(b.phase===1?0x674b78:b.phase===2?0x9b573f:0x3f668b);
    if(b.hp<=0){b.finished=true;this.saveData[this.bossKey]=true;save(this.saveData);this.bossHint.setText('انكسر ختم الحارس · اختر مصير الأطلس');this.showEndingChoice();return;}
    this.bossHint.setText(b.phase===2?'المرحلة الثانية · الضوء يكشف نقطة الضعف · اختر 2':'المرحلة الأخيرة · النار تكسر القلب · اختر 4');
    this.time.delayedCall(750,()=>this.bossTelegraph());
  }
  showEndingChoice(){
    [this.bossTitle,this.bossHealth,this.bossHint,this.bossDanger,this.bossBody,this.bossCore].forEach(o=>o?.setVisible(false));
    this.physics.world.pause();const items=[];const add=o=>{o.setScrollFactor(0).setDepth(70);items.push(o);return o;};
    add(this.add.rectangle(W/2,H/2,900,480,0xf4e7c8).setStrokeStyle(6,0xe6b65c));
    add(this.add.text(W/2,190,'مصير الأطلس بين يديك',{fontFamily:'Tahoma',fontSize:34,color:'#243b3b'}).setOrigin(.5));
    add(this.add.text(W/2,255,'اختر ما سيبقى من العالم بعد سقوط الحارس.',{fontFamily:'Tahoma',fontSize:20,color:'#4e6257'}).setOrigin(.5));
    [{id:'restore',x:430,title:'إعادة التوازن',desc:'تُعاد الطاقة إلى الطبيعة ويُفتح الطريق للجميع.'},{id:'preserve',x:850,title:'حفظ السر',desc:'يبقى الأطلس مخفياً، وتُصان أسراره من الطامعين.'}].forEach(c=>{
      const bg=add(this.add.rectangle(c.x,430,330,150,0x537c58).setStrokeStyle(3,0x243b3b).setInteractive({useHandCursor:true}));
      add(this.add.text(c.x,405,c.title,{fontFamily:'Tahoma',fontSize:25,color:'#fff4d8'}).setOrigin(.5));
      add(this.add.text(c.x,455,c.desc,{fontFamily:'Tahoma',fontSize:16,color:'#fff4d8',align:'center',wordWrap:{width:285}}).setOrigin(.5));
      bg.on('pointerdown',()=>{this.saveData[`${this.worldKey}-ending`]=c.id;save(this.saveData);items.forEach(o=>o.destroy());this.physics.world.resume();this.showOverlay(c.id==='restore'?'نهاية إعادة التوازن':'نهاية حفظ السر',c.id==='restore'?'عاد الضوء إلى الممرات وبدأت الجزيرة تتعافى.':'اختفى الأطلس خلف ضباب البحر، وبقي سره آمناً.','إنهاء الرحلة');});
    });
  }
  tryExit(){if(!this.elementSolved){this.prompt.setText('ختم العناصر لم يكتمل بعد · اقترب من الختم واستخدم العنصر المطلوب');return;}if(this.solved.size<this.cfg.clues.length){this.prompt.setText(`ما زالت هناك أختام ناقصة: ${this.solved.size}/${this.cfg.clues.length}`);return;}if(this.areaIndex>=this.base.areas.length-1&&!this.saveData[this.bossKey]){if(!this.saveData[this.guardianMemoryKey])this.openBossChallenge();else this.startBossBattle();return;}this.saveData[this.progressKey]={...(this.saveData[this.progressKey]||{}),solved:[...this.solved],completed:true};save(this.saveData);const last=this.areaIndex>=this.base.areas.length-1;const totalRelics=RELICS[this.worldKey].length*this.base.areas.length;const relicCount=(this.saveData[`${this.worldKey}-relics`]||[]).length;const bonus=relicCount>=totalRelics?'\nاكتملت مهمة جمع الآثار السرية!':'';const msg=last?`اكتملت الرحلة! سُجل إنجاز العالم كاملاً.${bonus}`:`اكتمل ${this.cfg.subtitle.split('·').pop().trim()} · المنطقة التالية تفتح الآن.`;this.add.text(this.hero.x,this.hero.y-110,msg,{fontFamily:'Tahoma',fontSize:22,color:'#fff4d8',backgroundColor:'#243b3b',padding:12,align:'center',wordWrap:{width:600}}).setOrigin(.5);this.time.delayedCall(1900,()=>{if(last)this.scene.start('Menu');else this.scene.start('World',{world:this.worldKey,area:this.areaIndex+1})});}
}

const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#294b4b',pixelArt:false,antialias:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},physics:{default:'arcade',arcade:{gravity:{y:1250},debug:false}},input:{activePointers:4},scene:[BootScene,MenuScene,WorldScene]});
window.__DABT_PHASER_GAME__=game;

