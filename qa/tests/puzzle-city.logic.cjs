const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(__dirname, '../../ui/app.js'), 'utf8');
let assertions = 0;
const check = (value, message) => { assert.ok(value, message); assertions++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); assertions++; };

function context(seed = 0x51A7) {
  let state = seed >>> 0;
  const M = Object.create(Math);
  M.random = () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const c = {
    Math: M, Map, Set, Int8Array, Int16Array, Array, Object, Number, String, Date,
    Infinity, console,
    rnd: n => Math.floor(M.random() * n),
    pick: a => a[Math.floor(M.random() * a.length)],
    shuffle: a => {
      a = a.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(M.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    clamp: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    inb: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h,
  };
  vm.createContext(c);
  return c;
}
function evaluate(c, start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `source block exists: ${start}`);
  vm.runInContext(source.slice(a, b), c);
}

// Code lock: every clue set has exactly one candidate, and it is the built-in key.
{
  const c = context(0x10C0);
  evaluate(c, 'function lkFb(', 'function runLock(');
  let samples = 0;
  for (let lv = 1; lv <= 7; lv++) {
    for (let i = 0; i < 12; i++) {
      const p = c.lkMake(lv);
      const candidates = c.lkAll(p.D).filter(candidate => p.clues.every(clue => {
        const f = c.lkFb(clue.g, candidate);
        return f[0] === clue.fb[0] && f[1] === clue.fb[1];
      }));
      equal(candidates.length, 1, `code-lock unique solution at level ${lv}`);
      equal(Array.from(candidates[0]).join(','), Array.from(p.sec).join(','), `code-lock answer matches clues at level ${lv}`);
      samples++;
    }
  }
  check(samples === 84, 'code-lock sample count');
}

// Logic grid: clues uniquely determine the stored arrangement across every level.
{
  const c = context(0x10C1);
  evaluate(c, 'const LG_P=', 'function runGrid(');
  const holds = (clue, s) => clue.t === 'pos' ? s[clue.k][clue.p] === clue.v
    : clue.t === 'neg' ? s[clue.k][clue.p] !== clue.v
    : clue.t === 'lnk' ? s[clue.k1].indexOf(clue.v1) === s[clue.k2].indexOf(clue.v2)
    : s[clue.k1].indexOf(clue.v1) !== s[clue.k2].indexOf(clue.v2);
  let samples = 0;
  for (let lv = 1; lv <= 7; lv++) {
    for (let i = 0; i < 10; i++) {
      const p = c.lgMake(lv), perms = c.lgPerms(p.n);
      let count = 0, actualFound = false;
      const visit = (k, chosen) => {
        if (count > 1) return;
        if (k === p.a) {
          if (p.clues.every(cl => holds(cl, chosen))) {
            count++;
            if (chosen.every((r, j) => r.join(',') === p.sol[j].join(','))) actualFound = true;
          }
          return;
        }
        for (const perm of perms) visit(k + 1, [...chosen, perm]);
      };
      visit(0, []);
      equal(count, 1, `logic-grid unique solution at level ${lv}`);
      check(actualFound, `logic-grid generated answer matches clues at level ${lv}`);
      samples++;
    }
  }
  check(samples === 70, 'logic-grid sample count');
}

// Rush Hour: generated boards are legal and solver moves lead to the exit.
{
  const c = context(0x10C2);
  evaluate(c, 'const RUSH_B=', 'function rhDecode(');
  evaluate(c, 'function rhDecode(', 'function carSVG(');
  const valid = vs => {
    if (!vs.length || vs[0].h !== 1 || vs[0].r !== 2 || vs[0].len !== 2) return false;
    const occupied = new Int8Array(36).fill(-1);
    for (let i = 0; i < vs.length; i++) {
      const v = vs[i];
      if (![2, 3].includes(v.len) || ![0, 1].includes(v.h)) return false;
      for (let k = 0; k < v.len; k++) {
        const r = v.r + (v.h ? 0 : k), col = v.c + (v.h ? k : 0);
        if (r < 0 || col < 0 || r >= 6 || col >= 6) return false;
        const at = r * 6 + col;
        if (occupied[at] !== -1) return false;
        occupied[at] = i;
      }
    }
    return true;
  };
  let samples = 0;
  for (let lv = 1; lv <= 8; lv++) {
    for (let i = 0; i < 2; i++) {
      const p = c.rhMake(lv);
      check(valid(p.vs), `rush-hour board has valid geometry at level ${lv}`);
      const solution = c.rhSolve(p.vs, 200000);
      check(!!solution, `rush-hour solver finds a path at level ${lv}`);
      equal(solution.length, p.min, `rush-hour stored minimum matches solver at level ${lv}`);
      const board = p.vs.map(v => ({ ...v }));
      for (const [car, pos] of solution) {
        if (board[car].h) board[car].c = pos; else board[car].r = pos;
        check(valid(board), `rush-hour solution move remains legal at level ${lv}`);
      }
      equal(board[0].c, 4, `rush-hour solution reaches exit at level ${lv}`);
      samples++;
    }
  }
  check(samples === 16, 'rush-hour sample count');
}

// Regression guards for shared play controls: charge hints before a hint can solve,
// and fully reset attempt counters/UI when Restart is used.
{
  const playStart = runtime.indexOf('const pzPlay = function(id, build)');
  const playEnd = runtime.indexOf('window.pzPlay = pzPlay', playStart);
  const block = runtime.slice(playStart, playEnd);
  const hintStart = block.indexOf('hb.onclick=');
  const hintEnd = block.indexOf('const rb=', hintStart);
  const hint = block.slice(hintStart, hintEnd);
  check(hint.indexOf('hints++') < hint.indexOf('P.hint(hints)'), 'hint count is charged before a hint may solve the puzzle');
  check(hint.indexOf('setP(pts-Math.round(base*.2))') < hint.indexOf('P.hint(hints)'), 'hint coin penalty is applied before puzzle completion');
  const restartStart = block.indexOf('if(rb)rb.onclick=');
  const restartEnd = block.indexOf('let arm=', restartStart);
  const restart = block.slice(restartStart, restartEnd);
  for (const fragment of ['pts=base', 'hints=0', 'wrongs=0', "$('#pzhn').textContent='3'", 'hb.disabled=false'])
    check(restart.includes(fragment), `restart resets ${fragment}`);
}

console.log(JSON.stringify({
  status: 'passed',
  assertions,
  samples: { codeLock: 84, logicGrid: 70, rushHour: 16 },
  coverage: 'procedural puzzle generators, uniqueness, legal solver paths, and shared hint/restart regression guards; no visual-browser or touch-device validation',
}, null, 2));
