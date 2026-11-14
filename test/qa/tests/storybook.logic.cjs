const assert=require('node:assert/strict');require('../../treasure/data.js');require('../../treasure/logic.js');
const D=TreasureData,L=TreasureLogic;let checks=0;
assert.equal(D.stations.length,21);assert.equal(new Set(D.stations.map(s=>s.id)).size,21);
for(const s of D.stations){let answer;
 if(['dial','statues','gears','bells','final'].includes(s.kind))answer=s.target;
 if(s.kind==='light')answer=L.lightLayouts[s.target].solution;
 if(s.kind==='balance'){const w=s.target.weights;for(let mask=0;mask<1<<w.length;mask++){const v=w.map((_,i)=>!!(mask&(1<<i)));if(L.solved(s,v)){answer=v;break;}}}
 if(s.kind==='water'){const q=[{v:[0,0],actions:[]}],seen=new Set();while(q.length){const n=q.shift();if(n.v[0]===s.target.target){answer=n.v;break;}for(const a of ['fill0','fill1','empty0','empty1','pour01','pour10']){const v=L.waterStep(n.v,s.target.caps,a),key=v.join(',');if(!seen.has(key)){seen.add(key);q.push({v,actions:[...n.actions,a]});}}}}
 if(s.kind==='map'){const m=L.mapInitial(s.target);answer=m.a.slice();for(const n of m.witness){const zero=answer.indexOf(0);assert.equal(Math.abs(n%3-zero%3)+Math.abs(Math.floor(n/3)-Math.floor(zero/3)),1);[answer[n],answer[zero]]=[answer[zero],answer[n]];}}
 if(L.V5.includes(s.kind)){let v=L.initial(s),n=0;while(!L.solved(s,v)&&n++<40)v=L.assist(s,v);answer=v;assert.equal(L.minMoves(s,L.initial(s)),s.target.min,`5.0 minimum ${s.id}`);}
 assert.ok(answer,`solution exists ${s.id}`);assert.ok(L.solved(s,answer),`accepted ${s.id}`);assert.equal(L.solved(s,L.initial(s)),false,`not initially solved ${s.id}`);checks+=3;
}
const p={version:3,done:{},work:{},notes:{},hints:{},moves:{},rewards:[]};for(const s of D.stations)p.work[s.id]=L.initial(s);assert.ok(L.validateProgress(p,D.stations));for(const mutate of [x=>x.work.sea7_0=[99],x=>x.rewards=[8],x=>x.work.sea7_7=[99,0],x=>x.work.sea7_8=[1,1,2,3,4,5,6,7,0],x=>x.notes.unknown=true]){const bad=JSON.parse(JSON.stringify(p));mutate(bad);assert.throws(()=>L.validateProgress(bad,D.stations));checks++;}

/* Seas 4–7 (5.0): exhaustive search — every reachable state, exactly one finished state, documented minimum. */
for(const s of D.stations.slice(9)){const seen=new Set(),q=[L.initial(s)],goals=new Set();seen.add(q[0].join());for(let h=0;h<q.length;h++){const a=q[h];if(L.solved(s,a))goals.add(s.kind==='stroke'?'all links':a.join());for(const n of L.nextStates(s,a)){const k=n.join();if(!seen.has(k)){seen.add(k);q.push(n);}}}
 assert.equal(goals.size,1,'one finished state '+s.id);assert.equal(L.minMoves(s),s.target.min,'minimum '+s.id);assert.ok(seen.size>=6,'non-trivial '+s.id);checks+=3;}
{const s=D.stations[20];let n=0;const perm=(a,k)=>{if(k===a.length){if(L.pathOk(s.target,a))n++;return;}for(let i=k;i<a.length;i++){[a[k],a[i]]=[a[i],a[k]];perm(a,k+1);[a[k],a[i]]=[a[i],a[k]];}};perm([0,1,2,3,4,5,6],0);assert.equal(n,1,'final door: one of 5040 arrangements');checks++;}
{const s=D.stations[16];let ok=0,dead=0;const go=v=>{if(L.solved(s,v)){ok++;return;}const n=L.nextStates(s,v);if(!n.length){dead++;return;}n.forEach(go);};go([]);assert.ok(dead>=ok*.8,'moon crossing has real dead ends ('+ok+' full trails, '+dead+' dead ends)');checks++;}
{const s=D.stations[18];assert.equal(L.riverSafe(s.target,[1,0,0,1]),false,'Shibl alone with the fish');assert.equal(L.riverSafe(s.target,[1,1,0,0]),false,'fish alone with bait');checks+=2;}
{const s=D.stations[13];assert.equal(L.gearRun(s.target,[0,2,1,3]),5,'gear train meshes end to end');assert.ok(L.gearRun(s.target,s.target.start)<5,'start train is broken');checks+=2;}
for(const [id,bad] of [['sea7_9',[1,1,2,3,4,5,6,7,0]],['sea7_15',[0,0,0,0]],['sea7_16',[3]],['sea7_18',[1,0,0,1]],['sea7_20',[0,0,1,2,3,4,5]]]){const b=JSON.parse(JSON.stringify(p));b.work[id]=bad;assert.throws(()=>L.validateProgress(b,D.stations),'reject '+id);checks++;}
console.log(JSON.stringify({stations:D.stations.length,checks,status:'passed'},null,2));
