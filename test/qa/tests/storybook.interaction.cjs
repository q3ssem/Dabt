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
 vm.createContext(context);for(const f of ['data.js','logic.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../treasure',f),'utf8'),context,{filename:f});
 const nodes=()=>body.all(),buttons=()=>nodes().filter(n=>n.tag==='button');
 const click=(text)=>{const b=buttons().find(n=>n.textContent===text);assert.ok(b,'button '+text);if(!b.attrs.disabled)b.onclick();return b};
 const byid=id=>document.querySelector('#'+id);
 const aria=part=>{const b=buttons().find(n=>String(n.attrs['aria-label']).includes(part));assert.ok(b,'aria '+part);b.onclick();};
 return{c:context,nodes,buttons,click,byid,aria};
}
const t=boot(),c=t.c,D=c.TreasureData,L=c.TreasureLogic;
c.T7.map();ok(t.nodes().filter(n=>n.className.includes('t7-station ')).length===21,'21 map nodes');
c.T7.open(1);ok(!t.nodes().some(n=>n.className==='t7-dialog'),'locked cannot open');
function enter(s){c.T7.open(s.i);for(let j=1;j<s.dialog.length;j++)t.click('متابعة الحوار');t.click('افحص المشهد');ok(!t.buttons().some(n=>n.textContent==='ابدأ حل اللغز'),'clue gating');t.click('افتح الرق واقرأ الدليل');t.click('ابدأ حل اللغز');ok(!!t.byid('t7-board'),'board rendered '+s.kind);}
for(const s of D.stations){enter(s);const initial=JSON.stringify(c.T7.state().work[s.id]);t.click('اختبر الحل');ok(!c.T7.state().done[s.id],'wrong answer never unlocks '+s.id);t.click('تلميح');ok(c.T7.state().hints[s.id]===1,'hint persists');
 if(['dial','statues'].includes(s.kind)){for(let i=0;i<s.target.length;i++)for(let k=0;k<s.target[i];k++)t.aria((s.kind==='dial'?'البوصلة ':'الحارس ')+c.DX.AR(i+1)+':');}
 if(s.kind==='gears'){t.click('أدر الترس مع الساعة');t.click('أدر الترس مع الساعة');}
 if(s.kind==='balance'){let ans;const w=s.target.weights;for(let mask=0;mask<1<<w.length;mask++){const v=w.map((_,i)=>!!(mask&(1<<i)));if(L.solved(s,v)){ans=v;break;}}ans.forEach((v,i)=>{if(v)t.aria('قطعة وزنها '+c.DX.AR(w[i]));});}
 if(s.kind==='light')L.lightLayouts[s.target].solution.forEach((v,i)=>t.aria('مرآة '+c.DX.AR(i+1)+':'));
 if(s.kind==='bells')s.target.forEach(i=>t.byid('t7-bell-'+i).onclick());
 if(s.kind==='water'){const acts=['fill0','fill1','empty0','empty1','pour01','pour10'],labels=['املأ الكبير','املأ الصغير','أفرغ الكبير','أفرغ الصغير','الكبير ← الصغير','الصغير ← الكبير'];const q=[{v:[0,0],path:[]}],seen=new Set();let solution;while(q.length){const n=q.shift();if(n.v[0]===s.target.target){solution=n.path;break;}for(const a of acts){const v=L.waterStep(n.v,s.target.caps,a),key=v.join(',');if(!seen.has(key)){seen.add(key);q.push({v,path:[...n.path,a]});}}}solution.forEach(a=>t.click(labels[acts.indexOf(a)]));}
 if(s.kind==='map')for(const pos of L.mapInitial(s.target).witness){const v=c.T7.state().work[s.id];t.aria('قطعة '+c.DX.AR(v[pos]));}
 if(s.kind==='final')for(let i=0;i<7;i++){const v=c.T7.state().work[s.id];if(v[i]!==i){const j=v.indexOf(i);t.aria(D.chapters[v[i]][3]);t.aria(D.chapters[v[j]][3]);}}
 ok(L.solved(s,c.T7.state().work[s.id]),'solved via actual handlers '+s.id);t.click('اختبر الحل');ok(!!c.T7.state().done[s.id],'reward saved '+s.id);ok(t.nodes().some(n=>n.textContent===s.outcome),'outcome shown');
}
ok(Object.keys(c.T7.state().done).length===21,'all 21 complete');ok(c.T7.state().rewards.length===7,'7 rewards earned');
const restored=boot(JSON.parse(c.persisted));ok(Object.keys(restored.c.T7.state().done).length===21,'reload keeps completion');ok(restored.c.S.st.hist[0].pts===77,'legacy results preserved');ok(restored.c.S.st.tx.prog===5,'legacy journey preserved');restored.c.T7.map();restored.click('الكنوز');ok(restored.nodes().filter(n=>n.className==='t7-treasure earned').length===7,'treasure cabinet');restored.click('إغلاق');restored.click('دفتر الرحلة');ok(restored.nodes().filter(n=>n.tag==='article').length===21,'notebook all clues');
const remote=JSON.parse(c.persisted);delete remote.treasureV3.done.sea7_0;remote.treasureV3.updatedAt=Date.now()+100;restored.c.S.merge(remote);ok(Object.keys(restored.c.T7.state().done).length===21,'cloud merge preserves local completed nodes');const malformed=JSON.parse(JSON.stringify(remote));malformed.treasureV3.work.sea7_0=[999];restored.c.S.merge(malformed);ok(Object.keys(restored.c.T7.state().done).length===21,'invalid remote cannot overwrite progress');
console.log(JSON.stringify({status:'passed',assertions:total,stations:21,renderer:'in-memory DOM; no visual browser test'},null,2));
