'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ink = fs.readFileSync(path.join(root, 'watercolor/castle-ink.js'), 'utf8');
let checks = 0;
const ok = (v, label) => { assert.ok(v, label); checks++; };
const eq = (a, b, label) => { assert.equal(a, b, label); checks++; };

function makeContext(seed = 0xA11CE) {
  let state = seed >>> 0;
  const M = Object.create(Math);
  M.random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 0x100000000; };
  const c = {
    Math: M, Map, Set, Array, Object, Number, String, Date, Infinity, console,
    D4: [[0,-1],[1,0],[0,1],[-1,0]],
    rnd: n => Math.floor(M.random() * n),
    pick: a => a[Math.floor(M.random() * a.length)],
    shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(M.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    inb: (x,y,w,h) => x >= 0 && y >= 0 && x < w && y < h,
    xcPerms: n => { const out=[]; const visit=(a,r)=>{ if(!r.length){out.push(a);return;} for(let i=0;i<r.length;i++)visit(a.concat(r[i]),r.slice(0,i).concat(r.slice(i+1))); }; visit([],Array.from({length:n},(_,i)=>i)); return out; },
  };
  vm.createContext(c);
  return c;
}
function block(c, start, end, expose = '') {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `source block exists: ${start}`);
  vm.runInContext(html.slice(a, b) + '\n' + expose, c);
}

const ids = ['pz_plock','pz_pliar','pz_pclock','pz_pboss1','pz_plib','pz_pmirror','pz_pgarden','pz_pqueen','pz_parm','pz_pjail','pz_pobs','pz_peng','pz_pmaze','pz_pcrypt','pz_pvalve','pz_plast','pz_pdragon','pz_phall','pz_pheart'];
for (const id of ids) {
  ok(html.includes(`id:'${id}'`), `original puzzle id preserved: ${id}`);
  ok(ink.includes(`${id}:`), `hand-inked illustration and lore remain keyed: ${id}`);
}

// Each of the core procedural engines is exercised at all eight difficulty levels.
const c = makeContext();
block(c, 'const PL_LV=', 'function runPLock(', 'globalThis.plMake=plMake;globalThis.plSat=plSat;');
block(c, 'const PQ_LV=', 'function runPLiar(', 'globalThis.pqMake=pqMake;globalThis.pqEval=pqEval;');
block(c, 'const PC_LV=', 'function runPClock(', 'globalThis.pcMake=pcMake;');
block(c, 'const PLB_S=', 'function runPLib(', 'globalThis.plbMake=plbMake;');
block(c, 'const PM_LV=', 'function runPMirror(', 'globalThis.pmMake=pmMake;globalThis.pmTrace=pmTrace;globalThis.pmCount=pmCountSolutions;');
block(c, 'const PGD_LV=', 'function runPGarden(', 'globalThis.pgMake=pgMake;globalThis.pgFlow=pgFlow;');
block(c, 'const PA_SH=', 'function runPArm(', 'globalThis.paMake=paMake;globalThis.paRot=paRot;');
block(c, 'const PJ_EV=', 'function runPJail(', 'globalThis.pjMake=pjMake;globalThis.pjSat=pjSat;');
block(c, 'const PO_LV=', 'function runPObs(', 'globalThis.poMake=poMake;globalThis.poCount=poCountSolutions;');
block(c, 'const PZM_LV=', 'function runPMaze(', 'globalThis.pzmMake=pzmMake;globalThis.pzmSolve=pzmSolve;globalThis.pzmOpen=pzmOpen;');
block(c, 'const PCR_LV=', 'function runPCrypt(', 'globalThis.pcrMake=pcrMake;globalThis.pcrSolve=pcrSolve;globalThis.pcrCount=pcrCountSolutions;');
block(c, 'const PV_LV=', 'function runPValve(', 'globalThis.pvMake=pvMake;globalThis.pvOp=pvOp;globalThis.pvRoute=pvRoute;');
block(c, 'const PH_LV=', 'function runPHeart(', 'globalThis.phMake=phMake;');
block(c, 'const ZO_T=', 'function runZThrone(', 'globalThis.zoMake=zoMake;globalThis.zoSat=zoSat;globalThis.zoCounts=ZO_CLUE_COUNTS;');
block(c, 'const PD_LV=', 'function runPDragon(', 'globalThis.pdMake=pdMake;globalThis.pdRuleSolutions=pdRuleSolutions;globalThis.pdRepairOptions=pdRepairOptions;globalThis.pdLevels=PD_LV;globalThis.pdRuleNames=PD_RULE_NAME;');

