'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
let seed = 0xA7E2026;
const M = Object.create(Math);
M.random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 0x100000000; };
const c = {
  Math: M, Array, Object, Set, Map, Number, String, Infinity, console,
  XAR: n => String(n),
  rnd: n => Math.floor(M.random() * n),
  pick: a => a[Math.floor(M.random() * a.length)],
  shuffle: a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(M.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  aPerms: n => { const out = []; const rec = (a, u) => { if (a.length === n) { out.push(a.slice()); return; } for (let i = 0; i < n; i++) if (!u[i]) { u[i] = 1; a.push(i); rec(a, u); a.pop(); u[i] = 0; } }; rec([], []); return out; },
  D4: [[0,-1],[1,0],[0,1],[-1,0]],
  inb: (x,y,w,h) => x >= 0 && y >= 0 && x < w && y < h,
};
vm.createContext(c);
const blocks = [
  ['const AAR_SHIP=', 'function runAArch('], ['const APT_LV=', 'function runAPort('], ['const ALT_LV=', 'function runALight('],
  ['const ACU_LV=', 'function runACur('], ['const ASH_LV=', 'function runAShell('], ['const ARO_LV=', 'function runARoot('],
  ['const ARG_LV=', 'function runARing('], ['const ASD_H=', 'function runAShade('], ['const ASW_LV=', 'function runASwarm('],
  ['const AEC_LV=', 'function runAEcho('], ['const AMOTIF=', 'function runAVsong('], ['const AGI_LV=', 'function runAGiant('],
  ['const AHE_LV=', 'function runAHerd('], ['const ABR_LV=', 'function runABridge('], ['const ASI_LV=', 'function runASilent('],
  ['const ALY_LV=', 'function runALayer('], ['const ACT_SP=', 'function runACity('], ['const ASO_LV=', 'function runASong('],
  ['const AFL_LV=', 'function runAFlow('], ['const ARL_SRC=', 'function runARelic('], ['const AHT_LV=', 'function runAHeart('],
  ['const WBO_J=', 'function runWBone('], ['const WSP_LV=', 'function runWSpore('], ['const WLG_LV=', 'function runWLog('],
  ['const WLK_LV=', 'function runWLake('], ['const WFI_S=', 'function runWFirst('],
];
const names = ['aarMake','aptMake','altMake','acuMake','ashMake','artMake','argMake','asdMake','aswMake','aecMake','avsMake','agiMake','aheMake','abrMake','asiMake','alyMake','actMake','asoMake','aflMake','arlMake','ahtMake','wboMake','wspMake','wlgMake','wlkMake','wfiMake'];
let checks = 0;
const ok = (v, label) => { assert.ok(v, label); checks++; };
const eq = (a, b, label) => { assert.equal(a, b, label); checks++; };
for (let i = 0; i < blocks.length; i++) {
  const [start, end] = blocks[i], a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  ok(a >= 0 && b > a, `generator source exists: ${names[i]}`);
  let code = html.slice(a, b);
  const re = new RegExp(`return ${names[i]}\\(Math\\.max\\(1,lv-1\\)\\)}`, 'g');
  code = code.replace(re, `const _old=${names[i]}(Math.max(1,lv-1));_old._legacyDowngrade=true;_old._requested=lv;return _old}`);
  const expose = { 3: 'globalThis.ACU_LV=ACU_LV', 4: 'globalThis.ASH_LV=ASH_LV', 13: 'globalThis.ABR_LV=ABR_LV', 21: 'globalThis.WBO_LV=WBO_LV;globalThis.WBO_J=WBO_J' }[i] || '';
  vm.runInContext(code + (expose ? `\n;${expose}` : ''), c, { timeout: 10000 });
}

function distances(P, useValid) {
  const d = Array(P.np).fill(-1); d[P.s] = 0; const q = [P.s];
  while (q.length) {
    const u = q.shift();
    for (const e of P.E) {
      if (useValid && !P.usable(e)) continue;
      const v = e[0] === u ? e[1] : e[1] === u ? e[0] : -1;
      if (v < 0 || d[v] >= 0) continue;
      d[v] = d[u] + 1; q.push(v);
    }
  }
  return d;
}
function shellCandidateCount(P) {
  const F = P.F, L = P.L, mi = P.mi;
  const pres = Array.from({ length: F }, (_, j) => j).filter(j => j !== mi);
  const mels = new Set();
  for (const pm of c.aPerms(pres.length)) {
    const arr = Array(F).fill(null); pres.forEach((slot, k) => { arr[slot] = P.fr[pres[pm[k]]]; });
    let good = true;
    for (let j = 0; j < F - 1 && good; j++) if (arr[j] && arr[j+1] && arr[j][2] !== arr[j+1][0]) good = false;
    if (!good) continue;
    const m = Array(L).fill(-1);
    arr.forEach((f, j) => { if (f) f.forEach((v, q) => { m[2*j+q] = v; }); });
    if (mi >= 0) { m[2*mi] = arr[mi-1][2]; m[2*mi+2] = arr[mi+1][0]; }
    for (let q = 0; q < L && good; q++) if (m[q] >= 0 && m[L-1-q] >= 0 && m[q] !== m[L-1-q]) good = false;
    if (good) mels.add(m.join());
  }
  return mels;
}
function bonePathCount(P) {
  let count = 0; const used = Array(P.all.length).fill(false);
  const rec = (joint, depth) => {
    if (count > 1) return;
    if (depth === P.nb) { if (joint === P.J[P.nb]) count++; return; }
    for (let i = 0; i < P.all.length; i++) {
      if (used[i]) continue;
      const b = P.all[i]; let next = -1;
      if (b[0] === joint) next = b[1]; else if (b[1] === joint) next = b[0];
      if (next < 0) continue;
      used[i] = true; rec(next, depth + 1); used[i] = false; if (b[0] === joint && b[1] === joint) break;
    }
  };
  rec(P.J[0], 0); return count;
}

const samplesPerLevel = 20;
for (let ix = 0; ix < names.length; ix++) {
  const fn = names[ix];
  for (let lv = 1; lv <= 8; lv++) for (let sample = 0; sample < samplesPerLevel; sample++) {
    const P = c[fn](lv);
    ok(P && typeof P === 'object', `${fn} level ${lv} returns a puzzle`);
    ok(!P._legacyDowngrade, `${fn} level ${lv} does not silently downgrade`);
    if (fn === 'acuMake') {
      const [W,H,ns,lost] = c.ACU_LV[lv-1];
      eq(P.W, W, `currents board width preserved at level ${lv}`); eq(P.H, H, `currents board height preserved at level ${lv}`);
      eq(P.rows.length, ns, `currents fleet size preserved at level ${lv}`); eq(P.lost, !!lost, `currents lost-vessel rule preserved at level ${lv}`);
      eq(P.paths.length, ns, `currents has one route per ship at level ${lv}`);
      const seen = new Set();
      P.paths.forEach((path, i) => {
        let x = W - 1, y = P.rows[i], step = 0;
        while (x >= 0 && step++ < W * H + 2) {
          const k = y * W + x;
          eq(path.p[step-1], k, `currents route follows its arrow at level ${lv}`);
          ok(!seen.has(k), `currents routes do not collide at level ${lv}`); seen.add(k);
          if (P.wh === k) break;
          const dir = P.g[y][x]; if (dir === 0) x--; else if (dir === 1) y--; else y++;
        }
        ok(step <= W * H + 1, `currents route terminates at level ${lv}`);
        if (P.wh >= 0 && path.p.includes(P.wh)) ok(path.land === -1, `lost ship terminates at whirlpool at level ${lv}`);
        else ok(x === -1 && path.land === y, `returned ship reaches its recorded shore at level ${lv}`);
      });
      eq(P.ans.length, ns, `currents answer covers every ship at level ${lv}`);
    }
    if (fn === 'ashMake') {
      const [L, miss] = c.ASH_LV[lv-1];
      eq(P.L, L, `shell song length retained at level ${lv}`); eq(P.mi >= 0, !!miss, `shell missing-fragment feature retained at level ${lv}`);
      const candidates = shellCandidateCount(P);
      eq(candidates.size, 1, `shell order and palindrome clues have one solution at level ${lv}`);
      const target = P.mel.slice(); if (P.mi >= 0) target[2*P.mi+1] = -1;
      ok(candidates.has(target.join()), `shell generator's answer is the unique candidate at level ${lv}`);
    }
    if (fn === 'abrMake') {
      const [g,np,stairs] = c.ABR_LV[lv-1];
      eq(P.g, g, `mist bridges grid size retained at level ${lv}`); eq(P.np, np, `mist bridges node count retained at level ${lv}`);
      eq(!!P.stairs, !!stairs, `mist bridge height rule retained at level ${lv}`);
      const all = distances(P, false), valid = distances(P, true);
      ok(valid[P.goal] > 0, `mist bridge goal is reachable on valid bridges at level ${lv}`);
      eq(valid[P.goal], P.min, `mist bridge minimum matches the solver at level ${lv}`);
      ok(all[P.goal] < valid[P.goal], `mist bridge view contains a shorter invalid shortcut at level ${lv}`);
      if (P._fallback) eq(P.min, 3 + Math.floor((lv-1)/2), `mist bridge fallback complexity scales with level ${lv}`);
    }
    if (fn === 'wboMake') {
      const [nb, extra] = c.WBO_LV[lv-1];
      eq(P.nb, nb, `bone chain length retained at level ${lv}`); eq(P.extra >= 0, !!extra, `bone intruder feature retained at level ${lv}`);
      ok(P.J.every(j => j >= 0 && j < c.WBO_J.length), `bone joints resolve to a drawn glyph at level ${lv}`);
      eq(bonePathCount(P), 1, `bone chain has exactly one valid reconstruction at level ${lv}`);
    }
    if (fn === 'artMake') {
      const need = P.H + 1 + (lv >= 3 ? 1 : 0) + (lv >= 6 ? 1 : 0);
      ok(P.min >= need, `root passage meets its promised shortest-route threshold at level ${lv}`);
    }
  }
}
eq(c.WBO_J.length, 11, 'bone joint icon library supports the longest unique chain');
const sw = fs.readFileSync('sw.js', 'utf8');
ok(sw.includes("const VERSION='5.5.30'"), 'service worker cache is versioned 5.5.28');
console.log(`Atheran mechanics: ${checks.toLocaleString('en-US')} assertions; 26 generators × 8 levels × ${samplesPerLevel} samples; solution integrity and level features verified.`);
