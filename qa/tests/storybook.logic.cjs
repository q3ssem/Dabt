const assert=require('node:assert/strict');require('../../treasure/data.js');require('../../treasure/logic.js');
const D=TreasureData,L=TreasureLogic;let checks=0;
assert.equal(D.stations.length,21);assert.equal(new Set(D.stations.map(s=>s.id)).size,21);
for(const s of D.stations){let answer;
 if(['dial','statues','gears','bells','final'].includes(s.kind))answer=s.target;
 if(s.kind==='light')answer=L.lightLayouts[s.target].solution;
 if(s.kind==='balance'){const w=s.target.weights;for(let mask=0;mask<1<<w.length;mask++){const v=w.map((_,i)=>!!(mask&(1<<i)));if(L.solved(s,v)){answer=v;break;}}}
 if(s.kind==='water'){const q=[{v:[0,0],actions:[]}],seen=new Set();while(q.length){const n=q.shift();if(n.v[0]===s.target.target){answer=n.v;break;}for(const a of ['fill0','fill1','empty0','empty1','pour01','pour10']){const v=L.waterStep(n.v,s.target.caps,a),key=v.join(',');if(!seen.has(key)){seen.add(key);q.push({v,actions:[...n.actions,a]});}}}}
 if(s.kind==='map'){const m=L.mapInitial(s.target);answer=m.a.slice();for(const n of m.witness){const zero=answer.indexOf(0);assert.equal(Math.abs(n%3-zero%3)+Math.abs(Math.floor(n/3)-Math.floor(zero/3)),1);[answer[n],answer[zero]]=[answer[zero],answer[n]];}}
 assert.ok(answer,`solution exists ${s.id}`);assert.ok(L.solved(s,answer),`accepted ${s.id}`);assert.equal(L.solved(s,L.initial(s)),false,`not initially solved ${s.id}`);checks+=3;
}
const p={version:3,done:{},work:{},notes:{},hints:{},moves:{},rewards:[]};for(const s of D.stations)p.work[s.id]=L.initial(s);assert.ok(L.validateProgress(p,D.stations));for(const mutate of [x=>x.work.sea7_0=[99],x=>x.rewards=[8],x=>x.work.sea7_7=[99,0],x=>x.work.sea7_8=[1,1,2,3,4,5,6,7,0],x=>x.notes.unknown=true]){const bad=JSON.parse(JSON.stringify(p));mutate(bad);assert.throws(()=>L.validateProgress(bad,D.stations));checks++;}
console.log(JSON.stringify({stations:D.stations.length,checks,status:'passed'},null,2));