// Lock equations: the stored combination satisfies all carved clues.
for (let lv=1; lv<=8; lv++) for (let t=0; t<2; t++) {
  const p=c.plMake(lv);
  ok(p.clues.every(cl=>c.plSat(cl,p.v)), `gate lock clues match the answer at level ${lv}`);
}

// Truth statues: brute-force every possible world and ensure exactly one is consistent.
for (let lv=1; lv<=8; lv++) for (let t=0; t<5; t++) {
  const p=c.pqMake(lv); let count=0, actual=false;
  for(let door=0;door<p.D;door++) for(let mask=0;mask<(1<<p.k);mask++) {
    const w={door,tr:Array.from({length:p.k},(_,i)=>!!(mask>>i&1))};
    if(p.sts.every((s,i)=>c.pqEval(s,w)===w.tr[i])) { count++; actual ||= door===p.sol.door && w.tr.every((v,i)=>v===p.sol.tr[i]); }
  }
  eq(count,1,`statue statements have one world at level ${lv}`);
  ok(actual,`statue solution matches the unique world at level ${lv}`);
}

// Clock sync: solution is the first positive common twelve-o'clock strike.
for(let lv=1;lv<=8;lv++) for(let t=0;t<8;t++) {
  const p=c.pcMake(lv);
  ok(p.T>0 && p.s.every((v,i)=>(p.h[i]+v*p.T)%12===0),`clock system synchronises at level ${lv}`);
  for(let x=1;x<p.T;x++) ok(!p.s.every((v,i)=>(p.h[i]+v*x)%12===0),`clock answer is minimal at level ${lv}`);
}

// Diary pages: every adjacent page boundary shares the declared overlap.
for(let lv=1;lv<=8;lv++) for(let t=0;t<6;t++) {
  const p=c.plbMake(lv), pages=p.pages.map(x=>x.split(' '));
  ok(pages.length>=3,`diary has enough pages at level ${lv}`);
  for(let i=0;i<pages.length-1;i++) eq(pages[i].slice(-p.ov).join(' '),pages[i+1].slice(0,p.ov).join(' '),`diary overlap at level ${lv}`);
}

// Colour beams: all crystals are lit, and only one mirror orientation set can do so.
for(let lv=1;lv<=8;lv++) for(let t=0;t<8;t++) {
  const p=c.pmMake(lv), trace=c.pmTrace(p,p.sol), count=c.pmCount(p).count;
  eq(trace.lit.size,p.crys.length,`beam reaches every crystal at level ${lv}`);
  eq(count,1,`beam solution is unique at level ${lv}`);
  ok(c.pmTrace(p,p.s0).lit.size<p.crys.length,`initial mirror state is not already solved at level ${lv}`);
}

// Garden channels: the published target levels are reproduced by a unique gate pattern.
for(let lv=1;lv<=8;lv++) for(let t=0;t<6;t++) {
  const p=c.pgMake(lv); let count=0;
  for(let mask=0;mask<(1<<p.g)&&count<2;mask++) {
    const state=Array.from({length:p.g},(_,i)=>!!(mask>>i&1)), flow=c.pgFlow(p.T,state,p.W);
    if(Object.keys(p.need).every(k=>flow[k]===p.need[k])) count++;
  }
  eq(count,1,`garden flow has a unique valve layout at level ${lv}`);
  const flow=c.pgFlow(p.T,p.sol,p.W);
  ok(Object.keys(p.need).every(k=>flow[k]===p.need[k]),`garden stored answer matches every flower at level ${lv}`);
}

