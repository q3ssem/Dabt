// pz_pobs hint 3 on the two-layer board (motion/palace-motion.js), with real poMake boards and the screen's own handlers.
// Found by the independent review of f84ad1a: a sheet as tall as the 9×9 board was clamped back onto the answer, the
// hint said «one move left» while every mark already matched, and no win was counted.
// Rule now: «باقي خطوة واحدة» only when the sheet sits on a legal, unsolved neighbour of the answer from which ONE pad
// move wins; otherwise a descriptive hint and the board is left as it was. The 24-move budget (and a 24th-move win) holds.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), src = fs.readFileSync(process.env.POBS_SRC || path.join(root, 'motion/palace-motion.js'), 'utf8');
let seed = 9001; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const gen = { Math: Object.create(Math), Set, inb: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h };
gen.Math.random = rand; gen.rnd = n => Math.floor(rand() * n); gen.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
vm.createContext(gen);
vm.runInContext(html.match(/^const paRot=.*$/m)[0] + ';globalThis.paRot=paRot;', gen);
vm.runInContext(html.slice(html.indexOf('function poCountSolutions('), html.indexOf('function paMake(')), gen);
vm.runInContext(html.slice(html.indexOf('const PO_LV='), html.indexOf('function runPObs(')), gen);
let n = 0; const check = (c, m) => { assert.ok(c, m); n++; };
const ONE = 'قرّبت لك الشفافة: باقي خطوة واحدة.';

function mount(board) {
  const nodes = new Map(), node = () => ({ innerHTML: '', textContent: '', tabIndex: 0, classList: { add() {}, toggle() {} }, addEventListener(k, v) { (this.h ||= {})[k] = v; }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }), setPointerCapture() {} });
  const $ = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const res = { won: 0, lost: 0 };
  const api = { lv: 8, ended: false, body: { set innerHTML(x) {}, querySelectorAll: () => [] }, msg() {}, over() { res.lost++; api.ended = true; } };
  const ctx = { window: { MK: { attach() {} } }, MK: { attach() {} }, GM: { pz_pobs: {} }, pzPlay: (g, fn) => fn(api), poMake: () => board, paRot: gen.paRot, inb: gen.inb, $, XAR: String,
    xSheet: x => x, xHead: () => '', tone() {}, sfx: { lvl() {} }, later: fn => fn(), pWin: () => { res.won++; api.ended = true; }, pzHook: x => res.hook = x, addEventListener() {}, removeEventListener() {} };
  vm.runInNewContext(src, ctx); res.H = ctx.GM.pz_pobs.run();
  res.matched = () => { const s = res.hook.state(), bset = new Set(board.bot); return gen.paRot(board.top, s.r).every(([x, y]) => gen.inb(x + s.dx, y + s.dy, board.n, board.n) && bset.has((y + s.dy) * board.n + x + s.dx)); };
  return res;
}
const ext = (P, r) => { const s = gen.paRot(P.top, r); return [Math.max(...s.map(a => a[0])) + 1, Math.max(...s.map(a => a[1])) + 1]; };
const step = (s, P) => P.ans[0] > s.dx ? 'r' : P.ans[0] < s.dx ? 'l' : P.ans[1] > s.dy ? 'd' : 'u';
const seen = { hint2near: 0, bothAxes: 0, fullHone: 0, fullWone: 0, one: 0, descriptive: 0, fullH: 0, fullW: 0, review: 0, at23: 0 };

function run(P, label, preMoves = 0) {
  const r = mount(P);
  // spend preMoves on the pad first (turns only, so the position stays at the corner), then hints 1, 2 and 3
  for (let i = 0; i < preMoves; i++) r.hook.mv('t');
  r.H.hint(1); check(!r.matched(), `${label}: hint 1 leaves the board unsolved`);
  const m2 = r.H.hint(2);
  // no hint may leave the board solved but unscored (the review's bug class: marks matched, no win)
  check(!r.matched() && r.won === 0, `${label}: hint 2 never completes the map for the player`);
  if (m2.includes('باقي خطوة واحدة')) { seen.hint2near++; const t = r.hook.state(); check(t.r === P.R && Math.abs(t.dx - P.ans[0]) + Math.abs(t.dy - P.ans[1]) === 1, `${label}: hint 2 leaves it one cell away when turning in place would solve it`); }
  const before = JSON.stringify(r.hook.state()); const msg = r.H.hint(3), s = r.hook.state();
  check(!(r.matched() && r.won === 0), `${label}: hint 3 never leaves the map solved without a win`);
  if (msg === ONE) { seen.one++;
    check(!r.matched(), `${label}: after «one move left» the marks do not all match yet`);
    check(s.r === P.R && Math.abs(s.dx - P.ans[0]) + Math.abs(s.dy - P.ans[1]) === 1, `${label}: the sheet is turned right and one cell from the answer`);
    check(s.moves === preMoves && r.won === 0, `${label}: the hint costs no move and wins nothing`);
    r.hook.mv(step(s, P));
    check(r.won === 1 && r.lost === 0 && r.hook.state().moves === preMoves + 1, `${label}: the next move wins exactly once (move ${preMoves + 1})`);
    for (const m of ['u', 'd', 'l', 'r', 't']) r.hook.mv(m); check(r.won === 1, `${label}: no second win`);
  } else { seen.descriptive++; const [ew, eh] = ext(P, P.R); if (P.ans) check(ew === P.n && eh === P.n || P.n === 3 || r.won, `${label}: a descriptive hint only when the turned sheet is as large as the board on both axes`);
    check(typeof msg === 'string' && msg.length > 10 && msg !== ONE, `${label}: a descriptive hint when no neighbour fits`);
    check(JSON.stringify(r.hook.state()) === before && r.won === 0, `${label}: the board is left as it was`); }
  return msg;
}

