// In-memory DOM interaction harness. This is NOT a browser rendering/device test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
let total=0;const ok=(v,m)=>{assert.ok(v,m);total++};
function boot(seed){
 class Node{constructor(tag,a={},...kids){this.tag=tag;this.attrs={};this.children=[];this.style={};this.dataset={};this.className='';this.textContent='';for(const[k,v]of Object.entries(a)){if(k==='class')this.className=v;else if(k==='text')this.textContent=v;else if(k==='html')this.html=v;else if(k==='style')this.style.cssText=v;else if(k.startsWith('on'))this[k]=v;else{this.attrs[k]=v;if(k==='id')this.id=v;}}this.append(...kids.flat());this.classList={add:(...cs)=>this.className=[...new Set([...this.className.split(' '),...cs])].join(' '),remove:(...cs)=>this.className=this.className.split(' ').filter(x=>!cs.includes(x)).join(' '),toggle:(c,f)=>{const on=f===undefined?!this.className.split(' ').includes(c):f;on?this.classList.add(c):this.classList.remove(c);}};}
 append(...xs){for(const x of xs.flat(9))if(x!==null&&x!==undefined&&x!==false){this.children.push(x);if(typeof x==='object')x.parentElement=this;}}
 prepend(x){this.children.unshift(x);x.parentElement=this;}
 set innerHTML(v){this.children=[];this.html=v}get innerHTML(){return this.html||''}
 all(){return [this,...this.children.filter(x=>x instanceof Node).flatMap(x=>x.all())]}
 querySelectorAll(q){if(q.includes(' '))return[];return this.all().slice(1).filter(n=>q.startsWith('#')?n.id===q.slice(1):q.startsWith('.')?n.className.split(' ').includes(q.slice(1)):n.tag===q)}
 querySelector(q){return this.querySelectorAll(q)[0]||null}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(x=>x!==this)}
 addEventListener(){}showModal(){this.open=true}close(){this.open=false;this.remove()}setAttribute(k,v){this.attrs[k]=v}focus(){}
 }
 const body=new Node('body',{},new Node('div',{id:'v-puz'}),new Node('div',{id:'v-home'}),new Node('div',{id:'v-me'}));
 const document={body,querySelector:q=>body.querySelector(q),querySelectorAll:q=>body.querySelectorAll(q)};
 const state=seed||{hist:[{id:'preserve',pts:77}],tx:{voy:3,prog:5},discoveryCampaign:{done:{old:true}}};
 const context={console,document,Date,JSON,Math,Set,Map,Object,Array,Number,String,Infinity,performance:{now:()=>0},setTimeout:()=>0,clearTimeout(){},matchMedia:()=>({matches:false}),S:{st:state,merge(r){if(r?.treasureV3)this.st.treasureV3=r.treasureV3;},save(){context.persisted=JSON.stringify(this.st)}},DX:{el:(...a)=>new Node(...a),AR:x=>String(x).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]),$:q=>document.querySelector(q),KEYS:[]},curTab:'puz',tab(t){context.curTab=t;if(t==='puz')context.renderPuz()},closePlay(){},renderPuz(){},renderHome(){},renderMe(){},renderGames(){},renderAll(){},CATS:{mem:{},att:{},speed:{},flex:{},log:{},space:{}},GM:{},sfx:{ok(){}},tone(){},MutationObserver:class{observe(){}}};context.window=context;context.globalThis=context;context.window.scrollTo=()=>{};
 vm.createContext(context);context.__T7_SYNC=true;for(const f of ['data.js','logic.js','boards.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../treasure',f),'utf8'),context,{filename:f});
 const nodes=()=>body.all(),buttons=()=>nodes().filter(n=>n.tag==='button');
 const click=(text)=>{const b=buttons().find(n=>n.textContent===text);assert.ok(b,'button '+text);if(!b.attrs.disabled)b.onclick();return b};
 const byid=id=>document.querySelector('#'+id);
 const aria=part=>{const b=buttons().find(n=>String(n.attrs['aria-label']).includes(part));assert.ok(b,'aria '+part);b.onclick();};
 return{c:context,nodes,buttons,click,byid,aria};
}
const t=boot(),c=t.c,D=c.TreasureData,L=c.TreasureLogic;
c.T7.map();c.T7.render();ok(t.nodes().some(n=>n.className==='v5-hubcard'),'official journey card remains available without retired atlas');ok(D.stations.length===21,'all 21 native sea stations remain');
c.T7.open(1);ok(!t.nodes().some(n=>n.className==='t7-dialog'),'locked cannot open');