// Shape fitting: pieces at the generated coordinates reproduce the hidden silhouette exactly.
for(let lv=1;lv<=8;lv++) for(let t=0;t<5;t++) {
  const p=c.paMake(lv), placed=new Array(p.n*p.n).fill(-1);
  p.pcs.forEach((piece,i)=>c.paRot(piece.base,0).forEach(([x,y])=>{const at=(y+piece.sol[1])*p.n+x+piece.sol[0];ok(at>=0&&at<placed.length,`shape piece remains inside the board at level ${lv}`);ok(placed[at]===-1,`shape pieces do not overlap at level ${lv}`);placed[at]=i;}));
  ok(placed.every((v,i)=>(v>=0)===(p.occ[i]>=0)),`shape layout covers the silhouette at level ${lv}`);
}

// Prison testimonies: exactly one liar and one event order satisfy the statements.
for(let lv=1;lv<=8;lv++) for(let t=0;t<5;t++) {
  const p=c.pjMake(lv); let worlds=0,actual=false;
  for(let liar=0;liar<p.np;liar++) for(const ord of c.xcPerms(p.ne)) {
    const pos=[];ord.forEach((event,index)=>pos[event]=index);
    if(p.sts.every((s,i)=>c.pjSat(s,pos)=== (i!==liar))) { worlds++;actual ||= liar===p.liar&&ord.every((e,j)=>e===p.ord[j]); }
  }
  eq(worlds,1,`prison statements have one liar/order solution at level ${lv}`);
  ok(actual,`prison stored order matches the unique solution at level ${lv}`);
}

// Transparent charts: only one rotation/translation places every gold star on a blue star.
for(let lv=1;lv<=8;lv++) for(let t=0;t<8;t++) {
  const p=c.poMake(lv);
  eq(c.poCount(p),1,`overlay has one valid placement at level ${lv}`);
}

// Rotating maze: the stored path is legal and is the solver's shortest route.
for(let lv=1;lv<=8;lv++) for(let t=0;t<4;t++) {
  const p=c.pzmMake(lv), path=c.pzmSolve(p);
  ok(!!path,`rotating maze has a route at level ${lv}`);
  eq(path.length,p.min,`rotating maze minimum agrees with BFS at level ${lv}`);
  let pos=p.start, tick=0;
  for(const d of path){const x=pos%p.n+c.D4[d][0],y=((pos/p.n)|0)+c.D4[d][1];ok(c.inb(x,y,p.n,p.n),`maze move stays in bounds at level ${lv}`);const next=y*p.n+x;ok(!!(c.pzmOpen(p,pos,tick)&(1<<d)),`maze source door is open at level ${lv}`);ok(!!(c.pzmOpen(p,next,tick)&(1<<((d+2)%4))),`maze destination door is open at level ${lv}`);pos=next;tick++;}
  eq(pos,p.goal,`maze path reaches the exit at level ${lv}`);
}

// Nonogram: exact row/column enumeration proves a single picture and deduction solver returns it.
for(let lv=1;lv<=8;lv++) for(let t=0;t<8;t++) {
  const p=c.pcrMake(lv),sol=c.pcrSolve(p.R,p.C,p.n);
  eq(c.pcrCount(p.R,p.C,p.n),1,`cryptogram has a unique picture at level ${lv}`);
  ok(!!sol && sol.every((v,i)=>v===p.a[i]),`cryptogram deduction solution matches the picture at level ${lv}`);
}

// Valve mechanics: integer remainder is assigned to the right chamber, exactly as explained to players.
const odd=c.pvOp([5,2,0],0);
eq(odd[0],3,'odd split floors the left chamber');
eq(odd[1],4,'odd split sends the extra unit to the right chamber');
for(let lv=1;lv<=8;lv++) for(let t=0;t<4;t++) {
  const p=c.pvMake(lv),q=[[p.start,0]],seen=new Set([p.start.join(',')]);let min=null;
  for(let h=0;h<q.length&&min===null;h++){
    const [state,d]=q[h];if(state.every((v,i)=>v===p.goal[i])){min=d;break;}
    for(let i=0;i<p.k-1;i++){const nxt=c.pvOp(state,i),key=nxt.join(',');if(!seen.has(key)){seen.add(key);q.push([nxt,d+1]);}}
  }
  eq(min,p.min,`valve generator stores shortest solution at level ${lv}`);
  const route=c.pvRoute(p.start,p.goal);
  eq(route.length,p.min,`valve hint route is shortest at level ${lv}`);
  const reached=route.reduce((state,i)=>c.pvOp(state,i),p.start);
  ok(reached.every((v,i)=>v===p.goal[i]),`valve hint route reaches the generated target at level ${lv}`);
}

