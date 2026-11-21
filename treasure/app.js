'use strict';
/* Treasure Island 5.0 · «حكايات البحار السبعة» — map, story, board, reward, letters, notebook and save handling.
   Progress lives in S.st.treasureV3 (save key miran:v2). Boards are drawn by boards.js. */
(function(){
const D=TreasureData,L=TreasureLogic,B=TreasureBoards,E=DX.el,A=DX.AR,$=DX.$,ART=B.ART;
let view='hub',active=0,dialogAt=0,letterCh=0,passageTarget=null,journeyEntry=false;

/* ---------- progress ---------- */
// The seal + secret of a sea come with its island; in the last sea they come at the Dawn Kingdom, before the final door.
const sealHere=s=>!!s&&(s.seal||(s.zone===2&&!s.finale)),sealIndex=ch=>D.stations.slice(ch*3,ch*3+3).find(sealHere).i;
function state(){const x=S.st.treasureV3||(S.st.treasureV3={version:3,done:{},work:{},notes:{},hints:{},rewards:[],moves:{},resume:null});
 for(const k of ['done','work','notes','hints','moves','bonus','usedTools'])if(!x[k]||typeof x[k]!=='object')x[k]={};if(!Array.isArray(x.rewards))x.rewards=[];migrate(x);return x;}
/* Once per load: drop boards that do not fit the current puzzles, and grant tools, seals and secrets already earned. */
function migrate(x){if(x.__v5)return;Object.defineProperty(x,'__v5',{value:true,enumerable:false});L.cleanWork(x,D.stations);const T=B.v5state(x);
 // 5.4.8: a station finished in an older save has, by definition, won challenge 1 («الحل»); without it the
 // later challenges stayed locked and the star count was short.
 D.stations.forEach(s=>{if(!x.done[s.id])return;B.chal(x,s.id)[0]=true;if(s.gives&&!T.tools[s.gives])T.tools[s.gives]='new';if(sealHere(s)&&!x.rewards.includes(s.ch))x.rewards.push(s.ch);});
 D.secrets.forEach(q=>{if(x.done[D.stations[sealIndex(q.ch)].id]&&!x.bonus[q.id])x.bonus[q.id]={at:Date.now(),moves:0,hints:0,tool:false};});}
const save=()=>{state().updatedAt=Date.now();S.save();},done=i=>!!state().done[D.stations[i]?.id],unlocked=i=>i===0||done(i-1);
// The board in play follows the current challenge (main, alt start or expert board).
const live=()=>{const s=D.stations[active],x=state();return L.variant(s,B.attempt(x,s,!!x.done[s.id]).c);};
function current(){const s=live(),x=state();return x.work[s.id]||(x.work[s.id]=L.initial(s));}

/* ---------- daily island puzzle ---------- */
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const seedOf=k=>[...k].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
function daily(){const x=state(),pool=D.stations.filter(s=>x.done[s.id]&&L.DAILY_KINDS.includes(s.kind));if(!pool.length)return null;const k=today(),seed=seedOf(k),s=pool[seed%pool.length];return{s,key:k,board:L.dailyBoard(s,seed),done:(x.daily||{})[k]};}
function openDaily(){const d=daily();if(!d)return;const x=state(),s=d.s;s.daily=d.board;const T=B.v5state(x);T.att[s.id]={c:4,moves:0,hint:0,tool:true,hist:[]};x.work[s.id]=d.board.start.slice();active=s.i;dialogAt=0;view='puzzle';save();go();}
function dailyDone(moves,min,hints){const x=state();x.daily=x.daily&&typeof x.daily==='object'?x.daily:{};const k=today(),old=x.daily[k];if(!old||moves<old.moves)x.daily[k]={moves,min,hints:hints||0};const keys=Object.keys(x.daily).sort();while(keys.length>30)delete x.daily[keys.shift()];save();}

/* ---------- navigation ---------- */
function open(i, fromJourney=journeyEntry){if(!D.stations[i]||!unlocked(i))return;journeyEntry=fromJourney;D.stations.forEach(q=>{delete q.daily;});const x=state(),a=B.v5state(x).att[D.stations[i].id];if(a&&a.c===4)delete B.v5state(x).att[D.stations[i].id];active=i;dialogAt=0;view=fromJourney?'puzzle':'story';state().resume=i;save();go();}
function continueJourney(){if(journeyEntry)return map();const target=active+1;if(target>=D.stations.length){map();return;}const from=D.stations[active],to=D.stations[target];if(from.ch!==to.ch&&sealHere(from)&&done(from.i)){passageTarget=target;view='passage';try{sfx.seaTransition();}catch(e){}render();window.scrollTo(0,0);return;}open(target);}
function map(){if(journeyEntry&&window.mindlabJourneyHub?.returnToMap){hub();window.mindlabJourneyHub.returnToMap();return}view='map';if(window.LA)LA.view=null;render();window.scrollTo(0,0);}
function hub(){journeyEntry=false;view='hub';if(window.LA)LA.view=null;renderPuz();window.scrollTo(0,0);}
function openSecret(ch,fromJourney=false){if(!D.chapters[ch]||!done(sealIndex(ch)))return;journeyEntry=fromJourney;active=sealIndex(ch);letterCh=ch;view='letter';go();}
function go(){if(curTab!=='puz')tab('puz');else render();window.scrollTo(0,0);}

/* ---------- shared pieces ---------- */
function sprite(n,cls=''){return E('span',{class:'t7-sprite '+cls,style:`--sx:${(n%4)*100/3}%;--sy:${Math.floor(n/4)*50}%`,'aria-hidden':'true'});}
function button(text,fn,cls=''){return E('button',{type:'button',class:'t7-btn '+cls,text,onclick:fn});}
function shell(){const v=$('#v-puz');v.classList.remove('trip');v.innerHTML='';v.classList.add('t7');return v;}
function toolIcon(text, fn, src) {
 const el=E('button',{type:'button',class:'t7-btn t7-tool-icon',text,onclick:fn,'aria-label':text,title:text});
 el.prepend(E('img',{src,alt:''}));
 return el;
}
function top(v,sub,title){
 const focus=view==='story'||view==='puzzle';
 const tools=focus?[
  toolIcon('الخريطة',map,'watercolor/art/icons54/map.webp'),
  toolIcon('دفتر الرحلة',()=>modal('notebook'),ART+'icon_journal.webp'),
  toolIcon('الكنوز',()=>modal('treasures'),'watercolor/art/icons54/chest.webp')
 ]:[
  view==='map'?button('كل الألغاز',hub):button('الخريطة',map),
  button('دفتر الرحلة',()=>modal('notebook')),button('الكنوز',()=>modal('treasures'))
 ];
 v.append(E('header',{class:'t7-top'+(focus?' t7-compact-top':'')},E('div',{},E('span',{class:'t7-kicker',text:sub}),E('h1',{text:title})),E('div',{class:'t7-tools'},...tools)));
}
function scene(s,celebrate=false){const el=E('div',{class:'t7-scene v5-scene'+(celebrate?' celebrate':''),style:`background-image:url('${ART}${s.scene}.webp')`},E('span',{class:'t7-location',text:s.name}));
 if(celebrate)el.append(E('div',{class:'t7-reveal'},E('b',{text:sealHere(s)?'اكتمل ختم البحر':s.finale?'انفتح الطريق الثامن':'انفتح الطريق'})));return el;}
const img=(name,alt='')=>E('img',{src:ART+name+'.webp',alt});
// Speaker portraits: [art, background-size, background-position]. Narrator lines have no portrait.
const PORTRAIT={'الملاح سالم':['character_salem','250%','50% 9%'],'حارسة الأجراس':['character_bell_guardian','330%','50% 6%'],'أمين القوافل':['character_caravan_keeper','330%','50% 6%'],
 'حارسة المرصد':['face_observatory_guardian'],'صانع الأشرعة':['face_sailmaker'],'حارس العهد':['face_oath_keeper'],'أمينة الخزانة':['face_treasury_keeper'],'الجد':['face_grandfather'],
 'رِواء':['crew_rawaa'],'نُهى':['crew_nuha'],'نَبض':['crew_nabd'],'شِبل':['crew_shibl'],'سُهيل':['crew_suhail'],'ورد':['crew_ward'],'نوفل':['crew_nawfal']};
// Crew identities and roles are anchored to the seven supplied character sheets (PDF pages 1–7).
const CREW_INFO=[
 {name:'رِواء',key:'rawaa',role:'الملاحة وقائدة الطاقم',task:'تقرأ الخرائط وتحدد اتجاه الرحلة.'},
 {name:'نُهى',key:'nuha',role:'مهندسة الآلات',task:'تفحص التروس والأقفال والآليات.'},
 {name:'نَبض',key:'nabd',role:'الرفيق الآلي',task:'يسجل الأنماط والإشارات المتكررة.'},
 {name:'شِبل',key:'shibl',role:'النمر المساند للطاقم',task:'يراقب التغيرات ويتتبع التفاصيل.'},
 {name:'سُهيل',key:'suhail',role:'حامل بلور الذاكرة',task:'يربط الأدلة والأسرار ببعضها.'},
 {name:'ورد',key:'ward',role:'حاملة الفانوس وقارئة الأدلة',task:'تكشف العلامات وما تخفيه الظلال.'},
 {name:'نوفل',key:'nawfal',role:'البحار وقائد زورق الخدمة',task:'يتولى العبور والمناورات البحرية.'}
];
function crewGuide(s){const who=(s.dialog&&s.dialog[s.dialog.length-1]||['ورد'])[0];return CREW_INFO.find(c=>c.name===who)||CREW_INFO[5];}
function crewRoster(){
 const details=E('details',{class:'v5-crew-roster'});
 details.append(E('summary',{text:'تعرّف على طاقم الرحلة · ٧ شخصيات'}));
 const grid=E('div',{class:'v5-crew-roster-grid'});
 CREW_INFO.forEach(c=>grid.append(E('article',{class:'v5-crew-card'},
  E('div',{class:'v5-crew-card-art'},E('img',{src:ART+'crew_full_'+c.key+'.webp',alt:c.name+' — '+c.role,loading:'lazy'})),
  E('div',{class:'v5-crew-card-copy'},E('b',{text:c.name}),E('strong',{text:c.role}),E('small',{text:c.task}))
 )));
 details.append(grid);return details;
}
function portrait(who){const p=PORTRAIT[who]||['icon_journal','80%','center'];return `background-image:url('${ART}${p[0]}.webp');background-size:${p[1]||'cover'};background-position:${p[2]||'center'};background-repeat:no-repeat;background-color:#2a3d44`;}

/* ---------- puzzles hub: Treasure Island card + the puzzle library in sections ---------- */
function renderHub(){const v=shell(),x=state(),count=Object.keys(x.done).length,stars=D.stations.reduce((n,s)=>n+B.chal(x,s.id).filter(Boolean).length,0);
 v.append(E('header',{class:'t7-top'},E('div',{},E('span',{class:'t7-kicker',text:'قصص وألغاز'}),E('h1',{text:'الألغاز'}))));
 v.append(E('button',{type:'button',class:'v5-hubcard',onclick:map,'aria-label':'جزيرة الكنز: افتح الخريطة'},E('span',{class:'v5-hubart'}),E('span',{class:'v5-hubtext'},E('span',{class:'t7-kicker',text:'حكايات البحار السبعة'}),E('b',{text:'جزيرة الكنز'}),
  E('small',{text:`${A(count)} / ٢١ محطة · ${A(x.rewards.length)} / ٧ أختام · ${A(stars)} نجمة`}),E('span',{class:'t7-btn primary',text:count?'تابع الرحلة':'ابدأ الرحلة'}))));

 const lib=E('section',{class:'v5-hublib'},E('h2',{class:'la-section-head',text:'مكتبة الألغاز'}));v.append(lib);if(window.LA&&LA.libraryInto)LA.libraryInto(lib);}

/* ---------- map ---------- */
function heroCard(){const count=Object.keys(state().done).length;return `<section class="t7-homecover"><div><span class="t7-kicker">حكايات البحار السبعة</span><h2>جزيرة الكنز</h2><p>اتبع القصة، افحص الدليل، وافتح الطريق إلى المملكة التالية.</p><button class="t7-btn primary" id="t7-homego">${count?'تابع رحلتك':'ابدأ الرحلة'}</button><small>${A(count)} من ٢١ محطة</small></div></section>`;}
function renderMap(){const v=shell(),x=state(),count=Object.keys(x.done).length;top(v,'جزيرة الكنز · القصة والألغاز','حكايات البحار السبعة');
 v.append(E('section',{class:'t7-maphero'},E('div',{},E('span',{class:'t7-kicker',text:'خريطة العهد'}),E('h2',{text:'كل لغز يفتح حكاية'}),E('p',{text:'سبعة بحار، سبع ممالك، وكنز ينتظر من يجمع أسرارها.'}),
  E('p',{class:'t7-counter',text:`${A(count)} / ٢١ محطة · ${A(x.rewards.length)} / ٧ أختام · ${A(Object.keys(x.bonus).length)} / ٧ أسرار`}),
  button(count===21?'أعد زيارة الرحلة':'تابع من حيث توقفت',()=>open(count===21?20:D.stations.findIndex(s=>!x.done[s.id])),'primary'))));
 v.append(crewRoster(),secretsMap());
 if(x.done['sea7_20'])v.append(E('section',{class:'v546-return-finale'},E('div',{},E('span',{class:'t7-kicker',text:'عهد الطريق الثامن'}),E('b',{text:'يمكنك العودة إلى كلمة الجد في أي وقت.'})),button('إعادة مشاهدة الخاتمة',openFinale,'primary')));
 const atlas=E('div',{class:'t7-atlas','aria-label':'أطلس البحار السبعة'}),places=[[20,15],[47,38],[24,65],[13,40],[85,43],[79,15],[80,77]];
 D.chapters.forEach((c,ch)=>{const first=D.stations.slice(ch*3,ch*3+3).find(s=>!x.done[s.id])||D.stations[ch*3+2],available=unlocked(ch*3),pos=places[ch];
  atlas.append(E('button',{type:'button',class:'t7-map-marker '+(done(ch*3+2)?'complete':available?'active':'locked'),style:`left:${pos[0]}%;top:${pos[1]}%`,disabled:!available,'aria-label':`الفصل ${A(ch+1)}: ${c[0]}`,title:c[0],text:A(ch+1),onclick:()=>open(first.i)}));});
 v.append(atlas);
 const journey=E('div',{class:'t7-journey'});
 D.chapters.forEach((c,ch)=>{const row=E('section',{class:'t7-chapter'},E('header',{},E('span',{class:'t7-chapter-no',text:A(ch+1)}),E('div',{},E('span',{class:'t7-kicker',text:`الفصل ${A(ch+1)}`}),E('h2',{text:c[0]}))));
  const list=E('div',{class:'t7-stations'});
  D.stations.slice(ch*3,ch*3+3).forEach(s=>{const available=unlocked(s.i);list.append(E('button',{type:'button',class:'t7-station '+(done(s.i)?'complete':available?'available':'locked'),disabled:!available,'aria-label':`${s.name} · ${done(s.i)?'مكتملة':available?'متاحة':'مغلقة'}`,onclick:()=>open(s.i)},
   E('div',{class:'t7-thumb',style:`background-image:url('${ART}thumbs/${s.scene}.webp');background-size:cover;background-position:center`},E('span',{class:'t7-badge',text:done(s.i)?'مكتملة ✓':available?'متاحة الآن':'بعد السابقة'})),
   E('div',{class:'t7-station-label'},E('small',{text:['إبحار','مملكة','جزيرة'][s.zone]}),E('strong',{text:s.name}),E('small',{text:s.title}),
    E('span',{class:'v5-station-guide'},E('img',{src:ART+'crew_'+stationGuide(s).key+'.webp',alt:'',loading:'lazy'}),E('span',{text:stationGuide(s).name})))));});
  const secret=D.secrets[ch],ready=done(sealIndex(ch));
  const chapterDone=D.stations.slice(ch*3,ch*3+3).filter(q=>!!x.done[q.id]).length;
  const chapterArt=E('div',{class:'v544-chapter-art'},E('img',{src:ART+D.SECRETS5[ch].art+'.webp',alt:'مشهد '+c[0],loading:'lazy'}));
  const chapterInfo=E('div',{class:'v544-chapter-info'},E('span',{class:'t7-kicker',text:'دليل البحر '+A(ch+1)}),E('h3',{text:c[1]}),E('p',{text:c[2]+' · '+c[3]}),E('div',{class:'v544-chapter-progress'},E('span',{text:`${A(chapterDone)} من ٣ محطات`}),E('span',{class:'v544-progress-track'},E('i',{style:`width:${chapterDone/3*100}%`}))));
  row.append(E('div',{class:'v544-chapter-overview'},chapterArt,chapterInfo),list,E('button',{class:'t7-btn t7-secret-entry',type:'button',disabled:!ready,text:x.bonus[secret.id]?'سر مكتشف: '+secret.collectible:ready?'اقرأ سر البحر':'سر البحر · بعد ختمه',onclick:()=>openSecret(ch)}));journey.append(row);});
 v.append(journey,E('p',{class:'t7-footnote',text:'تقدمك محفوظ في هذا الجهاز، وتشمله النسخة الاحتياطية من «مستواي».'}));}

function dailyCard(){const d=daily();if(!d)return E('section',{class:'v5-daily locked'},E('span',{class:'t7-kicker',text:'لغز اليوم'}),E('p',{text:'أكمل أول محطة ليفتح لك كل يوم لغز جديد من ألغاز الجزيرة.'}));
 return E('section',{class:'v5-daily'},E('div',{class:'v5-daily-art',style:`background-image:url('${ART}${d.s.scene}.webp')`}),E('div',{},E('span',{class:'t7-kicker',text:'لغز اليوم · ترتيب جديد كل يوم'}),E('h3',{text:d.s.title}),
  E('p',{text:d.done?`حللته اليوم في ${A(d.done.moves)} حركة (أقل عدد ${A(d.board.min)}).`:`أقل عدد للحل: ${A(d.board.min)} حركات.`}),button(d.done?'العبه مرة أخرى':'العب لغز اليوم',openDaily,'primary')));}
// The final door fills seal by seal as the secrets are found.
function secretsMap(){const x=state(),n=Object.keys(x.bonus).length;return E('section',{class:'v5-smap'},E('div',{class:'v5-smap-door'},...D.SECRETS5.map((Q,ch)=>{const got=!!x.bonus[D.secrets[ch].id];return E('button',{type:'button',class:'v5-smap-slot'+(got?' got':''),disabled:!got,'aria-label':got?Q.title:'سر لم يُكتشف بعد',onclick:()=>openSecret(ch)},got?img(Q.seal):E('i',{text:A(ch+1)}));})),
 E('p',{text:n===7?'اجتمعت الأختام السبعة على باب الطريق الثامن.':`${A(n)} من ٧ أختام على باب الطريق الثامن. كل سر تكتشفه يضيء ختمًا.`}));}

/* ---------- chapter-to-chapter passages: narrative only, no changes to puzzle rules ---------- */
const SEA_PASSAGES={
 1:{speaker:'رِواء',title:'نداء خلف الضباب',text:'عاد نور المنارة إلى البحر، لكنه لم يكشف الساحل التالي. حملت الريح نغمة جرس بعيدة، ثم أعادها الضباب ثلاث مرات. قالت رِواء: «هذه ليست مصادفة؛ هناك من يجيب عن إشارة جدّك. سنتبع الصوت، ونبقي المرفأ خلفنا آمنًا».',note:'أثبت ختم المرجان أن الضوء يبدأ من هنا. الآن نحتاج إلى الإصغاء لما يردّ عليه.',action:'اتبعوا نداء الأجراس حتى مملكة الضباب.'},
 2:{speaker:'نَبض',title:'خريطة تحت الرمل',text:'عند آخر مرسى للأجراس، التقط نَبض إيقاعًا يتكرر مع حركة القوافل. قارن الإشارات بما سجله من نداء الضباب، فظهرت قناة ماء مرسومة تحت خطوط الرمال. قال: «الإشارتان متصلتان؛ الطريق لا يختفي، بل يغيّر شكله».',note:'إيقاع الجرس لم يكن رسالة وحده؛ لقد دلّنا على قناة الماء المخفية.',action:'اعبروا بحر الرمال وابحثوا عن عهد الماء.'},
 3:{speaker:'نُهى',title:'أثر الماء في البلور',text:'حين انفتح مجرى الواحة، بقيت على بوابته خطوط باردة لا تشبه أثر الماء. فحصتها نُهى، ثم أدارت عدسة صغيرة نحو الجبال البيضاء. قالت: «هذه خدوش قياس، لا كسور. أحدهم رسم بها اتجاه المرصد قبل أن يتجمد الطريق».',note:'حفظتُ مواضع الصمامات؛ آثارها تقود إلى مرصد البلور.',action:'تابعوا الأثر إلى بحر الجليد.'},
 4:{speaker:'سُهيل',title:'ذاكرة النجمة',text:'داخل المرصد، التقط بلور الذاكرة صورة النجمة قبل أن تحجبها الغيوم. جمع سُهيل العلامة مع أثر الواحة، فاستقام اتجاه جديد نحو الأشرعة البعيدة. قال: «الجد لم يترك علامات متفرقة؛ كل واحدة تحفظ جزءًا من ذاكرة الطريق».',note:'أصبحت علامة البلور جزءًا من خريطة واحدة، لا دليلًا منفصلًا.',action:'استعدوا لعبور بحر العواصف.'},
 5:{speaker:'شِبل',title:'ما تخفيه العاصفة',text:'توقفت آلة الرياح لحظة، ثم ظهر على صخرتها أثر هلال يقود إلى بحر لا تثبت فيه النجوم. راقب شِبل الأثر من قرب وقال: «الرائحة هنا ليست رائحة احتراق؛ إنها ملح قديم. لقد مرّ أحدهم بهذا الطريق قبلنا».',note:'أثر الترس يؤكد أن العاصفة أوقفت الآلة، لكنها لم تمحُ مسار الجد.',action:'اتجهوا إلى بحر الظلال، حيث ينتظر ختم العهد.'},
 6:{speaker:'نوفل',title:'الممر إلى مملكة الفجر',text:'بعد اجتماع الأختام الستة، وجد نوفل تيارًا هادئًا بين الصخور. ثبت زورق الخدمة، وراجع مفتاح الحرارة، ثم قال: «البحر الأخير أمامنا. لن أسرع قبل أن أتأكد من الحمولة؛ الطريق الذي نحرسه يجب أن يصل بالجميع سالمين».',note:'لن يكون العبور الأخير سباقًا إلى الكنز؛ سلامة الطاقم هي العلامة السابعة.',action:'اركبوا زورق الخدمة نحو مملكة الفجر.'}
};
function renderPassage(){const target=D.stations[passageTarget],p=SEA_PASSAGES[target.ch],guide=CREW_INFO.find(c=>c.name===p.speaker)||CREW_INFO[0],v=shell();top(v,'بين البحرين · فصل جديد',D.chapters[target.ch][0]);
 const art=E('div',{class:'v545-passage-art'},E('img',{src:ART+target.scene+'.webp',alt:'مشهد '+D.chapters[target.ch][0],loading:'eager'}),E('span',{class:'v545-passage-number',text:'البحر '+A(target.ch+1)+' / ٧'}));
 const crew=E('aside',{class:'v545-passage-crew'},E('img',{src:ART+'crew_full_'+guide.key+'.webp',alt:guide.name+' — '+guide.role,loading:'eager'}),E('div',{},E('span',{class:'t7-kicker',text:'من ذاكرة الطاقم'}),E('b',{text:guide.name}),E('p',{text:'«'+p.note+'»'})));
 const card=E('section',{class:'t7-paper v545-passage-card'},E('span',{class:'t7-kicker',text:'عبور حكائي'}),E('h2',{text:p.title}),E('p',{text:p.text}),crew,E('div',{class:'v545-passage-destination'},E('small',{text:'المحطة التالية'}),E('b',{text:target.name}),E('span',{text:p.action})),button('ابدأ الفصل الجديد',()=>open(passageTarget),'primary v545-passage-go'),button('تجاوز المشهد',()=>open(passageTarget),'v545-passage-skip'));
 v.append(E('div',{class:'t7-story-layout v545-passage-layout'},art,card));}

/* ---------- story → puzzle → reward ---------- */
// One heroine introduces each station; the complete scene remains available in the story panel.
const OPENING_CREW=[
 ['nuha','شوفي نافذة القفل. تقول لنا وش نضبط قبل ما نسحبه.'],
 ['ward','خلّينا نقارن الرموز بقرائن المخزن قبل ما نبدّلها.'],
 ['nuha','نتتبّع الشعاع من مصدره ونشوف وين نحتاج نغيّر اتجاهه.'],
 ['rawaa','خلّينا نوصل علامات الحواف حتى تتضح خريطة الساحل.'],
 ['ward','فيه فرق بين «قبل» و«مباشرة بعد». قارني النقوش قبل أول ضربة.'],
 ['nuha','كل طائر ممكن يحرّك اللي بجنبه. راقبي الروابط أول.'],
 ['rawaa','وقت وصولنا للرصيف أهم من وقت انطلاقنا.'],
 ['ward','كل وزنة تساعدنا نستبعد مجموعة من الحجارة.'],
 ['nuha','نتتبّع الماء من المنبع ونشوف وين يتفرّع.'],
 ['rawaa','خلّينا نحرّك الألواح ونقارنها بالخريطة.'],
 ['nuha','كل لمسة تقلب البلورة وجاراتها. خلّينا نحسب الأثر.'],
 ['ward','البطاقات تقول لنا وين نحط القطع قبل ما نجرّب الميزان.'],
 ['rawaa','اتبعي الحبل وشوفي أي حلقة تعلو الثانية.'],
 ['nuha','الترس الأول يدور. مهمتنا نوصل دورانه للأخير.'],
 ['nuha','راقبي أثر اللفة على كل منفذ قبل اللفة التالية.'],
 ['rawaa','قبل ما ندفع الحجر، شيّكي المساحة قدّامه وخلفه.'],
 ['rawaa','نبغى نمر بكل وصلة مرة واحدة. خلّينا نتتبّعها من البداية.'],
 ['ward','كل حلقة تحتاج مكانًا يستوعب حجمها.'],
 ['ward','قبل ما نبحر، شيّكي مين بيبقى على الضفة.'],
 ['rawaa','خلّينا ننتبه لاتجاه كل زورق والفراغ اللي قدّامه.'],
 ['ward','الرسائل السبع معنا. خلّينا نطابق كل ختم مع دليله.']
];
function stationGuide(s){return CREW_INFO.find(c=>c.key===OPENING_CREW[s.i][0]);}
function renderStory(){
 const s=D.stations[active],v=shell(),guide=stationGuide(s);
 top(v,`الفصل ${A(s.ch+1)} · المحطة ${A(active+1)}`,s.name);
 const lines=s.dialog.map(([who,text])=>E('p',{class:'v5-story-line'},who==='الراوي'?null:E('b',{text:who+': '}),text));
 const bubble=E('div',{class:'t7-hero-intro'},E('img',{src:ART+'crew_full_'+guide.key+'.webp',alt:guide.name}),
  E('div',{class:'t7-speech'},E('b',{text:guide.name}),E('p',{text:OPENING_CREW[s.i][1]})));
 const story=E('details',{class:'t7-story-more'},E('summary',{text:'مشهد القصة'}),...lines);
 const begin=()=>{view='puzzle';render();window.scrollTo(0,0);};
 const opening=window.mindlabJourneyHub;
 const rules=()=>opening ? opening.beforeStation(s.id,begin,s.goal) : begin();
 const card=E('section',{class:'t7-dialog v5-intro t7-compact-intro'},E('h2',{class:'v5-intro-title',text:s.title}),bubble,
  button('قواعد المحطة',rules,'primary v5-intro-go'),story);
 v.append(E('div',{class:'t7-story-layout'},scene(s),card));
 if(opening)rules();
}
function renderPuzzle(){const s=D.stations[active],v=shell(),x=state();top(v,`الفصل ${A(s.ch+1)} · المحطة ${A(active+1)}`,s.title);const sc=scene(s);sc.classList.add('t7-puzzle-scene');
 const host=E('section',{class:'t7-puzzle-pane v5-pane'});v.append(E('div',{class:'t7-puzzle-layout v5-layout','data-station-id':s.id},sc,host));
 const ctx={s,x,E,button,A,save,done:()=>!!x.done[s.id],sealed:()=>done(sealIndex(s.ch)),work:current,setWork:w=>{x.work[s.id]=w},onFirstWin:win,onDaily:dailyDone,map,guide:stationGuide(s).name,rerender:()=>B.render(host,ctx)};B.render(host,ctx);}
function win(){const s=D.stations[active],x=state();if(!L.solved(live(),current()))return;const firstWin=!x.done[s.id];
 x.done[s.id]=x.done[s.id]||{at:Date.now(),moves:x.moves[s.id]||0,hints:x.hints[s.id]||0};const T=B.v5state(x);if(s.gives&&!T.tools[s.gives])T.tools[s.gives]='new';
 if(sealHere(s)){if(!x.rewards.includes(s.ch))x.rewards.push(s.ch);const q=D.secrets[s.ch];if(!x.bonus[q.id])x.bonus[q.id]={at:Date.now(),moves:0,hints:0,tool:false};}
 x.resume=Math.min(20,active+1);save();view='reward';try{sfx.ok(2);}catch(e){}render();window.scrollTo(0,0);
 if(firstWin&&typeof window.dispatchEvent==='function'&&typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('mindlab:journey-progress',{detail:{chapter:'seven_seas',station:active}}));}
function stars(s){return 'التحديات: '+B.chal(state(),s.id).slice(0,3).map(d=>d?'★':'☆').join(' ');}
function renderReward(){const s=D.stations[active];if(s.finale)return renderFinale();const v=shell(),T=s.gives?D.SEA1_TOOLS[s.gives]:null,Q=D.SECRETS5[s.ch],seal=sealHere(s);top(v,'أثر الحل',s.name);
 const fig=(art,cap)=>E('figure',{},img(art),E('figcaption',{text:cap}));
 const guide=crewGuide(s),crewNote=(s.dialog&&s.dialog[s.dialog.length-1])||[guide.name,guide.task];
 const crewDebrief=E('aside',{class:'v544-crew-debrief'},E('img',{src:ART+'crew_full_'+guide.key+'.webp',alt:guide.name+' — '+guide.role,loading:'eager'}),E('div',{},E('span',{class:'t7-kicker',text:'من دفتر الطاقم'}),E('b',{text:guide.name}),E('p',{text:'«'+crewNote[1]+'»'})));
 const card=E('section',{class:'t7-paper v5-reward'},E('span',{class:'t7-kicker',text:'خطوة جديدة في الرحلة'}),E('h2',{text:seal?'حصلت على '+Q.sealName+' وسر '+(s.zone===2?'الجزيرة':'المملكة'):T?'حصلت على '+T.name:'انفتح الطريق'}),E('p',{text:s.outcome}),crewDebrief,
  E('div',{class:'v5-loot'},T?fig(T.art,T.name):null,seal?fig(Q.seal,Q.sealName):null,seal?fig(Q.art,Q.title):null),
  E('p',{class:'t7-help',text:T?'استعمالها: '+T.use+'. حُفظت في دفتر الرحلة.':seal?'حُفظ الختم والسر في دفتر الرحلة.':'حُفظت المحطة في دفتر الرحلة.'}),
  E('p',{class:'v5-stars',text:stars(s)+' · يمكنك العودة لنيل النجوم الباقية.'}),button('إلى المحطة التالية',continueJourney,'primary'),button('العب التحدي التالي',()=>{view='puzzle';render();}));
 if(seal)card.append(button('اقرأ '+Q.title,()=>openSecret(s.ch)));
 const icons=['next','start','check'];
 card.querySelectorAll(':scope > button').forEach((control,index)=>window.puzzleAction?.(control,icons[index]));
 v.append(E('div',{class:'t7-story-layout'},scene(s,true),card));}
function sealMemory(){
 const grid=E('div',{class:'v546-seal-grid'});
 D.SECRETS5.forEach((q,ch)=>grid.append(E('article',{class:'v546-seal-card'},
  E('img',{src:ART+q.seal+'.webp',alt:q.sealName,loading:'lazy'}),
  E('div',{},E('small',{text:'الختم '+A(ch+1)}),E('b',{text:q.sealName}),E('span',{text:q.title}),E('p',{text:q.mark}))
 )));
 const crew=E('div',{class:'v546-crew-grid'});
 CREW_INFO.forEach(c=>crew.append(E('article',{class:'v546-crew-credit'},
  E('img',{src:ART+'crew_full_'+c.key+'.webp',alt:c.name+' — '+c.role,loading:'lazy'}),
  E('div',{},E('b',{text:c.name}),E('span',{text:c.role}))
 )));
 return E('section',{class:'v546-memory'},
  E('header',{},E('span',{class:'t7-kicker',text:'دفتر العهد · خلاصة الطريق'}),E('h3',{text:'سبعة أختام، وحكاية واحدة'}),E('p',{text:'لم تكن العلامات السبع متفرقة؛ كل واحدة منها أكملت جزءًا من مسار الضوء، حتى صار الطريق الثامن ممرًا آمنًا لا غنيمة مغلقة.'})),
  grid,
  E('div',{class:'v546-memory-oath'},E('b',{text:'عهد الطريق الثامن'}),E('p',{text:'«لا يكتمل الكنز إذا وصل إليه واحد وبقي الآخرون تائهين. أبقوا الممر مفتوحًا، وساعدوا من يأتي بعدكم».'}),E('small',{text:'الجد · المرفأ الداخلي'})),
  E('div',{class:'v546-crew-credit-wrap'},E('h4',{text:'حماة الطريق الجدد'}),E('p',{text:'لم يعد الجد يحرس الممر وحده؛ صار لكل فرد من الطاقم دور في إبقاء الرحلة آمنة.'}),crew)
 );
}
function openFinale(){const openModal=document.querySelector('.t7-modal[open]');if(openModal)openModal.close();active=20;view='reward';render();window.scrollTo(0,0);}
function openFinaleFromJourney(){if(!done(20))return;journeyEntry=true;openFinale();}
function renderFinale(){const s=D.stations[active],v=shell();top(v,'اكتملت حكايات البحار السبعة','الطريق الثامن');
 const ending=E('section',{class:'t7-paper v5-reward'},E('span',{class:'t7-kicker',text:'نهاية الرحلة'}),E('h2',{text:'وجدت جدّك'}),
  E('p',{text:'اتصل الضوء عبر الأختام، وانفتح الباب على مرفأ مضيء. هناك كان جدّك، حيًّا، يرفع آخر إشارة للمسافرين. ابتسم وقال: «لم أخفِ عنك كنزًا؛ تركت لك ما يجعلك أهلًا لحراسته معي».'}),
  E('p',{class:'t7-help',text:'بقي الجد بإرادته عند المرفأ الداخلي يرعى إشارات الطريق بعدما قطعت العواصف الاتصال بالمراسي، ووزّع الأدلة عند الأمناء حتى لا يحتكر طالبو الذهب الممر. ما أصلحته في رحلتك أعاد الاتصال، ففتح الطريق بأمان.'}),
  sealMemory(),
  E('p',{class:'v5-stars',text:stars(s)+' · يمكنك إعادة أي محطة لنيل النجوم الباقية.'}),
  button('العودة إلى الخريطة',map,'primary'),button('دفتر الرحلة',()=>modal('notebook')),button('العب التحدي التالي',()=>{view='puzzle';render();}));
 v.append(E('div',{class:'t7-story-layout'},E('div',{class:'v5-finale'},E('img',{class:'v5-finale-scene',src:ART+s.scene+'.webp',alt:''}),E('i',{class:'v5-finale-light','aria-hidden':'true'}),E('img',{class:'v5-finale-gf',src:ART+'character_grandfather.webp',alt:'الجد'})),ending));}
function renderLetter(){const v=shell(),Q=D.SECRETS5[letterCh],next=letterCh===6?20:(letterCh+1)*3;top(v,'سر '+D.chapters[letterCh][0],Q.title);
 const mark=E('div',{class:'v5-letter-mark'+(Q.col?' col':'')+(Q.after?' after':''),'aria-label':Q.mark},...Q.markArt.map(a=>img(a)),E('span',{text:Q.arrow}));
 v.append(E('div',{class:'t7-story-layout'},E('div',{class:'v5-letter'},img(Q.art),E('p',{text:Q.text}),mark),
  E('section',{class:'t7-paper'},E('span',{class:'t7-kicker',text:'دليل محفوظ للنهاية'}),E('h2',{text:Q.title}),E('p',{text:Q.mark+' احتفظ بها حتى تجتمع أدلة البحار السبعة.'}),
   button('العودة إلى الخريطة',map,'primary'),next<21&&unlocked(next)?button('إلى '+(letterCh===6?D.stations[20].name:D.chapters[letterCh+1][0]),()=>journeyEntry?map():open(next)):null)));}

/* ---------- notebook & treasures ---------- */
function modal(kind){const nb=kind==='notebook',d=E('dialog',{class:'t7-modal','aria-label':nb?'دفتر الرحلة':'خزانة الكنوز'}),x=state(),T=B.v5state(x);
 d.append(E('header',{},E('h2',{text:nb?'دفتر الرحلة':'خزانة الكنوز'}),button('إغلاق',()=>d.close())));
 if(nb){D.stations.filter(s=>unlocked(s.i)).forEach(s=>{const a=E('article',{class:'v5-page'},E('h3',{text:s.name+' · '+s.title}),...s.story.map(t=>E('p',{text:t})),E('p',{class:'v5-page-clue',text:'الدليل: '+s.clue}));
   if(s.needs)a.append(E('p',{text:'الأداة اللازمة: '+[].concat(s.needs).map(n=>D.SEA1_TOOLS[n].name).join(' و')}));
   if(x.done[s.id]&&s.gives){const t=D.SEA1_TOOLS[s.gives];a.append(E('p',{class:'v5-page-tool'},img(t.art),E('span',{text:t.name+' — '+(T.tools[s.gives]==='used'?'استُعملت':'جديدة')+' · '+t.use})));}d.append(a);});
  D.SECRETS5.forEach((Q,ch)=>{if(x.bonus[D.secrets[ch].id])d.append(E('article',{class:'v5-page'},E('h3',{text:'سر '+D.chapters[ch][0]+' · '+Q.title}),E('p',{text:Q.text}),E('p',{class:'v5-page-clue',text:'الدليل: '+Q.mark})));});
  if(x.done['sea7_20'])d.append(E('article',{class:'v5-page v546-notebook-oath'},E('h3',{text:'خاتمة الطريق الثامن · عهد الجد'}),E('p',{text:'لم يجمع الجد العلامات ليغلق بها خزينة؛ بل وزّعها حتى لا يحتكر أحد الممر. حين اجتمعت الأختام، عاد الاتصال بين المراسي وأصبح الطريق مفتوحًا للمسافرين.'}),...D.SECRETS5.map((Q,ch)=>E('p',{class:'v5-page-clue',text:(ch+1)+'. '+Q.sealName+' — '+Q.mark})),E('p',{text:'حماة الطريق: '+CREW_INFO.map(c=>c.name).join(' · ')}),button('إعادة مشاهدة خاتمة الجد',openFinale,'primary')));}
 else{D.chapters.forEach((c,i)=>d.append(E('article',{class:'t7-treasure '+(x.rewards.includes(i)?'earned':'unearned')},img(D.SECRETS5[i].seal),E('div',{},E('h3',{text:c[3]}),E('p',{text:x.rewards.includes(i)?'اكتسبته في '+c[0]:'يُفتح بعد ختم '+c[0]})))));
  d.append(E('h3',{text:'أدوات الرحلة'}));Object.entries(D.SEA1_TOOLS).forEach(([k,t])=>d.append(E('p',{class:'t7-inventory-item',text:(T.tools[k]?'✓ ':'… ')+t.name})));
  d.append(E('h3',{text:'الأسرار'}));D.secrets.forEach(q=>d.append(E('p',{text:x.bonus[q.id]?'✓ '+q.collectible:'سر لم يُكتشف في '+D.chapters[q.ch][0]})));}
 document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();}

function render(){({hub:renderHub,map:renderMap,story:renderStory,puzzle:renderPuzzle,reward:renderReward,letter:renderLetter,passage:renderPassage})[view]();}
window.T7={open,openSecret,openFinale,openFinaleFromJourney,openJournal:modal,map,hub,render,state,unlocked,data:D,logic:L};

/* ---------- saves: cloud merge and backups ---------- */
DX.KEYS.push('treasureV3');
// Merge earned progress across devices, keeping the more recent unfinished boards.
const merge0=S.merge.bind(S);S.merge=function(remote){const local=JSON.parse(JSON.stringify(state()));merge0(remote);const incoming=remote&&remote.treasureV3;if(!incoming)return;
 try{fillAbsent(incoming);L.cleanWork(incoming,D.stations);L.validateProgress(incoming,D.stations);}catch(e){S.st.treasureV3=local;return;}
 const latest=(incoming.updatedAt||0)>(local.updatedAt||0)?incoming:local,other=latest===incoming?local:incoming;
 const merged={...latest,done:{...other.done,...latest.done},notes:{...other.notes,...latest.notes},work:{...other.work,...latest.work},hints:{...other.hints,...latest.hints},moves:{...other.moves,...latest.moves},bonus:{...other.bonus,...latest.bonus},usedTools:{...other.usedTools,...latest.usedTools},rewards:[...new Set([...local.rewards,...incoming.rewards])]};
 for(const key of ['hints','moves'])for(const id of Object.keys(other[key]))merged[key][id]=Math.max(merged[key][id]||0,other[key][id]||0);
 if(local.v5||incoming.v5)merged.v5=mergeV5(local.v5,incoming.v5,latest===incoming);S.st.treasureV3=merged;};
// Challenge stars and tools are earned: keep the union; the current attempt follows the newer copy.
function mergeV5(a={},b={},bNewer){const out={ch:{},att:{...(bNewer?a.att:b.att),...(bNewer?b.att:a.att)},tools:{...a.tools,...b.tools}};
 for(const id of new Set([...Object.keys(a.ch||{}),...Object.keys(b.ch||{})]))out.ch[id]=[0,1,2].map(k=>!!((a.ch||{})[id]?.[k]||(b.ch||{})[id]?.[k]));
 for(const k of Object.keys(out.tools))if((a.tools||{})[k]==='used'||(b.tools||{})[k]==='used')out.tools[k]='used';return out;}
// 5.4.8: journey records from older editions may lack maps added later (notes, moves, hints…).
// Fill only the ABSENT ones — exactly what state() does on this device — so an old backup or another
// device's copy restores instead of being rejected; wrong types are still rejected by validateProgress.
function fillAbsent(p){if(!p||typeof p!=='object'||Array.isArray(p))return p;for(const k of ['done','work','notes','hints','moves'])if(p[k]==null)p[k]={};if(p.rewards==null)p.rewards=[];return p;}
if(typeof DX.validateBackup==='function'){const validate0=DX.validateBackup;DX.validateBackup=function(data){const st=validate0(data);if(st.treasureV3){fillAbsent(st.treasureV3);L.cleanWork(st.treasureV3,D.stations);L.validateProgress(st.treasureV3,D.stations);}return st;};}

/* ---------- entry points ---------- */
renderPuz=render;
const h0=renderHome;renderHome=function(){h0();const host=$('#v-home');host.querySelectorAll('.dx-covers,.dx-head').forEach(n=>{if(n.parentElement?.querySelector('[data-world]'))n.parentElement.remove();});host.prepend(E('div',{html:heroCard()}));$('#t7-homego').onclick=()=>{view='map';tab('puz');};};
const quit0=closePlay;closePlay=function(){document.body.classList.remove('t7-classic-play');quit0();};$('#quit')&&($('#quit').onclick=closePlay);
const p0=renderMe;renderMe=function(){p0();const t=$('#dxBackupStatus');if(t)t.textContent='تشمل النسخة ألعابك وملفات الأطفال ودفتر رحلة جزيرة الكنز.';};
const nav=document.querySelector('.tab[data-tab="puz"]');if(nav){const label=nav.querySelector('span:last-child');if(label)label.textContent='جزيرة الكنز';}
renderAll();
})();
