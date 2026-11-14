'use strict';
/* Artwork layer. Original runners, generators (except portrait appearance), hit areas,
   clocks, correct answers, difficulty ladders and result calculation remain in index.html. */
(function(){
const root=window,LA=root.LA={version:1,view:null,failed:new Set(),loaded:new Set()},E=DX.el,$=DX.$,A=DX.AR;
const normalize=s=>String(s).replace(/\ufe0f/g,'');
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sheets={
 a:['🍎','🔑','📱','⌚','🎈','🧸','🚲','📚','☕','🕶','🎸','🌵','🐫','🧁','🏀','📗'],
 b:['🔦','🦆','🍉','🎩','🐠','🦒','🍕','✂','🎁','🥁','⚽','🌶','🐢','🚀','🦋','📘'],
 c:['🐺','🐐','🥬','🧑‍🌾','🐱','🦜','🐰','🥛','🍵','🧃','🛶','🌳','⛺','📦','🧰','🧭'],
 d:['🐑','🌿','🐭','🧀','🐕','🐔','🌽','🦊','☂','🌹','✈','🐦','⏰','🛵','🐎','🍈'],
 e:['🍏','🗝','☎','🎻','🦎','👒','🍰','🕯','📓','🥕','🌴','🏙','🏪','🏖','⛰','🏡']
};
const names={a:['تفاحة','مفتاح','هاتف','ساعة','بالون','دب لعبة','دراجة','كتب','قهوة','نظارة','غيتار','صبار','جمل','كعكة صغيرة','كرة سلة','كتاب أخضر'],b:['مصباح','بطة','بطيخ','قبعة','سمكة','زرافة','بيتزا','مقص','هدية','طبل','كرة قدم','فلفل','سلحفاة','صاروخ لعبة','فراشة','كتاب أزرق'],c:['ذئب','ماعز','ملفوف','مزارع','قط','ببغاء','أرنب','حليب','شاي','عصير','قارب','شجرة','خيمة','صندوق','صندوق كنز','بوصلة'],d:['خروف','عشب','فأر','جبن','كلب','دجاجة','ذرة','ثعلب','مظلة','وردة','طائرة','طائر','منبه','دراجة نارية','حصان','شمام'],e:['تفاحة خضراء','مفتاح قديم','هاتف ثابت','كمان','سحلية','قبعة قش','كعكة','شمعة','دفتر','جزر','نخلة','مدينة','سوق','شاطئ','جبل','منزل']};
const objects={};Object.entries(sheets).forEach(([sheet,keys])=>keys.forEach((key,i)=>objects[normalize(key)]={file:'objects-'+sheet,index:i,label:names[sheet][i]}));
// A nested SVG is only a sprite viewport: all visual content comes from the raster image.
LA.sprite=(file,index,{cls='',x,y,width,height,cols=4,rows=4,label=''}={})=>`<svg class="la-sprite ${cls}" viewBox="${index%cols*100} ${Math.floor(index/cols)*100} 100 100" ${x==null?'':`x="${x}" y="${y}" width="${width}" height="${height}" style="width:${width}px;height:${height}px"`} preserveAspectRatio="none" aria-hidden="true" focusable="false"><image href="legacy/art/${file}.webp" x="0" y="0" width="${cols*100}" height="${rows*100}" preserveAspectRatio="none"/></svg>`;
LA.objects=objects;LA.sheets=sheets;
LA.object=(emoji,cls='')=>{const a=objects[normalize(emoji)];return a&&!LA.failed.has(a.file)?LA.sprite(a.file,a.index,{cls}):(EMAP[normalize(emoji)]||'');};
LA.token=raw=>{const a=objects[normalize(raw)],visual=a&&!LA.failed.has(a.file)?LA.sprite(a.file,a.index):EMAP[normalize(raw)];return `<span class="la-token" role="img" aria-label="${escape(a?a.label:raw)}"><span class="la-original" aria-hidden="true">${escape(raw)}</span>${visual||escape(raw)}</span>`;};
// Preserve each raw emoji in textContent. The old renderer removed it, which could
// break callbacks that locate the correct choice by its original text.
const escapeRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const emojiRE=new RegExp('(?:'+[...new Set([...Object.keys(EMAP),...Object.keys(objects)])].sort((a,b)=>b.length-a.length).map(escapeRE).join('|')+')\\ufe0f?','gu');
deEmo=function(host){if(!host||!host.nodeType)return;if(host.nodeType===1&&host.closest?.('.la-token'))return;const walker=document.createTreeWalker(host,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentNode;if(!p?.closest||p.closest('svg,script,style,textarea,title,.la-token'))return NodeFilter.FILTER_REJECT;emojiRE.lastIndex=0;return emojiRE.test(n.data)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;}}),nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);for(const n of nodes){const raw=n.data;const holder=document.createElement('span');emojiRE.lastIndex=0;holder.innerHTML=escape(raw).replace(emojiRE,m=>LA.token(m));n.replaceWith(...holder.childNodes);}};