// Final heart: the generated placement uses every distinct slot and balances the moments.
for(let lv=1;lv<=8;lv++) for(let t=0;t<6;t++) {
  const p=c.phMake(lv);
  eq(new Set(p.sol).size,p.k,`heart uses distinct balance slots at level ${lv}`);
  eq(p.w.reduce((sum,w,i)=>sum+w*p.sol[i],0),0,`heart placement balances at level ${lv}`);
}

// Seven thrones: clue counts are genuinely tiered, and each generated circular arrangement is unique.
for(let lv=1;lv<=8;lv++) for(let t=0;t<8;t++) {
  const p=c.zoMake(lv),pos=p.pos,perms=c.xcPerms(6).map(q=>{const r=[];q.forEach((v,i)=>r[v]=i);return r;});
  eq(p.level,lv,`throne preserves requested difficulty at level ${lv}`);
  eq(p.clues.length,c.zoCounts[lv-1],`throne clue count follows the intended progression at level ${lv}`);
  ok(p.clues.every(q=>c.zoSat(q,pos,6)),`all throne carvings agree with the hidden arrangement at level ${lv}`);
  eq(perms.filter(q=>p.clues.every(x=>c.zoSat(x,q,6))).length,1,`throne clues have exactly one circular arrangement at level ${lv}`);
}
// Dragon language: the displayed rule family determines one next rune; damaged rows have one repair only.
for(let lv=1;lv<=8;lv++) for(let t=0;t<5;t++) {
  const p=c.pdMake(lv);
  eq(p.level,lv,`dragon preserves requested difficulty at level ${lv}`);
  eq(p.dr.length,p.k,`dragon count matches the level at ${lv}`);
  eq(p.dr.filter(x=>x.bad>=0).length,p.ex,`dragon exceptions match the level at ${lv}`);
  for(const row of p.dr){
    const next=c.pdRuleSolutions(row.seq,row.rule);
    if(row.bad<0){eq(next.length,1,`undamaged dragon row has one next symbol at level ${lv}`);eq(next[0],row.next,`undamaged dragon answer matches its rule at level ${lv}`)}
    else {eq(next.length,0,`damaged dragon row cannot be mistaken for a valid pattern at level ${lv}`);const fixes=c.pdRepairOptions(row.seq,row.rule);eq(fixes.length,1,`damaged dragon row has one correction at level ${lv}`);eq(fixes[0].index,row.bad,`dragon marks the exact wrong position at level ${lv}`);eq(fixes[0].next,row.next,`dragon correction restores the unique next symbol at level ${lv}`);ok(fixes[0].value!==row.seq[row.bad],`dragon correction changes the damaged rune at level ${lv}`)}
  }
}

// Text consistency and release regression guards.
ok(html.includes('pcrCountSolutions(R,C,n)===1'), 'cryptogram generator rejects ambiguous boards');
ok(html.includes('pmCountSolutions(P).count!==1'), 'colour-beam generator rejects ambiguous settings');
ok(html.includes('poCountSolutions(P)!==1'), 'transparent-chart generator rejects ambiguous overlays');
ok(html.includes('وحدة زائدة تذهب إلى الغرفة اليمنى'), 'valve instructions match the implemented odd split');
ok(html.includes('أول اتفاق عند ${XAR(P.T)} دقة'), 'clock hint describes the earliest shared strike');
ok(html.includes('PD_RULE_NAME[x.rule]'), 'dragon rule family is visible to the player');

console.log(JSON.stringify({ status:'passed', assertions:checks, castlePuzzleIds:ids.length, coverage:{ coreEngines:'all 8 levels', testedGenerators:['equation locks','truth statues','clock synchronisation','overlapping diary pages','colour beams','garden flow','shape fitting','prison chronology','transparent star charts','rotating maze','nonogram','equalising valves','final balance','seven-throne logic','dragon pattern language'], uniqueSolutionGuards:['colour beams','transparent star charts','nonogram','dragon pattern repair'], compositeCoverage:['gatekeeper','queen','engineer','last prisoner','seven thrones'] }, validation:'deterministic source-level generator and solver tests; not a visual browser or physical-device test' }, null, 2));