/* Drive any 5.0 board through its real controls from the current saved state. */
function drive(s){drive.sel=null;const work=()=>c.T7.state().work[s.id];if(s.variant===undefined){const a=c.T7.state().v5&&c.T7.state().v5.att[s.id];if(a&&a.c)s=L.variant(s,a.c);}
 if(s.kind==='weigh'){const P=()=>L.weighParts(work());for(const i of [0,1,2,3,4,5])t.aria('حجر '+(i+1));t.click('زِن');const cand=P().p.map((x,i)=>x!==3?i:-1).filter(i=>i>=0);t.aria('حجر '+(cand[0]+1));t.aria('حجر '+(cand[1]+1));t.click('زِن');t.aria('حجر '+(L.weighDeduced(work())+1));return;}
 let v=work(),path=[v],n=0;while(!L.solved(s,v)&&n++<40){v=L.assist(s,v);path.push(v);}
 for(let k=1;k<path.length;k++){const a=path[k-1],b=path[k],d=a.map((x,i)=>x!==b[i]?i:-1).filter(i=>i>=0);
  if(s.kind==='locks')t.aria('القفل '+(d[0]+1)+':');
  if(s.kind==='mirrors'){const [r,cc]=s.target.mirrors[d[0]];t.aria('مرآة في الصف '+r+' العمود '+cc+':');}
  if(s.kind==='cipher'){const pos=['أعلى','يمين','أسفل','يسار','الدرج'];t.aria(pos[d[0]]+':');t.aria(pos[d[1]]+':');}
  if(s.kind==='torn'){t.aria('قصاصة في الموضع '+(d[0]+1));t.aria('قصاصة في الموضع '+(d[1]+1));}
  if(s.kind==='chime')t.aria('جرس '+['الدائرة','المثلث','المعين','الموجة','النجمة'][b[b.length-1]]);
  if(s.kind==='linked'){const nm=['الأيسر','الأوسط','الأيمن'],i=[0,1,2].find(i=>JSON.stringify(L.linkedTurn(s.target,a,i))===JSON.stringify(b));if(drive.sel!==s.id+i)t.aria('تمثال '+nm[i]);drive.sel=s.id+i;t.aria('تمثال '+nm[i]);}
  if(s.kind==='tide'){if(b[0]!==a[0])t.aria(s.target.names[b[0]]);else t.aria('ذراع المد');}
  if(s.kind==='valves')t.aria(['البوابة العليا','البوابة الوسطى','البوابة اليسرى','البوابة اليمنى'][d[0]]);
  if(s.kind==='slide'){const nm=['','الدائرة','المثلث','المعين','الهلال','الموجة','الفرع','الورقة','النجمة'];t.aria('لوح '+nm[a[b.indexOf(0)]]);}
  if(s.kind==='lights'){const i=a.findIndex((_,i)=>JSON.stringify(L.lightsPress(a,i))===JSON.stringify(b));t.aria('بلورة '+(i+1)+':');}
  if(s.kind==='scales'){const nm=['الميزان الأعلى','الميزان الأوسط','الميزان الأسفل'];if(b[3]===1&&a[3]===0){const w=t.buttons().find(n=>n.textContent.startsWith('زِن'));w.onclick();}else{const dd=d.filter(i=>i<3);t.aria(nm[dd[0]]);t.aria(nm[dd[1]]);}}
  if(s.kind==='ropes'){const m=a.length-1;if(a[m]>=0)t.click('أرخِ الحبل');else t.aria('وتد '+['أعلى اليسار','أعلى اليمين','الوسط الأيسر','الوسط الأيمن','أسفل اليسار','أسفل اليمين'][d.find(i=>i<m)]);}
  if(s.kind==='gearfit'){const nm=i=>i===4?'الدرج:':'الموضع '+(i+1)+':';t.aria(nm(d[0]));t.aria(nm(d[1]));}
  if(s.kind==='drums')t.aria('الأسطوانة '+['العليا','الثانية','الثالثة','الرابعة'][d[0]]+':');
  if(s.kind==='push'){let k,dd;for(k=0;k<a.length/2;k++){dd=[0,1,2,3].find(x=>JSON.stringify(L.pushMove(s.target,a,k,x))===JSON.stringify(b));if(dd!==undefined)break;}t.aria('حجر في الصف '+(a[k*2]+1)+' العمود '+(a[k*2+1]+1));t.aria('ادفع نحو '+['أعلى','يمين','أسفل','يسار'][dd]);}
  if(s.kind==='stroke')t.aria('النجمة '+(L.strokeAt(s.target,b)+1)+' ');
  if(s.kind==='hanoi'){const k=d[0],nm=['العمود الأيسر','العمود الأوسط','العمود الأيمن'];t.aria(nm[a[k]]);t.aria(nm[b[k]]);}
  if(s.kind==='river'){const k=[0,1,2].find(i=>a[i+1]!==b[i+1]);if(k===undefined)t.click('اعبر بالزورق فارغًا');else{t.aria(s.target.items[k]+'،');t.click('اعبر مع '+s.target.items[k]);}}
  if(s.kind==='frogs'){const i=d.find(i=>a[i]!==0);t.aria('زورق في الخانة '+(i+1)+' ');}
  if(s.kind==='path'){t.aria('تجويف '+(d[0]+1)+':');t.aria('تجويف '+(d[1]+1)+':');}}}