// 1) the exact board of the review (sheet as tall as the board, answer x=2 y=0)
const REVIEW = { n: 9, bot: [12, 77, 18, 44, 52, 28, 70, 66, 2, 5, 67, 50], top: [[0, 0], [1, 1], [3, 5], [3, 0], [5, 5], [3, 8], [5, 7], [6, 4]], R: 0, ans: [2, 0] };
check(ext(REVIEW, 0)[1] === 9, 'review board: the sheet fills the board height');
check(run(REVIEW, 'review board') === ONE, 'review board: «one move left» is now honest'); seen.review++;
// 2) real poMake(8) boards whose sheet fills the board height, and ones that fill its width
const fullH = [], fullW = [], fullB = [], other = [];
for (let i = 0; i < 30000 && (fullH.length < 12 || fullW.length < 12 || fullB.length < 6 || other.length < 40); i++) {
  const P = gen.poMake(8), [w, h] = ext(P, P.R);
  if (h === P.n && w === P.n) { if (fullB.length < 6) fullB.push(P); } else if (h === P.n) { if (fullH.length < 12) fullH.push(P); } else if (w === P.n) { if (fullW.length < 12) fullW.push(P); } else if (other.length < 40) other.push(P);
}
check(fullH.length >= 5 && fullW.length >= 5, `generator boards found: ${fullH.length} full-height, ${fullW.length} full-width, ${fullB.length} both`);
fullH.forEach((P, i) => { if (run(P, `full-height #${i}`) === ONE) seen.fullHone++; seen.fullH++; });
fullW.forEach((P, i) => { if (run(P, `full-width #${i}`) === ONE) seen.fullWone++; seen.fullW++; });
fullB.forEach((P, i) => { run(P, `full height and width #${i}`); seen.bothAxes++; });
other.forEach((P, i) => run(P, `board #${i}`));
// 3) budget: with 23 moves spent, hint 3 then the 24th move still wins (turns used to spend moves keep the corner)
// (boards whose answer is the corner itself are skipped here: turning alone would solve them before the hint)
[...fullH, ...fullW, ...fullB, ...other].filter(P => P.ans[0] + P.ans[1] > 0).slice(0, 24).forEach((P, i) => { const k = P.R + 4 * Math.floor((23 - P.R) / 4);
  if (k === 23) { const m = run(P, `23 moves + hint #${i}`, 23); if (m === ONE) seen.at23++; } });
// 4) a board as tall AND as wide as the board has no legal neighbour at all: descriptive hint, board untouched
const SH = [[0, 0], [2, 0], [0, 2], [1, 1]], BOTH = { n: 3, bot: SH.map(([x, y]) => y * 3 + x), top: gen.paRot(SH, 3), R: 1, ans: [0, 0] };
check(!gen.paRot(BOTH.top, 0).every(([x, y]) => BOTH.bot.includes(y * 3 + x)), 'the 3×3 test sheet does not start solved');
check(run(BOTH, 'sheet as large as the board') !== ONE, 'no neighbour exists: descriptive hint instead of «one move left»');

check(seen.fullHone === seen.fullH && seen.fullWone === seen.fullW && seen.hint2near >= 3 && seen.one >= 20 && seen.fullH >= 5 && seen.fullW >= 5 && seen.descriptive >= 1 && seen.at23 >= 1, `every hint case ran: ${JSON.stringify(seen)}`);
console.log(`pz_pobs hint 3: ${JSON.stringify(seen)} · ${n} assertions.`);
