'use strict';
/* Treasure Island 5.0 · «حكايات البحار السبعة» — map, story, board, reward, letters, notebook and save handling.
   Progress lives in S.st.treasureV3 (save key miran:v2). Boards are drawn by boards.js. */
(function(){
const D=TreasureData,L=TreasureLogic,B=TreasureBoards,E=DX.el,A=DX.AR,$=DX.$,ART=B.ART;
let view='map',active=0,dialogAt=0,letterCh=0;

/* ---------- progress ---------- */
// The seal + secret of a sea come with its island; in the last sea they come at the Dawn Kingdom, before the final door.
const sealHere=s=>!!s&&(s.seal||(s.zone===2&&!s.finale)),sealIndex=ch=>D.stations.slice(ch*3,ch*3+3).find(sealHere).i;
function state(){const x=S.st.treasureV3||(S.st.treasureV3={version:3,done:{},work:{},notes:{},hints:{},rewards:[],moves:{},resume:null});
 for(const k of ['done','work','notes','hints','moves','bonus','usedTools'])if(!x[k]||typeof x[k]!=='object')x[k]={};if(!Array.isArray(x.rewards))x.rewards=[];migrate(x);return x;}
/* Once per load: drop boards that do not fit the current puzzles, and grant tools, seals and secrets already earned. */
function migrate(x){if(x.__v5)return;Object.defineProperty(x,'__v5',{value:true,enumerable:false});L.cleanWork(x,D.stations);const T=B.v5state(x);
 D.stations.forEach(s=>{if(!x.done[s.id])return;if(s.gives&&!T.tools[s.gives])T.tools[s.gives]='new';if(sealHere(s)&&!x.rewards.includes(s.ch))x.rewards.push(s.ch);});
 D.secrets.forEach(q=>{if(x.done[D.stations[sealIndex(q.ch)].id]&&!x.bonus[q.id])x.bonus[q.id]={at:Date.now(),moves:0,hints:0,tool:false};});}
const save=()=>{state().updatedAt=Date.now();S.save();},done=i=>!!state().done[D.stations[i]?.id],unlocked=i=>i===0||done(i-1);
function current(){const s=D.stations[active],x=state();return x.work[s.id]||(x.work[s.id]=L.initial(s));}

/* ---------- navigation ---------- */
function open(i){if(!unlocked(i))return;active=i;dialogAt=0;view='story';state().resume=i;save();go();}
function map(){view='map';render();}
function openSecret(ch){if(!done(sealIndex(ch)))return;active=sealIndex(ch);letterCh=ch;view='letter';go();}
function go(){if(curTab!=='puz')tab('puz');else render();window.scrollTo(0,0);}

/* ---------- shared pieces ---------- */
function sprite(n,cls=''){return E('span',{class:'t7-sprite '+cls,style:`--sx:${(n%4)*100/3}%;--sy:${Math.floor(n/4)*50}%`,'aria-hidden':'true'});}
function button(text,fn,cls=''){return E('button',{type:'button',class:'t7-btn '+cls,text,onclick:fn});}
function shell(){const v=$('#v-puz');v.classList.remove('trip');v.innerHTML='';v.classList.add('t7');return v;}
function top(v,sub,title){v.append(E('header',{class:'t7-top'},E('div',{},E('span',{class:'t7-kicker',text:sub}),E('h1',{text:title})),E('div',{class:'t7-tools'},button('الخريطة',map),button('دفتر الرحلة',()=>modal('notebook')),button('الكنوز',()=>modal('treasures')))));}
function scene(s,celebrate=false){const el=E('div',{class:'t7-scene v5-scene'+(celebrate?' celebrate':''),style:`background-image:url('${ART}${s.scene}.webp')`},E('span',{class:'t7-location',text:s.name}));
 if(celebrate)el.append(E('div',{class:'t7-reveal'},E('b',{text:sealHere(s)?'اكتمل ختم البحر':s.finale?'انفتح الطريق الثامن':'انفتح الطريق'})));return el;}
const img=(name,alt='')=>E('img',{src:ART+name+'.webp',alt});
// Speaker portraits: [art, background-size, background-position]. Narrator lines have no portrait.
const PORTRAIT={'الملاح سالم':['character_salem','250%','50% 9%'],'حارسة الأجراس':['character_bell_guardian','330%','50% 6%'],'أمين القوافل':['character_caravan_keeper','330%','50% 6%'],
 'حارسة المرصد':['face_observatory_guardian'],'صانع الأشرعة':['face_sailmaker'],'حارس العهد':['face_oath_keeper'],'أمينة الخزانة':['face_treasury_keeper'],'الجد':['face_grandfather'],
 'رِواء':['crew_rawaa'],'نُهى':['crew_nuha'],'نَبض':['crew_nabd'],'شِبل':['crew_shibl'],'سُهيل':['crew_suhail'],'ورد':['crew_ward'],'نوفل':['crew_nawfal']};
function portrait(who){const p=PORTRAIT[who]||['icon_journal','80%','center'];return `background-image:url('${ART}${p[0]}.webp');background-size:${p[1]||'cover'};background-position:${p[2]||'center'};background-repeat:no-repeat;background-color:#2a3d44`;}

/* ---------- map ---------- */
function heroCard(){const count=Object.keys(state().done).length;return `<section class="t7-homecover"><div><span class="t7-kicker">حكايات البحار السبعة</span><h2>جزيرة الكنز</h2><p>اتبع القصة، افحص الدليل، وافتح الطريق إلى المملكة التالية.</p><button class="t7-btn primary" id="t7-homego">${count?'تابع رحلتك':'ابدأ الرحلة'}</button><small>${A(count)} من ٢١ محطة</small></div></section>`;}
function renderMap(){const v=shell(),x=state(),count=Object.keys(x.done).length;top(v,'جزيرة الكنز · القصة والألغاز','حكايات البحار السبعة');
 v.append(E('section',{class:'t7-maphero'},E('div',{},E('span',{class:'t7-kicker',text:'خريطة العهد'}),E('h2',{text:'كل لغز يفتح حكاية'}),E('p',{text:'سبعة بحار، سبع ممالك، وكنز ينتظر من يجمع أسرارها.'}),
  E('p',{class:'t7-counter',text:`${A(count)} / ٢١ محطة · ${A(x.rewards.length)} / ٧ أختام · ${A(Object.keys(x.bonus).length)} / ٧ أسرار`}),
  button(count===21?'أعد زيارة الرحلة':'تابع من حيث توقفت',()=>open(count===21?20:D.stations.findIndex(s=>!x.done[s.id])),'primary'))));
 const atlas=E('div',{class:'t7-atlas','aria-label':'أطلس البحار السبعة'}),places=[[20,15],[47,38],[24,65],[13,40],[85,43],[79,15],[80,77]];
 D.chapters.forEach((c,ch)=>{const first=D.stations.slice(ch*3,ch*3+3).find(s=>!x.done[s.id])||D.stations[ch*3+2],available=unlocked(ch*3),pos=places[ch];
  atlas.append(E('button',{type:'button',class:'t7-map-marker '+(done(ch*3+2)?'complete':available?'active':'locked'),style:`left:${pos[0]}%;top:${pos[1]}%`,disabled:!available,'aria-label':`الفصل ${A(ch+1)}: ${c[0]}`,title:c[0],text:A(ch+1),onclick:()=>open(first.i)}));});
 v.append(atlas);
 const journey=E('div',{class:'t7-journey'});
 D.chapters.forEach((c,ch)=>{const row=E('section',{class:'t7-chapter'},E('header',{},E('span',{class:'t7-chapter-no',text:A(ch+1)}),E('div',{},E('span',{class:'t7-kicker',text:`الفصل ${A(ch+1)}`}),E('h2',{text:c[0]}))));
  const list=E('div',{class:'t7-stations'});
  D.stations.slice(ch*3,ch*3+3).forEach(s=>{const available=unlocked(s.i);list.append(E('button',{type:'button',class:'t7-station '+(done(s.i)?'complete':available?'available':'locked'),disabled:!available,'aria-label':`${s.name} · ${done(s.i)?'مكتملة':available?'متاحة':'مغلقة'}`,onclick:()=>open(s.i)},
   E('div',{class:'t7-thumb',style:`background-image:url('${ART}${s.scene}.webp');background-size:cover;background-position:center`},E('span',{class:'t7-badge',text:done(s.i)?'مكتملة ✓':available?'متاحة الآن':'بعد السابقة'})),
   E('div',{class:'t7-station-label'},E('small',{text:['إبحار','مملكة','جزيرة'][s.zone]}),E('strong',{text:s.name}),E('small',{text:s.title}))));});
  const secret=D.secrets[ch],ready=done(sealIndex(ch));
  row.append(list,E('button',{class:'t7-btn t7-secret-entry',type:'button',disabled:!ready,text:x.bonus[secret.id]?'سر مكتشف: '+secret.collectible:ready?'اقرأ سر البحر':'سر البحر · بعد ختمه',onclick:()=>openSecret(ch)}));journey.append(row);});
 const classics=E('section',{class:'t7-classics'},E('span',{class:'t7-kicker',text:'من ألغاز النسخة الأصلية'}),E('h2',{text:'تحديات القبطان'}),E('p',{class:'t7-help',text:'ألغاز إضافية مستقلة عن مسار القصة، بقواعدها الأصلية ومستوياتها المحفوظة.'})),classicList=E('div',{class:'t7-classic-grid'});
 ['pz_lock','pz_stat','pz_scale','pz_pipe','pz_river','pz_rush','pz_grid','tol'].filter(id=>GM[id]).forEach((id,i)=>{const g=GM[id];classicList.append(E('button',{class:'t7-classic',type:'button','data-puzzle-id':id,onclick:()=>{document.body.classList.add('t7-classic-play');startRun([id]);}},sprite([6,2,4,1,0,9,10,5][i]),E('b',{text:g.name}),E('small',{text:'افتح التحدي'})));});
 classics.append(classicList);v.append(journey,classics,E('p',{class:'t7-footnote',text:'تقدمك محفوظ في هذا الجهاز، وتشمله النسخة الاحتياطية من «مستواي».'}));}

/* ---------- story → puzzle → reward ---------- */
function renderStory(){const s=D.stations[active],v=shell();top(v,`الفصل ${A(s.ch+1)} · المحطة ${A(active+1)}`,s.name);const [who,text]=s.dialog[Math.min(dialogAt,s.dialog.length-1)],narrator=who==='الراوي';
 const dialog=E('section',{class:'t7-dialog'+(narrator?' v5-narrator':'')},narrator?null:E('div',{class:'t7-portrait',style:portrait(who),'aria-hidden':'true'}),E('div',{},E('span',{class:'t7-kicker',text:who}),E('p',{text}),
  E('div',{class:'t7-dialog-nav'},E('small',{text:`${A(dialogAt+1)} / ${A(s.dialog.length)}`}),button(dialogAt<s.dialog.length-1?'متابعة الحوار':'ابدأ اللغز',()=>{if(dialogAt<s.dialog.length-1)dialogAt++;else view='puzzle';render();},'primary'))));
 v.append(E('div',{class:'t7-story-layout'},scene(s),dialog));}
function renderPuzzle(){const s=D.stations[active],v=shell(),x=state();top(v,`الفصل ${A(s.ch+1)} · المحطة ${A(active+1)}`,s.title);const sc=scene(s);sc.classList.add('t7-puzzle-scene');
 const host=E('section',{class:'t7-puzzle-pane v5-pane'});v.append(E('div',{class:'t7-puzzle-layout v5-layout'},sc,host));
 const ctx={s,x,E,button,A,save,done:()=>!!x.done[s.id],work:current,setWork:w=>{x.work[s.id]=w},onFirstWin:win,map,notebook:()=>modal('notebook'),rerender:()=>B.render(host,ctx)};B.render(host,ctx);}
function win(){const s=D.stations[active],x=state();if(!L.solved(s,current()))return;
 x.done[s.id]=x.done[s.id]||{at:Date.now(),moves:x.moves[s.id]||0,hints:x.hints[s.id]||0};const T=B.v5state(x);if(s.gives&&!T.tools[s.gives])T.tools[s.gives]='new';
 if(sealHere(s)){if(!x.rewards.includes(s.ch))x.rewards.push(s.ch);const q=D.secrets[s.ch];if(!x.bonus[q.id])x.bonus[q.id]={at:Date.now(),moves:0,hints:0,tool:false};}
 x.resume=Math.min(20,active+1);save();view='reward';try{sfx.ok(2);}catch(e){}render();window.scrollTo(0,0);}
function stars(s){return 'التحديات: '+B.chal(state(),s.id).map(d=>d?'★':'☆').join(' ');}
function renderReward(){const s=D.stations[active];if(s.finale)return renderFinale();const v=shell(),T=s.gives?D.SEA1_TOOLS[s.gives]:null,Q=D.SECRETS5[s.ch],seal=sealHere(s);top(v,'أثر الحل',s.name);
 const fig=(art,cap)=>E('figure',{},img(art),E('figcaption',{text:cap}));
 const card=E('section',{class:'t7-paper v5-reward'},E('span',{class:'t7-kicker',text:'خطوة جديدة في الرحلة'}),E('h2',{text:seal?'حصلت على '+Q.sealName+' وسر '+(s.zone===2?'الجزيرة':'المملكة'):T?'حصلت على '+T.name:'انفتح الطريق'}),E('p',{text:s.outcome}),
  E('div',{class:'v5-loot'},T?fig(T.art,T.name):null,seal?fig(Q.seal,Q.sealName):null,seal?fig(Q.art,Q.title):null),
  E('p',{class:'t7-help',text:T?'استعمالها: '+T.use+'. حُفظت في دفتر الرحلة.':seal?'حُفظ الختم والسر في دفتر الرحلة.':'حُفظت المحطة في دفتر الرحلة.'}),
  E('p',{class:'v5-stars',text:stars(s)+' · يمكنك العودة لنيل النجوم الباقية.'}),button('إلى المحطة التالية',()=>open(active+1),'primary'),button('العب التحدي التالي',()=>{view='puzzle';render();}));
 if(seal)card.append(button('اقرأ '+Q.title,()=>openSecret(s.ch)));
 v.append(E('div',{class:'t7-story-layout'},scene(s,true),card));}
function renderFinale(){const s=D.stations[active],v=shell();top(v,'اكتملت حكايات البحار السبعة','الطريق الثامن');
 v.append(E('div',{class:'t7-story-layout'},E('div',{class:'v5-finale'},E('img',{class:'v5-finale-scene',src:ART+s.scene+'.webp',alt:''}),E('i',{class:'v5-finale-light','aria-hidden':'true'}),E('img',{class:'v5-finale-gf',src:ART+'character_grandfather.webp',alt:'الجد'})),
  E('section',{class:'t7-paper v5-reward'},E('span',{class:'t7-kicker',text:'نهاية الرحلة'}),E('h2',{text:'وجدت جدّك'}),
   E('p',{text:'اتصل الضوء عبر الأختام، وانفتح الباب على مرفأ مضيء. هناك كان جدّك، حيًّا، يرفع آخر إشارة للمسافرين. ابتسم وقال: «لم أخفِ عنك كنزًا؛ تركت لك ما يجعلك أهلًا لحراسته معي».'}),
   E('p',{class:'t7-help',text:'بقي الجد بإرادته عند المرفأ الداخلي يرعى إشارات الطريق بعدما قطعت العواصف الاتصال بالمراسي، ووزّع الأدلة عند الأمناء حتى لا يحتكر طالبو الذهب الممر. ما أصلحته في رحلتك أعاد الاتصال، ففتح الطريق بأمان.'}),
   E('p',{class:'v5-stars',text:stars(s)+' · يمكنك إعادة أي محطة لنيل النجوم الباقية.'}),
   button('العودة إلى الخريطة',map,'primary'),button('دفتر الرحلة',()=>modal('notebook')),button('العب التحدي التالي',()=>{view='puzzle';render();}))));}
function renderLetter(){const v=shell(),Q=D.SECRETS5[letterCh],next=letterCh===6?20:(letterCh+1)*3;top(v,'سر '+D.chapters[letterCh][0],Q.title);
 const mark=E('div',{class:'v5-letter-mark'+(Q.col?' col':'')+(Q.after?' after':''),'aria-label':Q.mark},...Q.markArt.map(a=>img(a)),E('span',{text:Q.arrow}));
 v.append(E('div',{class:'t7-story-layout'},E('div',{class:'v5-letter'},img(Q.art),E('p',{text:Q.text}),mark),
  E('section',{class:'t7-paper'},E('span',{class:'t7-kicker',text:'دليل محفوظ للنهاية'}),E('h2',{text:Q.title}),E('p',{text:Q.mark+' احتفظ بها حتى تجتمع أدلة البحار السبعة.'}),
   button('العودة إلى الخريطة',map,'primary'),next<21&&unlocked(next)?button('إلى '+(letterCh===6?D.stations[20].name:D.chapters[letterCh+1][0]),()=>open(next)):null)));}

/* ---------- notebook & treasures ---------- */
function modal(kind){const nb=kind==='notebook',d=E('dialog',{class:'t7-modal','aria-label':nb?'دفتر الرحلة':'خزانة الكنوز'}),x=state(),T=B.v5state(x);
 d.append(E('header',{},E('h2',{text:nb?'دفتر الرحلة':'خزانة الكنوز'}),button('إغلاق',()=>d.close())));
 if(nb){D.stations.filter(s=>unlocked(s.i)).forEach(s=>{const a=E('article',{class:'v5-page'},E('h3',{text:s.name+' · '+s.title}),...s.story.map(t=>E('p',{text:t})),E('p',{class:'v5-page-clue',text:'الدليل: '+s.clue}));
   if(s.needs)a.append(E('p',{text:'الأداة اللازمة: '+[].concat(s.needs).map(n=>D.SEA1_TOOLS[n].name).join(' و')}));
   if(x.done[s.id]&&s.gives){const t=D.SEA1_TOOLS[s.gives];a.append(E('p',{class:'v5-page-tool'},img(t.art),E('span',{text:t.name+' — '+(T.tools[s.gives]==='used'?'استُعملت':'جديدة')+' · '+t.use})));}d.append(a);});
  D.SECRETS5.forEach((Q,ch)=>{if(x.bonus[D.secrets[ch].id])d.append(E('article',{class:'v5-page'},E('h3',{text:'سر '+D.chapters[ch][0]+' · '+Q.title}),E('p',{text:Q.text}),E('p',{class:'v5-page-clue',text:'الدليل: '+Q.mark})));});}
 else{D.chapters.forEach((c,i)=>d.append(E('article',{class:'t7-treasure '+(x.rewards.includes(i)?'earned':'unearned')},img(D.SECRETS5[i].seal),E('div',{},E('h3',{text:c[3]}),E('p',{text:x.rewards.includes(i)?'اكتسبته في '+c[0]:'يُفتح بعد ختم '+c[0]})))));
  d.append(E('h3',{text:'أدوات الرحلة'}));Object.entries(D.SEA1_TOOLS).forEach(([k,t])=>d.append(E('p',{class:'t7-inventory-item',text:(T.tools[k]?'✓ ':'… ')+t.name})));
  d.append(E('h3',{text:'الأسرار'}));D.secrets.forEach(q=>d.append(E('p',{text:x.bonus[q.id]?'✓ '+q.collectible:'سر لم يُكتشف في '+D.chapters[q.ch][0]})));}
 document.body.append(d);d.addEventListener('close',()=>d.remove());d.showModal();}

function render(){({map:renderMap,story:renderStory,puzzle:renderPuzzle,reward:renderReward,letter:renderLetter})[view]();}
window.T7={open,openSecret,map,render,state,data:D,logic:L};

/* ---------- saves: cloud merge and backups ---------- */
DX.KEYS.push('treasureV3');
// Merge earned progress across devices, keeping the more recent unfinished boards.
const merge0=S.merge.bind(S);S.merge=function(remote){const local=JSON.parse(JSON.stringify(state()));merge0(remote);const incoming=remote&&remote.treasureV3;if(!incoming)return;
 try{L.cleanWork(incoming,D.stations);L.validateProgress(incoming,D.stations);}catch(e){S.st.treasureV3=local;return;}
 const latest=(incoming.updatedAt||0)>(local.updatedAt||0)?incoming:local,other=latest===incoming?local:incoming;
 const merged={...latest,done:{...other.done,...latest.done},notes:{...other.notes,...latest.notes},work:{...other.work,...latest.work},hints:{...other.hints,...latest.hints},moves:{...other.moves,...latest.moves},bonus:{...other.bonus,...latest.bonus},usedTools:{...other.usedTools,...latest.usedTools},rewards:[...new Set([...local.rewards,...incoming.rewards])]};
 for(const key of ['hints','moves'])for(const id of Object.keys(other[key]))merged[key][id]=Math.max(merged[key][id]||0,other[key][id]||0);
 if(local.v5||incoming.v5)merged.v5=mergeV5(local.v5,incoming.v5,latest===incoming);S.st.treasureV3=merged;};
// Challenge stars and tools are earned: keep the union; the current attempt follows the newer copy.
function mergeV5(a={},b={},bNewer){const out={ch:{},att:{...(bNewer?a.att:b.att),...(bNewer?b.att:a.att)},tools:{...a.tools,...b.tools}};
 for(const id of new Set([...Object.keys(a.ch||{}),...Object.keys(b.ch||{})]))out.ch[id]=[0,1,2].map(k=>!!((a.ch||{})[id]?.[k]||(b.ch||{})[id]?.[k]));
 for(const k of Object.keys(out.tools))if((a.tools||{})[k]==='used'||(b.tools||{})[k]==='used')out.tools[k]='used';return out;}
if(typeof DX.validateBackup==='function'){const validate0=DX.validateBackup;DX.validateBackup=function(data){const st=validate0(data);if(st.treasureV3){L.cleanWork(st.treasureV3,D.stations);L.validateProgress(st.treasureV3,D.stations);}return st;};}

/* ---------- entry points ---------- */
renderPuz=render;
const h0=renderHome;renderHome=function(){h0();const host=$('#v-home');host.querySelectorAll('.dx-covers,.dx-head').forEach(n=>{if(n.parentElement?.querySelector('[data-world]'))n.parentElement.remove();});host.prepend(E('div',{html:heroCard()}));$('#t7-homego').onclick=()=>{view='map';tab('puz');};};
const quit0=closePlay;closePlay=function(){document.body.classList.remove('t7-classic-play');quit0();};$('#quit')&&($('#quit').onclick=closePlay);
const p0=renderMe;renderMe=function(){p0();const t=$('#dxBackupStatus');if(t)t.textContent='تشمل النسخة ألعابك وملفات الأطفال ودفتر رحلة جزيرة الكنز.';};
const nav=document.querySelector('.tab[data-tab="puz"]');if(nav){const label=nav.querySelector('span:last-child');if(label)label.textContent='جزيرة الكنز';}
renderAll();
})();
