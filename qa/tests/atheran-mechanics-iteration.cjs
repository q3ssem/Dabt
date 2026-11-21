'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
let seed = 0x55152026;
const M = Object.create(Math);
M.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
const c = {
  Math: M, Array, Object, Set, Map, Number, String, Infinity, console,
  rnd: n => Math.floor(M.random() * n),
  pick: a => a[Math.floor(M.random() * a.length)],
  shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(M.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  aPerms: n => { const out = []; const rec = (a, u) => { if (a.length === n) { out.push(a.slice()); return; } for (let i=0;i<n;i++) if(!u[i]) {u[i]=1;a.push(i);rec(a,u);a.pop();u[i]=0;} }; rec([],[]); return out; },
  D4: [[0,-1],[1,0],[0,1],[-1,0]],
  inb: (x,y,w,h) => x >= 0 && y >= 0 && x < w && y < h,
};
vm.createContext(c);
const blocks = [
  ['const AAR_SHIP=', 'function runAArch('],
  ['const ASD_H=', 'function runAShade('],
  ['const AEC_LV=', 'function runAEcho('],
  ['const ARL_SRC=', 'function runARelic('],
  ['const AHT_LV=', 'function runAHeart('],
];
for (const [start,end] of blocks) {
  const a = html.indexOf(start), b = html.indexOf(end,a+start.length);
  assert.ok(a>=0 && b>a, `source range exists: ${start}`);
  vm.runInContext(html.slice(a,b),c,{timeout:15000});
}
let checks=0;
const ok=(v,msg)=>{assert.ok(v,msg);checks++;};
const eq=(a,b,msg)=>{assert.equal(a,b,msg);checks++;};

// 1) Archive: partial clue audit, duplicate detection and complete consistency.
for(let lv=1;lv<=8;lv++) for(let sample=0;sample<24;sample++) {
  const P=c.aarMake(lv), full=c.aarAudit(P,P.cap,P.fat);
  eq(full.bad,0,`archive all clues satisfied lv${lv}`);
  eq(full.dupCap,0,`archive captain uniqueness lv${lv}`);
  eq(full.dupFat,0,`archive fate uniqueness lv${lv}`);
  eq(full.checked,P.clues.length,`archive all clues checked lv${lv}`);
  const partialCap=P.cap.map((v,i)=>i<Math.ceil(P.n/2)?v:-1);
  const partialFat=P.fat.map((v,i)=>i<Math.ceil(P.n/2)?v:-1);
  const partial=c.aarAudit(P,partialCap,partialFat);
  ok(partial.checked<=P.clues.length,`archive partial audit bounded lv${lv}`);
  ok(partial.checked>=0,`archive partial audit count valid lv${lv}`);
}
const pA=c.aarMake(8);
const duplicate=pA.cap.slice(); duplicate[1]=duplicate[0];
eq(c.aarAudit(pA,duplicate,pA.fat).dupCap,1,'archive identifies duplicate captain immediately');
eq(c.aarClueStatus({t:'eq',r:0,c:0},[-1,-1,-1],[ -1,-1,-1]),null,'archive leaves unresolved clue unknown');

// 2) Shadow: intersect all selected clue-hours; the intended entrance remains the sole candidate.
for(let lv=1;lv<=8;lv++) for(let sample=0;sample<24;sample++) {
  const P=c.asdMake(lv), candidates=c.asdCandidateCells(P,P.hs);
  eq(candidates.length,1,`shadow complete intersection unique lv${lv}`);
  eq(candidates[0],P.ans,`shadow complete intersection finds entrance lv${lv}`);
  for(const h of P.hs) ok(c.asdCandidateCells(P,[h]).includes(P.ans),`shadow individual hour retains entrance lv${lv}`);
  const only=P.hs.slice(0,Math.max(1,P.hs.length-1));
  ok(c.asdCandidateCells(P,only).includes(P.ans),`shadow partial intersection retains entrance lv${lv}`);
}

// 3) Echo source: independent listener measurements intersect to one cell.
for(let lv=1;lv<=8;lv++) for(let sample=0;sample<24;sample++) {
  const P=c.aecMake(lv), candidates=c.aecCandidateCells(P,P.posts.map((_,i)=>i));
  eq(candidates.length,1,`echo all listeners uniquely identify source lv${lv}`);
  eq(candidates[0],P.src,`echo all listeners resolve actual source lv${lv}`);
  for(let i=0;i<P.posts.length;i++) ok(c.aecCandidateCells(P,[i]).includes(P.src),`echo listener ${i+1} retains source lv${lv}`);
  const pair=P.posts.length>1?[0,P.posts.length-1]:[0];
  ok(c.aecCandidateCells(P,pair).includes(P.src),`echo pair intersection retains source lv${lv}`);
}

// 4) Relic archive: the interactive hypothesis test must identify exactly the truthful source.
for(let lv=1;lv<=8;lv++) for(let sample=0;sample<80;sample++) {
  const P=c.arlMake(lv), hypotheses=c.arlHypotheses(P.S,P.ev);
  eq(hypotheses.length,1,`relic unique truthful hypothesis lv${lv}`);
  eq(hypotheses[0],P.tr,`relic hypothesis points to true archive source lv${lv}`);
  ok(P.S[P.tr].every((v,j)=>v===P.T[j]),`relic truthful row matches truth lv${lv}`);
  ok(P.S.every((row,i)=>i===P.tr||row.filter((v,j)=>v!==P.T[j]).length===1),`relic each other account differs by one item lv${lv}`);
}

// 5) Heart: reverse operations one at a time, and allow exact step redo.
for(let lv=1;lv<=8;lv++) for(let sample=0;sample<50;sample++) {
  const P=c.ahtMake(lv); let work=P.g.slice();
  for(let i=P.ops.length-1;i>=0;i--) {
    const op=P.ops[i]; work=c.ahtApply(work,P.n,{...op,k:-op.k});
  }
  ok(work.every((v,i)=>v===P.o[i]),`heart reverse all operations reconstructs origin lv${lv}`);
  const forward=P.ops.reduce((g,op)=>c.ahtApply(g,P.n,op),P.o.slice());
  ok(forward.every((v,i)=>v===P.g[i]),`heart forward operations reconstruct current map lv${lv}`);
  eq(P.cands[P.ans].join(),P.o.join(),`heart correct candidate matches reconstructed origin lv${lv}`);
  if(P.ops.length) {
    const last=P.ops[P.ops.length-1], one=c.ahtApply(P.g,P.n,{...last,k:-last.k});
    const redo=c.ahtApply(one,P.n,last);
    eq(redo.join(),P.g.join(),`heart one-step reverse and redo are exact lv${lv}`);
  }
}

// Static UI integration guards: check the new controls and feedback are present in the actual game source.
for(const [needle,label] of [
  ['id="aaraudit"','archive live contradiction audit'],
  ['aria-live="polite"','accessible live status regions'],
  ['data-h="${h}"','shadow controls limited to clue hours'],
  ['id="asdc"','shadow candidate count'],
  ['اختر مستمعًا أو أكثر','echo multi-listener instructions'],
  ['id="aecclear"','echo reset control'],
  ['data-hyp="${i}"','relic source hypothesis action'],
  ['استخدم الرواية المتسقة','relic hypothesis transfer action'],
  ['data-axis="${axis}" data-index="${index}" data-dir="${dir}"','heart direct row and column controls for reverse steps'],
  ['id="ahtback"','heart one-step redo control'],
  ['id="ahtreset"','heart reset control'],
]) ok(html.includes(needle),label);

const sw=fs.readFileSync('sw.js','utf8');
console.log(`Atheran mechanics iteration: ${checks.toLocaleString('en-US')} assertions; 5 puzzle engines × 8 levels; archive audit, shadow and echo intersections, unique source hypotheses, and reversible map operations verified.`);