// Replace object-only drawing functions while retaining geometry and control hooks.
const guardian0=stGuardian;
stGuardian=function(tgt){if(LA.failed.has('puzzle-parts'))return guardian0(tgt);return guardian0(tgt).replace(/<g class="sthead2">[\s\S]*?<\/g>/,`<g class="sthead2">${LA.sprite('puzzle-parts',2,{x:-35,y:-38,width:70,height:70})}</g>`);};
const car0=carSVG;
carSVG=function(v,red,i){if(LA.failed.has('puzzle-parts'))return car0(v,red,i);const len=v.len*50,truck=!red&&v.len>2,cell=truck?9:8,col=cell%4,row=Math.floor(cell/4),band=truck?[col*100+3,row*100+20,95,52]:[col*100+3,row*100+17,94,58],hues=[50,120,175,215,255],hue=red?0:hues[(i||0)%hues.length],fid='la-hue'+hue,filt=hue?`<filter id="${fid}" color-interpolation-filters="sRGB"><feColorMatrix type="hueRotate" values="${hue}"/></filter>`:'',paint=`<svg x="0" y="0" width="${len}" height="50" viewBox="${band.join(' ')}" preserveAspectRatio="none" class="la-sprite la-carpaint">${filt}<image href="legacy/art/puzzle-parts.webp" width="400" height="400" preserveAspectRatio="none"${hue?` filter="url(#${fid})"`:''}/></svg>`;return v.h?`<svg class="la-car" viewBox="0 0 ${len} 50" preserveAspectRatio="none">${paint}</svg>`:`<svg class="la-car" viewBox="0 0 50 ${len}" preserveAspectRatio="none"><g transform="translate(50 0) rotate(90)">${paint}</g></svg>`;};
const beastOriginal={...BEAST},decorOriginal={...RV_DECOR},landmarkOriginal=typeof XS_==='undefined'?{}:{...XS_};
const riverMap={wolf:'🐺',sheep:'🐑',grass:'🌿',cat:'🐱',mouse:'🐭',cheese:'🧀',dog:'🐕',hen:'🐔',corn:'🌽',fox:'🦊',farmer:'🧑‍🌾'};
Object.entries(riverMap).forEach(([key,emoji])=>{if(BEAST[key]){const a=objects[normalize(emoji)];BEAST[key]=LA.sprite(a.file,a.index,{cls:'beast'});}});
Object.entries({tree:'🌳',cactus:'🌵',fish:'🐠',bfly:'🦋',house:'🏡'}).forEach(([key,emoji])=>{if(RV_DECOR[key])RV_DECOR[key]=LA.object(emoji);});
const landmarks={palm:'🌴',tree:'🌳',boat:'🛶',ship:'🛶',chest:'🧰',key:'🔑',compass:'🧭',crate:'📦',box:'📦',book:'📚',tent:'⛺',house:'🏡',butterfly:'🦋',fish:'🐠',cactus:'🌵'};
if(typeof XS_!=='undefined')Object.entries(landmarks).forEach(([key,emoji])=>{if(XS_[key])XS_[key]=LA.object(emoji);});

