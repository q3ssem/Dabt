const assert=require('node:assert/strict');require('../../treasure/data.js');require('../../treasure/logic.js');
const D=TreasureData,L=TreasureLogic;let checks=0;
assert.equal(D.stations.length,21);assert.equal(new Set(D.stations.map(s=>s.id)).size,21);
for(const s of D.stations){let v=L.initial(s),n=0;while(!L.solved(s,v)&&n++<40)v=L.assist(s,v);
 assert.equal(L.minMoves(s,L.initial(s)),s.target.min,`minimum ${s.id}`);assert.ok(L.solved(s,v),`solution reached ${s.id}`);assert.equal(L.solved(s,L.initial(s)),false,`not initially solved ${s.id}`);assert.ok(L.workOk(s,L.initial(s)),`start is a legal board ${s.id}`);checks+=4;
}
const p={version:3,done:{},work:{},notes:{},hints:{},moves:{},rewards:[]};for(const s of D.stations)p.work[s.id]=L.initial(s);assert.ok(L.validateProgress(p,D.stations));for(const mutate of [x=>x.work.sea7_0=[99],x=>x.rewards=[8],x=>x.work.sea7_7=[99,0],x=>x.work.sea7_8=[1,1,2,3,4,5,6,7,0],x=>x.notes.unknown=true]){const bad=JSON.parse(JSON.stringify(p));mutate(bad);assert.throws(()=>L.validateProgress(bad,D.stations));checks++;}

/* Seas 4–7 (5.0): exhaustive search — every reachable state, exactly one finished state, documented minimum. */
for(const s of D.stations.slice(9)){const seen=new Set(),q=[L.initial(s)],goals=new Set();seen.add(q[0].join());for(let h=0;h<q.length;h++){const a=q[h];if(L.solved(s,a))goals.add(s.kind==='stroke'?'all links':s.kind==='scales'?a.slice(0,3).join():a.join());for(const n of L.nextStates(s,a)){const k=n.join();if(!seen.has(k)){seen.add(k);q.push(n);}}}
 assert.equal(goals.size,1,'one finished state '+s.id);assert.equal(L.minMoves(s),s.target.min,'minimum '+s.id);assert.ok(seen.size>=6,'non-trivial '+s.id);checks+=3;}
{const s=D.stations[20];let n=0;const perm=(a,k)=>{if(k===a.length){if(L.pathOk(s.target,a))n++;return;}for(let i=k;i<a.length;i++){[a[k],a[i]]=[a[i],a[k]];perm(a,k+1);[a[k],a[i]]=[a[i],a[k]];}};perm([0,1,2,3,4,5,6],0);assert.equal(n,1,'final door: one of 5040 arrangements');checks++;}
{const s=D.stations[16];let ok=0,dead=0;const go=v=>{if(L.solved(s,v)){ok++;return;}const n=L.nextStates(s,v);if(!n.length){dead++;return;}n.forEach(go);};go([]);assert.ok(dead>=ok*.8,'moon crossing has real dead ends ('+ok+' full trails, '+dead+' dead ends)');checks++;}
{const s=D.stations[18];assert.equal(L.riverSafe(s.target,[1,0,0,1]),false,'Shibl alone with the fish');assert.equal(L.riverSafe(s.target,[1,1,0,0]),false,'fish alone with bait');checks+=2;}
{const s=D.stations[13];assert.equal(L.gearRun(s.target,[0,2,1,3]),5,'gear train meshes end to end');assert.ok(L.gearRun(s.target,s.target.start)<5,'start train is broken');checks+=2;}
for(const [id,bad] of [['sea7_9',[1,1,2,3,4,5,6,7,0]],['sea7_15',[0,0,0,0]],['sea7_16',[99]],['sea7_18',[1,0,0,1]],['sea7_20',[0,0,1,2,3,4,5]]]){const b=JSON.parse(JSON.stringify(p));b.work[id]=bad;assert.throws(()=>L.validateProgress(b,D.stations),'reject '+id);checks++;}
{const old=JSON.parse(JSON.stringify(p));old.work.sea7_0=[0,2,6];old.work.sea7_12=[true,false];old.work.sea7_19=[3,6,1,5,0,4,2];assert.throws(()=>L.validateProgress(old,D.stations),'older boards are rejected as-is');L.cleanWork(old,D.stations);assert.ok(L.validateProgress(old,D.stations),'older boards are dropped, progress kept');assert.ok(!old.work.sea7_0&&!!old.work.sea7_1,'only unfit boards removed');checks+=3;}

/* Challenge 3 (another start) and «خبير» boards: documented minimum, exactly one finished arrangement; daily boards are legal. */
for(const s of D.stations){
 const boards=[0,1,2].map(c=>L.variant(s,c));
 assert.ok(s.challengeBoards.length===2,'three challenges '+s.id);
 const distinct=new Set(boards.map(b=>JSON.stringify(b.target)));
 assert.equal(distinct.size,3,'all challenges differ '+s.id);
 for(const board of boards){assert.equal(L.minMoves(board),board.target.min,'challenge cost '+s.id);checks++;}
}
for(const s of D.stations)for(const c of [2,3]){const v=L.variant(s,c);if(v===s)continue;assert.equal(L.minMoves(v),v.target.min,`variant ${c} minimum ${s.id}`);checks++;
 if(['locks','drums','hanoi','frogs','push','lights'].includes(s.kind)){const seen=new Set(),q=[L.initial(v)],goals=new Set();seen.add(q[0].join());for(let h=0;h<q.length;h++){const a=q[h];if(L.solved(v,a))goals.add(a.join());for(const n of L.neighbours(v,a)){const k=n.join();if(!seen.has(k)){seen.add(k);q.push(n);}}}assert.equal(goals.size,1,`variant ${c} one finished state ${s.id}`);checks++;}}
for(const s of D.stations.filter(s=>L.DAILY_KINDS.includes(s.kind))){const d=L.dailyBoard(s,12345);assert.ok(L.workOk(s,d.start)&&d.min>=4&&L.minMoves(L.variant({...s,daily:d},4))===d.min,`daily board ${s.id}`);checks++;}
console.log(JSON.stringify({stations:D.stations.length,checks,status:'passed'},null,2));
