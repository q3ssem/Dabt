'use strict';
/* 5.5.10 — bespoke ink-and-watercolour vector emblems + story beats for the Mirror Palace.
   Decorative only: no puzzle state, rules, generators, scoring or save data are changed. */
(function(){
const W=window.Watercolor;if(!W)return;
const ink='#344052',gold='#c49a55',paper='#f5ead4',blue='#77a9b5',plum='#78658e';
const frame=(body,accent=gold)=>`<svg class="castle-ink" viewBox="0 0 128 128" role="img" aria-hidden="true"><defs><linearGradient id="ciGlass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d7f0eb"/><stop offset=".55" stop-color="#8db8c9"/><stop offset="1" stop-color="#6e779e"/></linearGradient><linearGradient id="ciGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2d99c"/><stop offset="1" stop-color="#a9773e"/></linearGradient><filter id="ciShadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter></defs><path d="M64 7C78 15 96 13 111 27c-5 17 6 31 9 44-11 14-11 30-27 42-16-3-25 9-39 7-14-12-31-11-43-25 4-17-7-30-5-44C19 39 20 21 38 16 48 18 55 9 64 7Z" fill="${paper}" stroke="${gold}" stroke-width="2.5" stroke-linejoin="round"/><path d="M64 14c12 8 28 8 39 18-4 13 6 27 9 38-10 11-10 26-23 35-14-3-24 7-35 5-12-10-26-10-36-21 3-14-6-25-4-37 11-8 11-22 26-26 9 2 16-7 24-12Z" fill="none" stroke="${accent}" stroke-width="1.2" stroke-dasharray="2 4"/><g stroke="${ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${body}</g><path d="M17 64q7-3 11 0M100 64q7-3 11 0M64 17q-3 7 0 11M64 100q-3 7 0 11" fill="none" stroke="${accent}" stroke-width="2"/></svg>`;
const drawings={
 pz_plock:frame(`<path d="M34 48v-9a12 12 0 0 1 24 0v9M30 48h32v34H30z" fill="#b9c6c5"/><circle cx="46" cy="63" r="4" fill="${gold}"/><path d="M46 67v7M70 38l12-8 12 8v19H70z" fill="#e2c58a"/><path d="M76 48h12M82 42v12M27 91q19 10 38 0" fill="none"/>`),
 pz_pliar:frame(`<path d="M31 87V48l15-12 15 12v39z" fill="#c9b9a1"/><path d="M68 87V48l15-12 15 12v39z" fill="#aaa2b8"/><path d="M39 54q7-8 14 0M76 54q7-8 14 0" fill="none"/><circle cx="46" cy="60" r="2.5"/><circle cx="83" cy="60" r="2.5"/><path d="M41 72q5 5 10 0M78 72q5-5 10 0" fill="none"/><path d="M22 91h84"/>`),
 pz_pclock:frame(`<circle cx="64" cy="62" r="34" fill="#d7e1df"/><circle cx="64" cy="62" r="28" fill="none" stroke="${gold}" stroke-width="3"/><path d="M64 37v25l18 11M64 28v6M98 62h-6M64 96v-6M30 62h6" fill="none"/><path d="M48 23l-5-8M80 23l5-8"/>`),
 pz_pboss1:frame(`<path d="M37 91V58q0-23 27-23t27 23v33z" fill="#777d91"/><path d="M43 56q21-15 42 0" fill="none" stroke="${gold}" stroke-width="4"/><path d="M50 64h8m12 0h8M58 78q6 5 12 0" fill="none"/><path d="M26 93h76M64 24v-8"/>`),
 pz_plib:frame(`<path d="M28 39q17-9 36 2v48q-19-10-36-2z" fill="#d6bd8c"/><path d="M64 41q18-10 36-2v48q-18-8-36 2z" fill="#e8d8b8"/><path d="M64 41v48M37 51l18 4M37 61l18 4M73 54l18-4M73 65l18-4" fill="none"/><path d="M45 30q19-13 38 0" fill="none" stroke="${gold}" stroke-width="3"/>`),
 pz_pmirror:frame(`<path d="M45 25q-16 18-13 43 3 27 32 32 29-5 32-32 3-25-15-43-18-10-36 0z" fill="url(#ciGlass)"/><path d="M64 28q-14 18-12 38 2 17 12 25M73 33q14 19 9 39" fill="none" stroke="#fff" stroke-width="3"/><path d="M44 98h40M52 104h24"/>`),
 pz_pgarden:frame(`<path d="M64 91V58M64 68Q39 65 39 43q24-2 25 25M64 76q25-2 25-25-23-1-25 25" fill="#86a77b"/><path d="M64 58q-5-24 0-33 7 12 0 33" fill="#d58b92"/><path d="M64 25q-13-14-20 0 8 13 20 0 12 13 20 0-7-14-20 0" fill="#e6b4b0"/><path d="M43 93q21-10 42 0" fill="none" stroke="#6f9eae" stroke-width="4"/>`),
 pz_pqueen:frame(`<path d="M35 48l8-18 19 13 18-13 13 18-5 35H40z" fill="#9b83aa"/><path d="M43 48l-8-18 19 13 8-15 9 15 18-13-7 18" fill="none" stroke="${gold}" stroke-width="3"/><circle cx="43" cy="30" r="4" fill="#d9a9ad"/><circle cx="64" cy="27" r="5" fill="#b8d7dc"/><circle cx="84" cy="30" r="4" fill="#d9a9ad"/><path d="M48 88q16-13 32 0" fill="none"/>`),
 pz_parm:frame(`<path d="M64 28l7 7 10-2 4 10 9 5-3 10 3 10-9 5-4 10-10-2-7 7-7-7-10 2-4-10-9-5 3-10-3-10 9-5 4-10 10 2z" fill="#c6a66e"/><circle cx="64" cy="58" r="14" fill="#f0dfbb"/><circle cx="64" cy="58" r="5"/><path d="M64 20v8M64 88v8M26 58h8M94 58h8"/>`),
 pz_pjail:frame(`<path d="M34 31v66M48 31v66M62 31v66M76 31v66M90 31v66M28 31h68M28 97h68" fill="none" stroke="#777d87" stroke-width="4"/><circle cx="64" cy="48" r="10" fill="#c69e80"/><path d="M45 88q1-27 19-27t19 27z" fill="#7c8c91"/><path d="M57 49h2m12 0h2" stroke-width="3"/>`),
 pz_pobs:frame(`<circle cx="57" cy="58" r="28" fill="#c4d9dc" fill-opacity=".55"/><circle cx="71" cy="58" r="28" fill="#d9c5e2" fill-opacity=".42"/><path d="M44 43l8-7 6 9 8-4 7 10-10 7-9-3-7 8-8-8z" fill="none" stroke="${gold}"/><path d="M81 80l18 18" stroke-width="7"/>`),
 pz_peng:frame(`<circle cx="64" cy="60" r="27" fill="#b8c9c8"/><circle cx="64" cy="60" r="18" fill="none" stroke="${gold}" stroke-width="5"/><path d="M64 34v-9m26 35h9M64 86v9M38 60h-9M64 60l13-12M64 60l-4 17"/><circle cx="64" cy="60" r="4" fill="${gold}"/>`),
 pz_pmaze:frame(`<path d="M29 31h70v66H29zM29 51h23v22H39M52 31v13h22v21h25M52 73v24M74 44h25M74 65v32" fill="none" stroke="#7d8b99" stroke-width="5"/><path d="M37 39l8 5-8 5M88 83l-8 7 8 4" fill="none" stroke="${gold}" stroke-width="3"/>`),
 pz_pcrypt:frame(`<path d="M33 31h62v66H33z" fill="#b8ad9c"/><path d="M43 42h9v9h-9zM59 42h9v9h-9zM75 42h9v9h-9zM43 58h9v9h-9zM75 58h9v9h-9zM59 74h9v9h-9zM43 74h9v9h-9zM75 74h9v9h-9z" fill="#7e8a8b"/><path d="M36 90q25-7 56 0" fill="none" stroke="${gold}" stroke-width="3"/>`),
 pz_pvalve:frame(`<path d="M31 57h66M64 31v52" stroke="#718e9a" stroke-width="8"/><circle cx="64" cy="57" r="16" fill="#c5a46d"/><circle cx="64" cy="57" r="6" fill="#f1e4c9"/><path d="M64 24v13M57 24h14M64 73v20M57 93h14"/>`),
 pz_plast:frame(`<path d="M35 31v65M48 31v65M62 31v65M76 31v65M90 31v65" stroke="#7d858e" stroke-width="3"/><circle cx="64" cy="45" r="10" fill="#c79c7d"/><path d="M43 91q2-29 21-29t21 29z" fill="#8d9b9b"/><path d="M54 46h4m12 0h4M57 54q7 4 14 0" fill="none"/>`),
 pz_pdragon:frame(`<path d="M31 76q8-32 39-40l-5 17q17-5 31 7-16 0-21 14 14 0 18 14-22-9-37-4-18 5-25-8z" fill="#779a8d"/><path d="M69 39l7-17 8 18M38 66l-13-9 8 18" fill="none" stroke="${gold}" stroke-width="3"/><circle cx="78" cy="58" r="2.5" fill="#f7e7c8"/>`),
 pz_phall:frame(`<path d="M31 89V52l12-18 12 18 9-26 10 26 13-18 11 18v37z" fill="#9a8b9e"/><path d="M43 52h42M64 28v61M31 89h67" fill="none" stroke="${gold}" stroke-width="3"/><circle cx="64" cy="62" r="8" fill="#d7bd83"/>`),
 pz_pheart:frame(`<path d="M64 92S27 68 34 48q7-20 30-4 23-16 30 4 7 20-30 44z" fill="#b96f78"/><path d="M64 42v44M44 58h40" stroke="#f1d7bd" stroke-width="3"/><path d="M28 94h72M38 89l-7 5 7 5M90 89l7 5-7 5" fill="none" stroke="${gold}" stroke-width="3"/>`)
};
const lore={
 pz_plock:'على بوابة القصر ثلاثة أقفال لا تفتح بالقوة؛ ترك الملك معادلاته كي لا يدخل إلا من يفهم ترتيبها.',
 pz_pliar:'حارسان حجريان يرويان روايتين متعارضتين عن اختفاء المفتاح. أحدهما لا ينطق إلا بالحقيقة والآخر لا يقول إلا عكسها.',
 pz_pclock:'توقفت ساعات البرج في لحظة اختفاء الملكة. أعد إيقاعها المشترك لتسمع دقة الباب المخفي.',
 pz_pboss1:'حارس البوابة لا يختبر الحفظ وحده؛ يريد أن يعرف إن كنت تميّز الدليل من الخداع وتعرف متى تلتقي الدورات.',
 pz_plib:'صفحات يوميات القبطان مبعثرة. ترتيبها الصحيح يكشف لماذا بُني القصر، ومن الذي أخفى قلبه في أعماقه.',
 pz_pmirror:'لم تكن المرايا للزينة؛ صُممت لتوجيه ضوء الفجر عبر زجاج ملوّن، وكل بلورة تحفظ ذكرى من ذكريات القصر.',
 pz_pgarden:'حديقة الملكة نظام مائي دقيق. إن وصل الماء إلى الزهرة البيضاء انطفأ ختم الحماية؛ وإن نقص عن زهرة ذبلت الذكرى.',
 pz_pqueen:'ملكة المرايا لا تثق بالوجوه؛ تختبر عينك أولًا، ثم قدرتك على توجيه النور، ثم حكمك على الصدق.',
 pz_parm:'أسلحة الملوك ليست سيوفًا؛ إنها أدوات ميكانيكية صُنعت لفتح ممرات القصر. أعد كل قطعة إلى موضعها.',
 pz_pjail:'في سجن القباطنة بقيت شهادات ليلة الانقلاب. لا تتعامل مع كل رواية كأنها حقيقة؛ قارن الأقوال والقرائن.',
 pz_pobs:'خريطتان شفافيتان لسماء ليلتين مختلفتين. حين تتطابق النجوم التي لم تتحرك يظهر اتجاه المرصد السري.',
 pz_peng:'مهندس القصر ترك آلية ساعات متداخلة. لا تعمل إلا حين تعود التروس إلى توقيتها المشترك.',
 pz_pmaze:'الممرات ليست ثابتة؛ بعض الغرف تدور عند كل خطوة. تذكّر أن الطريق الذي تراه الآن قد لا يبقى كما هو بعد الحركة.',
 pz_pcrypt:'تحت العرش نقش مطمور. أرقام الحواف تصف مجموعات الحجر المنقوش، لا أماكنها؛ استخرج الصورة من القيود.',
 pz_pvalve:'قنوات الأعماق تغذي القصر من البحر. افتح الصمامات بالترتيب الصحيح كي يصل الماء إلى الخزان دون أن يغرق الأرشيف.',
 pz_plast:'آخر سجين يحمل الجزء الأخير من الحكاية، لكنه لن يثق بمن يكرر أخطاء من سبقه.',
 pz_pdragon:'التنين حارس اللغة القديمة. رموزه ليست زينة؛ كل شكل يقابل صوتًا، وترتيب الأصوات يفتح ختمه.',
 pz_phall:'في قاعة الملوك سبعة عروش، ولكل عرش أثر من عهد مختلف. اجمع القرائن لتعرف ترتيبها الحقيقي.',
 pz_pheart:'هذا هو قلب القصر: ميزان صنعه القبطان ليحفظ التوازن بين القوى السبع. حين يستقر الميزان تنكشف الحقيقة الأخيرة.'
};
const chronicle=[
 {id:'pz_plock',chapter:'الفصل الأول: الساحل الذي لا يظهر',title:'الخريطة خلف البوابة',text:'وجدت خلف القفل خريطةً لساحل لا تعترف به خرائط الممالك. بجانب الساحل علامة صغيرة: سبع نقاط حول دائرة، ونقطة ثامنة خارجها.'},
 {id:'pz_pliar',chapter:'الفصل الأول: الساحل الذي لا يظهر',title:'إشارة الغرب',text:'اتفق الحارسان على شيء واحد رغم تناقضهما: التمثال القديم لم يكن يحرس الباب، بل كان يشير إلى الغرب، إلى جهة لا تقع فيها أي مملكة معروفة.'},
 {id:'pz_pclock',chapter:'الفصل الأول: الساحل الذي لا يظهر',title:'الساعة الثامنة',text:'بين تروس البرج ساعة مخفية لا تتبع ساعات القصر. عقربها يتحرك مع المدّ، ويسجل اسم بحرٍ لا يظهر إلا عندما تلتقي الساعات السبع.'},
 {id:'pz_pboss1',chapter:'الفصل الأول: الساحل الذي لا يظهر',title:'سبع سنوات أم سبعة أيام؟',text:'في دفتر الحارس سجلّان للرحلة نفسها: سبع سنوات في سجل الميناء، وسبعة أيام في شهادة البحّارة. كتب الحارس: «الطريق لا يختصر المسافة؛ إنه يطوي الزمن». '},
 {id:'pz_plib',chapter:'الفصل الأول: الساحل الذي لا يظهر',title:'القارة المتبدلة',text:'تذكر يوميات القبطان أن الساحل يتغير بين رحلة وأخرى. لم تكن الخرائط خاطئة؛ كانت القارة نفسها تبدّل موضع شواطئها كلما تغيّر المدّ.'},
 {id:'pz_pmirror',chapter:'الفصل الثاني: ضوء يسبق الشمس',title:'الجبل في المرآة',text:'عكست المرآة جبلًا لم يكن خلف الناظر. وعندما وُجّه الضوء عبر الزجاج الملوّن ظهر الجبل على الخريطة، في مكانٍ لم يصل إليه أحد بعد.'},
 {id:'pz_pgarden',chapter:'الفصل الثاني: ضوء يسبق الشمس',title:'زهرة الغد',text:'كانت الزهرة البيضاء تنحني نحو شمس لم تشرق بعد. دوّن البستاني أن الضوء يصل إلى الحديقة قبل الفجر، كأن القصر يتلقى رسالة من يومٍ قادم.'},
 {id:'pz_pqueen',chapter:'الفصل الثاني: ضوء يسبق الشمس',title:'سؤال الملكة',text:'تركت الملكة سؤالها الأخير: «لماذا بنى الملوك قصرًا للخرائط وهم لا يحبون الإبحار؟» ثم كتبت تحته: «لأننا لا نبحث عن أرض جديدة؛ نحن ننتظر عودة أرضنا». '},
 {id:'pz_parm',chapter:'الفصل الثاني: ضوء يسبق الشمس',title:'البوصلة التي ترفض الشمال',text:'لم تكن البوصلة معطوبة؛ كانت تشير إلى نقطة ثابتة لا تقع في الشمال. وحين وُضعت بجوار المرآة، أشارت إلى الموضع الذي ظهر فيه الجبل.'},
 {id:'pz_pjail',chapter:'الفصل الثالث: البحر الذي يعبر الزمن',title:'السفينة على اليابسة',text:'نقش السجين سفينةً راسية وسط المحيط، ثم رسم حولها أرضًا جافة. كتب: «وصلنا إلى البحر الآخر، لكننا خرجنا منه على البر قبل أن تبدأ الرحلة». '},
 {id:'pz_pobs',chapter:'الفصل الثالث: البحر الذي يعبر الزمن',title:'النجمة الغائبة',text:'ظهرت في خريطة المرصد نجمة لا يعرفها فلكيو الممالك. لم تكن بعيدة؛ كانت ترى من الجهة الأخرى للقارة، حين تنقلب السماء مع المدّ.'},
 {id:'pz_peng',chapter:'الفصل الثالث: البحر الذي يعبر الزمن',title:'ترس العودة',text:'صنع المهندس ترسًا يعيد الحركة إلى الوراء، وترك تحته عبارة «للعودة لا للوصول». فهمت أن القصر بُني ليعيد طريقًا فُقد، لا ليصنع طريقًا جديدًا.'},
 {id:'pz_pmaze',chapter:'الفصل الثالث: البحر الذي يعبر الزمن',title:'الوادي الذي لم يزره أحد',text:'كانت المتاهة نسخةً مطابقة لوادٍ مجهول، حتى الصخور الصغيرة فيه. كتب المهندس أنه رسمه من ذاكرة رجل عاد من رحلة لم تحدث بعد.'},
 {id:'pz_pcrypt',chapter:'الفصل الثالث: البحر الذي يعبر الزمن',title:'الاسم الممحُو',text:'في السرداب اسم ثامن أزيل من النقش. بقيت حوله آثار ثمانية أختام، لكن الملوك السبعة محوا اسم صاحب الختم الأخير من السجلات.'},
 {id:'pz_pvalve',chapter:'الفصل الثالث: البحر الذي يعبر الزمن',title:'ماء من بحر آخر',text:'وصل ماء مالح إلى أساسات القصر من جهة لا تتصل بأي نهر. لم يكن تسربًا؛ كان البحر الآخر يلامس القصر من الجانب المقابل للعالم.'},
 {id:'pz_plast',chapter:'الفصل الرابع: الباب الثامن',title:'اعتراف السجين الأخير',text:'قال السجين: «الملوك السبعة لم يحكموا الممالك. كانوا حراسًا، وكل واحد منهم يحمل عهدًا يمنع الباب الثامن من الانفتاح قبل أوانه». '},
 {id:'pz_pdragon',chapter:'الفصل الرابع: الباب الثامن',title:'خريطة في الحراشف',text:'لم تكن الحراشف كتابةً للتنين؛ كانت أجزاء خريطة. وعندما جُمعت رموز التنانين الستة ظهر ساحل طويل، وفي نهايته بوابة بلا اسم.'},
 {id:'pz_phall',chapter:'الفصل الرابع: الباب الثامن',title:'العرش الفارغ',text:'خلف العروش السبعة ظهر عرش ثامن لا يحمل تاجًا. كُتب عليه: «لمن يعود من أَثْرَان». عندها أدركت أن الملوك لم ينتظروا وريثًا؛ كانوا ينتظرون عائدًا.'},
 {id:'pz_pheart',chapter:'الفصل الرابع: الباب الثامن',title:'القلب وبداية الطريق',text:'استقر ميزان القلب، فانكشفت الخريطة الناقصة: القصر بوابة بين البحرين، والباب الثامن لا يفتح إلى قاعة أخرى، بل إلى أَثْرَان. لم تكن هذه نهاية الرحلة؛ كانت أول إحداثية لها.'}
];
if(typeof PSEC_LORE!=='undefined')chronicle.forEach((entry,i)=>{PSEC_LORE[i]=entry.text});
function openChronicle(){
 const state=typeof pSt2==='function'?pSt2():{sec:{}},found=state.sec||{},count=chronicle.filter(e=>found[e.id]).length;
 const veil=document.createElement('div');veil.className='castle-book-backdrop';veil.innerHTML='<section class="castle-book" role="dialog" aria-modal="true" aria-labelledby="castle-book-title" tabindex="-1"><header><div><small>أرشيف الملوك السبعة</small><h2 id="castle-book-title">دفتر القبطان</h2><p class="castle-book-count"></p></div><button type="button" class="castle-book-close" aria-label="إغلاق الدفتر">×</button></header><div class="castle-book-progress"><i></i></div><div class="castle-book-pages"></div><footer>كل ختم تكتشفه يضيف صفحة جديدة إلى سجل الرحلة.</footer></section>';
 const dialog=veil.querySelector('.castle-book'),pages=veil.querySelector('.castle-book-pages');
 veil.querySelector('.castle-book-count').textContent=`اكتُشفت ${count} من ${chronicle.length} صفحة`;
 veil.querySelector('.castle-book-progress i').style.width=(count/chronicle.length*100)+'%';
 let chapter='';
 chronicle.forEach((entry,i)=>{
  if(entry.chapter!==chapter){chapter=entry.chapter;const h=document.createElement('h3');h.className='castle-book-chapter';h.textContent=chapter;pages.appendChild(h)}
  const article=document.createElement('article');article.className='castle-book-entry'+(found[entry.id]?' found':' locked');
  const label=document.createElement('small');label.textContent=`الصفحة ${String(i+1).padStart(2,'0')}`;
  const title=document.createElement('b');title.textContent=found[entry.id]?entry.title:'صفحة لم تُكتشف بعد';
  const copy=document.createElement('p');copy.textContent=found[entry.id]?entry.text:'ابحث عن العلامة السرية في هذا الجناح لتستعيد هذه الصفحة.';
  article.append(label,title,copy);pages.appendChild(article);
 });
 const close=()=>{veil.remove();document.removeEventListener('keydown',keyClose)};
 const keyClose=e=>{if(e.key==='Escape')close()};
 veil.addEventListener('click',e=>{if(e.target===veil)close()});
 veil.querySelector('.castle-book-close').addEventListener('click',close);
 document.addEventListener('keydown',keyClose);document.body.appendChild(veil);dialog.focus();
}
W.castleInk=drawings;W.castleLore=lore;W.castleChronicle=chronicle;W.castleOpenChronicle=openChronicle;
const oldCards=W.cards;
W.cards=function(){oldCards();if(typeof curTab!=='undefined'&&curTab!=='puz')return;document.querySelectorAll('.t7-classic,.la-library-card').forEach(card=>{const id=card.dataset.puzzleId||card.dataset.legacyPuzzle;if(!drawings[id]||card.dataset.castleInk===id)return;const box=card.querySelector('.la-library-image')||card.querySelector('.wc-game-icon');if(box){box.innerHTML=drawings[id];box.classList.add('castle-ink-box');card.dataset.castleInk=id;}});};
const stage=document.querySelector('#stage');if(stage){const addLore=()=>{const g=W.current(),id=g&&g.id,copy=lore[id];if(!copy)return;const sheet=document.querySelector('#play .xsheet');if(!sheet||sheet.dataset.castleLore===id)return;const head=sheet.querySelector('.xhead');const panel=document.createElement('aside');panel.className='castle-lore';const p=document.createElement('p');p.textContent=copy;const book=document.createElement('button');const count=chronicle.filter(e=>pSt2().sec[e.id]).length;book.type='button';book.className='castle-book-open';book.textContent=`دفتر القبطان · ${count}/${chronicle.length}`;book.setAttribute('aria-haspopup','dialog');book.addEventListener('click',openChronicle);panel.append(p,book);if(head)head.insertAdjacentElement('afterend',panel);else sheet.insertBefore(panel,sheet.firstChild);sheet.dataset.castleLore=id;};new MutationObserver(addLore).observe(stage,{childList:true,subtree:true});}
W.cards();
})();