LA.fallback=function(file){Object.entries(riverMap).forEach(([k,e])=>{if(objects[normalize(e)]?.file===file)BEAST[k]=beastOriginal[k];});Object.entries(landmarks).forEach(([k,e])=>{if(objects[normalize(e)]?.file===file&&landmarkOriginal[k])XS_[k]=landmarkOriginal[k];});if(file==='puzzle-parts')$('#play')?.classList.add('la-parts-failed');};
// Portrait design changes appearance only: name recall, two rounds, level and scores stay original.
const portraits=[
 ['m','الشماغ الأحمر'],['m','النظارة الذهبية والغترة البيضاء'],['m','النظارة السوداء والقبعة الكحلية'],['m','الشعر المجعد والشارب'],
 ['m','اللحية الرمادية والنظارة السوداء'],['m','النظارة الحمراء والسكسوكة'],['m','الشعر واللحية الرماديان'],['m','الطاقية البيضاء'],
 ['f','الحجاب الفيروزي'],['f','الحجاب الوردي والنظارة السوداء'],['f','الحجاب البنفسجي والنظارة الذهبية'],['f','الحجاب الأخضر'],
 ['f','الحجاب البرتقالي والنظارة الحمراء'],['f','الحجاب الكحلي'],['f','الحجاب البيج والنظارة السوداء'],['f','الشعر الداكن المجعد']
];
const makePerson0=makePerson,face0=faceSVG,feature0=personFeature;
makePerson=function(used,uid){if(LA.failed.has('portraits'))return makePerson0(used,uid);const available=portraits.map((_,i)=>i).filter(i=>!used.some(p=>p.artPortrait===i));if(!available.length)return makePerson0(used,uid);const i=pick(available),f=portraits[i][0]==='f',pool=(f?FN:MN).filter(n=>!used.some(u=>u.name===n));return{uid,f,name:pick(pool),job:pick(f?JF:JM),sig:'painted-'+i,artPortrait:i};};
faceSVG=function(p){return p.artPortrait==null?face0(p):LA.sprite('portraits',p.artPortrait,{cls:'la-face'});};
personFeature=function(p){return p.artPortrait==null?feature0(p):portraits[p.artPortrait][1];};
LA.portraits=portraits;

