const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const fixture=fs.readFileSync(path.join(__dirname,'storybook.interaction.cjs'),'utf8');
const prefix=fixture.slice(0,fixture.indexOf('const t=boot(),'));
const boot=new Function('require','__dirname',prefix+'return boot;')(require,__dirname);
const fresh=boot();fresh.c.T7.openSecret(0);assert.ok(!fresh.byid('t7-board'));
const data=fresh.c.TreasureData,seed={hist:[{id:'preserve',pts:77}],tx:{voy:3,prog:5},treasureV3:{version:3,done:{},work:{},notes:{},hints:{},moves:{},bonus:{},usedTools:{},rewards:[0,1,2,3,4,5,6]}};
data.stations.forEach(s=>{seed.treasureV3.done[s.id]={at:1,moves:4,hints:0};seed.treasureV3.notes[s.id]=true});
const t=boot(seed),c=t.c,D=c.TreasureData,L=c.TreasureLogic;let checks=1;const ok=(v,m)=>{assert.ok(v,m);checks++};
const mainBefore=JSON.stringify(c.T7.state().done);
for(const s of D.secrets){c.T7.openSecret(s.ch);ok(t.nodes().some(n=>n.textContent===D.SECRETS5[s.ch].text),'secret letter for sea '+(s.ch+1));ok(t.nodes().some(n=>n.tag==='img'&&String(n.attrs.src).endsWith(D.SECRETS5[s.ch].art+'.webp')),'secret art for sea '+(s.ch+1));ok(!!c.T7.state().bonus[s.id],'letter recorded as secret');ok(JSON.stringify(c.T7.state().done)===mainBefore,'reading a secret does not alter progression');}
ok(Object.keys(c.T7.state().bonus).length===7,'all seven side quests');ok(Object.keys(c.T7.state().done).length===21,'main count remains 21');
c.T7.map();t.click('الكنوز');for(const t0 of Object.values(D.SEA1_TOOLS))ok(t.nodes().some(n=>n.textContent==='✓ '+t0.name),'inventory contains '+t0.name);for(const q of D.secrets)ok(t.nodes().some(n=>n.textContent==='✓ '+q.collectible),'secret collectible '+q.collectible);
t.click('إغلاق');t.click('دفتر الرحلة');ok(t.nodes().filter(n=>n.tag==='article'&&n.className==='v5-page').length===28,'main and secret clues together');
c.S.save();const restored=boot(JSON.parse(c.persisted));ok(Object.keys(restored.c.T7.state().bonus).length===7,'reload secrets');ok(Object.keys(restored.c.T7.state().usedTools).length===0,'reload tool usage (5.0: all seven secrets are earned in the story, no tool)');ok(restored.c.S.st.hist[0].pts===77,'legacy results unchanged');ok(L.validateProgress(restored.c.T7.state(),D.stations),'backup validates');
const remote=JSON.parse(c.persisted);delete remote.treasureV3.bonus.sea7_secret_0;remote.treasureV3.updatedAt=Date.now()+100;restored.c.S.merge(remote);ok(Object.keys(restored.c.T7.state().bonus).length===7,'cloud merge keeps local secret');
for(const s of D.stations){let v=L.initial(s),n=0;while(!L.solved(s,v)&&n++<50){const next=L.assist(s,v);ok(!!next,'valid helper step '+s.id);v=next}ok(L.solved(s,v),'helper sequence reaches a solution '+s.id)}
console.log(JSON.stringify({status:'passed',checks,secrets:7,tools:Object.keys(D.SEA1_TOOLS).length,mainStations:21,visualBrowserTest:false},null,2));