/* Play every station through its real board controls (tool gate, taps) — no state writes. */
function playV5(s){c.T7.open(s.i);
 ok(t.nodes().filter(n=>n.className==='t7-hero-intro').length===1,'single illustrated opening '+s.id);
 t.click('قواعد المحطة');ok(!!t.byid('v5-board'),'5.0 board '+s.id);
 for(const action of ['المحطات','دفتر الرحلة','الكنوز']){
  const matches=t.buttons().filter(n=>n.textContent===action);
  ok(matches.length===1&&matches[0].attrs['aria-label']===action,'single accessible toolbar action '+action+' '+s.id);
 }
 if(s.kind==='chime'){
  const star=t.buttons().find(n=>n.attrs['aria-label']==='جرس النجمة');
  ok(star&&star.children.some(n=>typeof n==='object'&&n.innerHTML.includes('<path')&&!n.innerHTML.includes('undefined')),'star bell has its own shape');
 }
 if(s.needs){for(const nd of [].concat(s.needs)){ok(t.buttons().some(n=>n.textContent==='ضع '+D.SEA1_TOOLS[nd].name),'tool gate shown '+s.id+' '+nd);t.click('ضع '+D.SEA1_TOOLS[nd].name);}}
 const work=()=>c.T7.state().work[s.id];drive(s);
 ok(L.solved(s,work())||!!c.T7.state().done[s.id],'5.0 solved via real controls '+s.id);ok(!!c.T7.state().done[s.id],'5.0 reward saved '+s.id);ok(c.T7.state().v5.ch[s.id][0],'challenge 1 star '+s.id);
 ok(c.T7.state().v5.ch[s.id][1]===false,'stars are not granted retroactively '+s.id);
 const replay=()=>{if(s.needs)for(const nd of [].concat(s.needs))t.click('ضع '+D.SEA1_TOOLS[nd].name);drive(s);};
 t.click('العب التحدي التالي');t.aria('التحدي 2');
 ok(t.buttons().filter(n=>n.attrs.role==='tab').length===3,'only three challenge tabs '+s.id);
 ok(L.equal(work(),L.initial(L.variant(s,1))),'challenge 2 starts from the redesigned board '+s.id);
 replay();ok(c.T7.state().v5.ch[s.id][1],'min-move star '+s.id);
 t.aria('التحدي 3');t.click('تلميح');replay();ok(!c.T7.state().v5.ch[s.id][2],'a hint voids the no-hint star '+s.id);t.click('محاولة جديدة');replay();ok(c.T7.state().v5.ch[s.id][2],'no-hint star '+s.id);
 if(s.needs)for(const nd of [].concat(s.needs))ok(c.T7.state().v5.tools[nd]==='used','tool marked used '+nd);if(s.gives)ok(!!c.T7.state().v5.tools[s.gives],'tool earned '+s.gives);}
for(const s of D.stations)playV5(s);
ok(Object.keys(c.T7.state().done).length===21,'all 21 complete');ok(c.T7.state().rewards.length===7,'7 rewards earned');
const restored=boot(JSON.parse(c.persisted));ok(Object.keys(restored.c.T7.state().done).length===21,'reload keeps completion');ok(restored.c.S.st.hist[0].pts===77,'legacy results preserved');ok(restored.c.S.st.tx.prog===5,'legacy journey preserved');restored.c.T7.openJournal('treasures');ok(restored.nodes().filter(n=>n.className==='t7-treasure earned').length===7,'treasure cabinet');restored.click('إغلاق');restored.c.T7.openJournal('notebook');ok(restored.nodes().filter(n=>n.tag==='article'&&n.className.startsWith('v5-page')).length===29,'notebook preserves 21 station pages, 7 secrets, and the gated finale');
const remote=JSON.parse(c.persisted);delete remote.treasureV3.done.sea7_0;remote.treasureV3.updatedAt=Date.now()+100;restored.c.S.merge(remote);ok(Object.keys(restored.c.T7.state().done).length===21,'cloud merge preserves local completed nodes');const malformed=JSON.parse(JSON.stringify(remote));malformed.treasureV3.work.sea7_0=[999];restored.c.S.merge(malformed);ok(Object.keys(restored.c.T7.state().done).length===21,'invalid remote cannot overwrite progress');
console.log(JSON.stringify({status:'passed',assertions:total,stations:21,renderer:'in-memory DOM; no visual browser test'},null,2));