const config={
 dual:['blue','📚','قارن الحرف والموقع'],juggle:['blue','🏀','احفظ الأرقام وتابع الحركة'],crash:['wood','🎁','لاحظ الشيء الجديد'],loci:['wood','🏡','اربط الأشياء بأماكن البيت'],faces:['paper','🕶','اربط الوجه بالاسم'],cards:['paper','📓','استدعِ ثم اكشف الجواب'],mylist:['paper','📚','ضع قائمتك في قصر الذاكرة'],pm:['blue','⏰','تذكر المهمة أثناء التصنيف'],mmap:['blue','🧭','أعد بناء مواقع الأشياء'],compass:['wood','🧭','احفظ المسار وأعد توجيه نفسك'],nav:['stone','🗺','تذكر طريق النقاط'],delay:['paper','🎁','استدعِ الأشياء بعد فاصل'],fold:['paper','📓','تخيل فتح الورقة'],matrix:['blue','📘','اكتشف قاعدة الخانة الناقصة'],tol:['wood','🏀','خطط لنقل الكرات'],series:['paper','📗','استنتج العنصر التالي'],xw:['paper','📓','أكمل شبكة الكلمات'],hawk:['blue','🐦','ميّز الطائر المختلف'],piano:['wood','🎻','اسمع اللحن ثم أعده'],scene:['wood','☂','احفظ تفاصيل المشهد'],symspan:['blue','📘','احكم ثم احفظ الموقع'],glance:['blue','👁','لاحظ الومضات المتطابقة'],dd:['blue','🚗','ميّز المركبة وموقع الإشارة'],racer:['blue','🚗','حافظ على الطريق وراقب الإشارة'],steps:['blue','⌚','اخطُ واستجب للقاعدة'],radar:['blue','🧭','تتبع الهدف وسط المشتتات'],mot:['blue','🏀','تابع الكرات المطلوبة'],conf:['blue','📗','قارن ثم قدّر ثقتك'],sw:['blue','📗','اتبع القاعدة الحالية'],brake:['blue','📘','اختر لون الحبر'],revspan:['paper','📚','استدعِ الأرقام بالعكس'],deduce:['paper','📓','استنتج مما ورد فقط']
};
const puzzleConfig={pz_lock:['wood','🔑','استنتج الرمز من الأدلة'],pz_stat:['stone','🧭','دوّر الحراس المرتبطين'],pz_scale:['wood','🧰','اكتشف القطعة المزيفة'],pz_rush:['stone','🚗','افتح الطريق للسيارة الحمراء'],pz_river:['wood','🛶','انقل الجميع بأمان'],pz_pipe:['stone','🧭','أوصل الماء لكل بيت'],pz_grid:['paper','📓','اربط الأدلة دون تخمين']};
function settings(g){if(config[g.id])return config[g.id];if(puzzleConfig[g.id])return puzzleConfig[g.id];if(g.puz)return ['stone','🔑','اقرأ الدليل وحل الآلية'];return ['blue','📚','تدريب مهارتك خطوة بخطوة'];}
function apply(g){const play=$('#play');if(!play||g.kid)return;const c=settings(g);play.classList.add('la-play');play.dataset.laGame=g.id;play.dataset.laSurface=c[0];play.dataset.laPuzzle=!!g.puz;play.style.setProperty('--la-accent',g.col?.[0]||'#60d5c7');}
const header0=header;header=function(g){header0(g);apply(g);};
const hc0=headerCustom;headerCustom=function(...args){hc0(...args);const play=$('#play');play.classList.add('la-play');play.dataset.laSurface='paper';play.dataset.laGame='delay';};
const intro0=showIntro;showIntro=function(){intro0();const g=curGame();if(g.kid)return;apply(g);const intro=$('#stage .intro');if(!intro||intro.querySelector('.la-intro-art'))return;const c=settings(g);intro.insertAdjacentHTML('afterbegin',`<div class="la-intro-art">${LA.object(c[1])||LA.sprite('puzzle-parts',1)}<span><small>${g.puz?'ورشة الألغاز':'مختبر العقل'}</small><b>${escape(c[2])}</b></span></div>`);};
// Decode the required artwork before the original countdown starts. No loading time
// is included in a scored round; cancelled loads cannot start a closed game.
let launchToken=0;const imageCache=new Map();
LA.load=function(file){if(imageCache.has(file))return imageCache.get(file);const promise=new Promise(resolve=>{const im=new Image();let finished=false;const finish=ok=>{if(finished)return;finished=true;clearTimeout(timer);(ok?LA.loaded:LA.failed).add(file);if(!ok)LA.fallback(file);resolve(ok);};const timer=setTimeout(()=>finish(false),8000);im.onload=()=>{if(im.decode)im.decode().then(()=>finish(true),()=>finish(true));else finish(true);};im.onerror=()=>finish(false);im.src='legacy/art/'+file+'.webp';if(im.complete&&im.naturalWidth)finish(true);});imageCache.set(file,promise);return promise;};
LA.assets=function(g){const list=['surfaces'];if(g.id==='faces')list.push('portraits');if(['loci','crash','mmap','mylist','delay','scene'].includes(g.id)||g.puz)list.push('objects-a','objects-b','objects-c','objects-d','objects-e');if(g.puz||g.id==='tol')list.push('puzzle-parts');if(g.id==='loci'||g.id==='mylist')list.push('rooms');return [...new Set(list)];};
const countdown0=countdown;countdown=async function(){const g=curGame();if(g.kid)return countdown0();const token=++launchToken,run=RUN,b=$('#go');if(b){b.disabled=true;b.textContent='جارٍ تجهيز الرسوم…';}await Promise.all(LA.assets(g).map(LA.load));if(token!==launchToken||RUN!==run||!RUN)return;countdown0();};
const close0=closePlay;closePlay=function(){launchToken++;close0();const p=$('#play');p.classList.remove('la-play');delete p.dataset.laGame;delete p.dataset.laSurface;};$('#quit').onclick=closePlay;
// Surface/room decoration never touches answer text, ordering, event callbacks or datasets.
function decorate(){const stage=$('#stage');if(!stage||!$('#play').classList.contains('la-play'))return;stage.querySelectorAll('.lroom').forEach((room,i)=>{room.style.setProperty('--la-room-x',(i%3)*50+'%');room.style.setProperty('--la-room-y',Math.floor(i/3)*50+'%');room.classList.add('la-room');});stage.querySelectorAll('.lkdial').forEach(n=>n.classList.add('la-lock-dial'));stage.querySelectorAll('.coin2').forEach(n=>n.classList.add('la-coin'));stage.querySelectorAll('.tpeg i').forEach(n=>n.classList.add('la-marble'));}
const observer=new MutationObserver(decorate);observer.observe($('#stage'),{childList:true,subtree:true});

