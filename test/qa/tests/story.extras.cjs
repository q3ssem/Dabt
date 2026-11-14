const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fixture=fs.readFileSync(path.join(__dirname,'storybook.interaction.cjs'),'utf8');
const prefix=fixture.slice(0,fixture.indexOf('const t=boot(),'));
const boot=new Function('require','__dirname',prefix+'return boot;')(require,__dirname);
const fresh=boot();fresh.c.T7.openSecret(0);assert.ok(!fresh.byid('t7-board'));
const data=fresh.c.TreasureData,seed={hist:[{id:'preserve',pts:77}],tx:{voy:3,prog:5},treasureV3:{version:3,done:{},work:{},notes:{},hints:{},moves:{},bonus:{},usedTools:{},rewards:[0,1,2,3,4,5,6]}};
data.stations.forEach(s=>{seed.treasureV3.done[s.id]={at:1,moves:4,hints:0};seed.treasureV3.notes[s.id]=true});
const t=boot(seed),c=t.c,D=c.TreasureData,L=c.TreasureLogic;let checks=1;const ok=(v,m)=>{assert.ok(v,m);checks++};
const mainBefore=JSON.stringify(c.T7.state().done);
function searchWater(s,v){const actions=['fill0','fill1','empty0','empty1','pour01','pour10'],q=[{v,path:[]}],seen=new Set([v.join(',')]);for(let h=0;h<q.length;h++){const n=q[h];if(L.solved(s,n.v))return n.path;for(const a of actions){const next=L.waterStep(n.v,s.target.caps,a),k=next.join(',');if(!seen.has(k)){seen.add(k);q.push({v:next,path:[...n.path,a]})}}}}
function searchGears(s,v){const delta=[[2,7,2],[6,1,6]],q=[{v,path:[]}],seen=new Set([v.join(',')]);for(let h=0;h<q.length;h++){const n=q[h];if(L.solved(s,n.v))return n.path;delta.forEach((d,a)=>{const next=n.v.map((x,i)=>(x+d[i])%8),k=next.join(',');if(!seen.has(k)){seen.add(k);q.push({v:next,path:[...n.path,a]})}})}}
for(const s of D.secrets){
 c.T7.openSecret(s.ch);ok(t.buttons().some(n=>n.attrs['aria-label']==='أثر مخفي قرب المعلم'),'discoverable scene hotspot');
 t.aria('أثر مخفي');ok(c.T7.state().notes[s.id]===true,'secret clue collected');t.click('ابدأ حل اللغز');ok(!!t.byid('t7-use-tool'),'earned tool available in side quest');
 c.T7.useTool();ok(c.T7.state().usedTools[s.id]===true,'tool use persists');const after=JSON.stringify(c.T7.state().work[s.id]);c.T7.useTool();ok(JSON.stringify(c.T7.state().work[s.id])===after,'tool cannot repeat');
 const v=()=>c.T7.state().work[s.id];
 if(s.kind==='balance'){let answer;for(let m=0;m<1<<v().length;m++){const target=v().map((_,i)=>!!(m&(1<<i)));if(L.solved(s,target)){answer=target;break}}answer.forEach((x,i)=>{if(v()[i]!==x)t.aria('قطعة وزنها '+c.DX.AR(s.target.weights[i]))})}
 if(s.kind==='bells')for(const i of s.target.slice(v().length))t.byid('t7-bell-'+i).onclick();
 if(s.kind==='water'){const labels={fill0:'املأ الكبير',fill1:'املأ الصغير',empty0:'أفرغ الكبير',empty1:'أفرغ الصغير',pour01:'الكبير ← الصغير',pour10:'الصغير ← الكبير'};for(const a of searchWater(s,v()))t.click(labels[a])}
 if(s.kind==='light')L.lightLayouts[s.target].solution.forEach((x,i)=>{if(v()[i]!==x)t.aria('مرآة '+c.DX.AR(i+1)+':')});
 if(s.kind==='gears')for(const a of searchGears(s,v()))t.click(a===0?'أدر الترس مع الساعة':'أدر الترس عكس الساعة');
 if(s.kind==='statues')s.target.forEach((x,i)=>{const n=(x-v()[i]+4)%4;for(let k=0;k<n;k++)t.aria('الحارس '+c.DX.AR(i+1)+':')});
 if(s.kind==='final')for(let i=0;i<7;i++)if(v()[i]!==i){const j=v().indexOf(i),first=v()[i];t.aria(D.chapters[first][3]);t.aria(D.chapters[v()[j]][3])}
 ok(L.solved(s,v()),'secret solved by real controls');t.click('اختبر الحل');ok(!!c.T7.state().bonus[s.id],'secret reward saved');ok(t.nodes().some(n=>n.textContent===s.outcome),'side story outcome');ok(t.nodes().filter(n=>n.className==='t7-state before'||n.className==='t7-state after').length===2,'illustrated result states');
 ok(JSON.stringify(c.T7.state().done)===mainBefore,'side quest does not alter main progression');
}
ok(Object.keys(c.T7.state().bonus).length===7,'all seven side quests');ok(Object.keys(c.T7.state().done).length===21,'main count remains 21');
c.T7.map();t.click('الكنوز');for(const name of D.rewards)ok(t.nodes().some(n=>n.textContent==='✓ '+name),'inventory contains '+name);for(const q of D.secrets)ok(t.nodes().some(n=>n.textContent==='✓ '+q.collectible),'secret collectible '+q.collectible);
t.click('إغلاق');t.click('دفتر الرحلة');ok(t.nodes().filter(n=>n.tag==='article').length===28,'main and secret clues together');
const restored=boot(JSON.parse(c.persisted));ok(Object.keys(restored.c.T7.state().bonus).length===7,'reload secrets');ok(Object.keys(restored.c.T7.state().usedTools).length===7,'reload tool usage');ok(restored.c.S.st.hist[0].pts===77,'legacy results unchanged');ok(L.validateProgress(restored.c.T7.state(),D.stations),'backup validates all secret work');
const remote=JSON.parse(c.persisted);delete remote.treasureV3.bonus.sea7_secret_0;remote.treasureV3.updatedAt=Date.now()+100;restored.c.S.merge(remote);ok(Object.keys(restored.c.T7.state().bonus).length===7,'cloud merge keeps local secret');
for(const s of [...D.stations,...D.secrets])if(s.kind!=='map'){let v=L.initial(s),n=0;while(!L.solved(s,v)&&n++<50){const next=L.assist(s,v);ok(!!next,'valid helper step '+s.id);if(s.kind==='water'){const allowed=['fill0','fill1','empty0','empty1','pour01','pour10'].map(a=>L.waterStep(v,s.target.caps,a));ok(allowed.some(x=>L.equal(x,next)),'helper uses legal water move')}v=next}ok(L.solved(s,v),'helper sequence reaches a solution '+s.id)}
console.log(JSON.stringify({status:'passed',checks,sideQuests:7,toolInventory:7,mainStations:21,visualBrowserTest:false},null,2));