function addLibraryLink(){const v=$('#v-puz');if(!v||!v.querySelector('.t7-journey')||v.querySelector('#la-library-go'))return;const b=E('button',{type:'button',id:'la-library-go',class:'t7-btn primary',text:'مكتبة الألغاز القديمة',onclick:()=>{LA.view='library';library();}});const top=v.querySelector('.t7-top');top?top.after(b):v.prepend(b);}
const puz0=renderPuz;renderPuz=function(){if(LA.view==='library')library();else{puz0();addLibraryLink();}};
const home0=renderHome;renderHome=function(){home0();const b=$('#t7-homego');if(b){const fn=b.onclick;b.onclick=()=>{LA.view=null;fn();};}};
const puzObserver=new MutationObserver(()=>{if(LA.view!=='library')addLibraryLink();});puzObserver.observe($('#v-puz'),{childList:true});
const t7map0=T7.map;T7.map=function(){LA.view=null;t7map0();addLibraryLink();};
function library(){const v=$('#v-puz');v.classList.remove('trip');v.classList.add('t7');v.innerHTML='';v.append(E('header',{class:'t7-top'},E('div',{},E('span',{class:'t7-kicker',text:'نفس الألغاز · رسم متجدد'}),E('h1',{text:'مكتبة الألغاز القديمة'})),E('button',{class:'t7-btn',type:'button',text:'العودة إلى جزيرة الكنز',onclick:T7.map})),E('p',{class:'t7-help',text:'قواعد الحل والمستويات الأصلية محفوظة. اختر اللغز الذي تريد لعبه.'}));const input=E('input',{class:'dx-search',type:'search',placeholder:'ابحث عن لغز…','aria-label':'ابحث عن لغز'}),grid=E('div',{class:'la-library-grid'});v.append(input,grid);const puzzles=G.filter(g=>g.puz&&!g.kid);LA.puzzleCount=puzzles.length;const fill=()=>{const q=input.value?.trim()||'';grid.innerHTML='';const found=puzzles.filter(g=>g.name.includes(q));found.forEach(g=>{const c=settings(g),tile=E('button',{class:'la-library-card',type:'button','data-legacy-puzzle':g.id,onclick:()=>startRun([g.id])});tile.innerHTML=`<span class="la-library-image">${LA.object(c[1])||LA.sprite('puzzle-parts',1)}</span><b>${escape(g.name)}</b><small>المستوى ${A(typeof pzLv==='function'?pzLv(g.id):1)}</small>`;grid.append(tile);});if(!found.length)grid.append(E('p',{class:'t7-help',text:'لا توجد ألغاز مطابقة.'}));};input.oninput=fill;fill();}
LA.library=()=>{LA.view='library';if(curTab!=='puz')tab('puz');else library();};
// Prevent a previous library screen from overriding an explicit new-story entry.
const open0=T7.open;T7.open=function(i){LA.view=null;open0(i);};
LA.config=config;LA.puzzleConfig=puzzleConfig;LA.decorate=decorate;LA.renderers={guardian0,car0,face0,makePerson0,landmarkOriginal};
renderAll();
})();
