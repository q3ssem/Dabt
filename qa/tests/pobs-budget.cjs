// pz_pobs move budget on the two-layer board (motion/palace-motion.js), with real poMake boards and the screen's own
// input handlers in a minimal DOM. Based on the independent review's reproduction (pobs-budget.cjs): after 23 moves a
// 3-cell drag to the answer used to win with the counter at 24 although it cost 26.
// Rule kept from 5.5.28: 24 moves; the 24th move may still win; after the budget is spent the board is over.
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), src = fs.readFileSync(process.env.POBS_SRC || path.join(root, 'motion/palace-motion.js'), 'utf8');
let seed = 4242; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const gen = { Math: Object.create(Math), Set, inb: (x, y, w, h) => x >= 0 && y >= 0 && x < w && y < h };
gen.Math.random = rand; gen.rnd = n => Math.floor(rand() * n); gen.shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
vm.createContext(gen);
vm.runInContext(html.match(/^const paRot=.*$/m)[0] + ';globalThis.paRot=paRot;', gen);
vm.runInContext(html.slice(html.indexOf('function poCountSolutions('), html.indexOf('function paMake(')), gen);
vm.runInContext(html.slice(html.indexOf('const PO_LV='), html.indexOf('function runPObs(')), gen);
let n = 0; const check = (c, m) => { assert.ok(c, m); n++; };

function mount(board) {
  const nodes = new Map(), node = () => ({ innerHTML: '', textContent: '', tabIndex: 0, classList: { add() {}, toggle() {} }, addEventListener(k, v) { (this.h ||= {})[k] = v; }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 600 }), setPointerCapture() {} });
  const $ = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const res = { won: 0, lost: 0, hook: null };
  const api = { lv: 8, ended: false, body: { set innerHTML(x) {}, querySelectorAll: () => [] }, msg() {}, over() { res.lost++; api.ended = true; } };
  const ctx = { window: { MK: { attach() {} } }, MK: { attach() {} }, GM: { pz_pobs: {} }, pzPlay: (g, fn) => fn(api), poMake: () => board, paRot: gen.paRot, inb: gen.inb, $, XAR: String,
    xSheet: x => x, xHead: () => '', tone() {}, sfx: { lvl() {} }, later: fn => fn(), pWin: () => { res.won++; api.ended = true; }, pzHook: x => res.hook = x, addEventListener() {}, removeEventListener() {} };
  vm.runInNewContext(src, ctx); ctx.GM.pz_pobs.run();
  const cell = 600 / board.n, s = () => res.hook.state();
  res.drag = (tx, ty, cancel) => { const st = s(), x0 = (st.dx + .5) * cell, y0 = (st.dy + .5) * cell, pos = $('#pos');
    pos.h.pointerdown({ clientX: x0, clientY: y0, pointerId: 1, preventDefault() {} });
    pos.h.pointermove({ clientX: x0 + (tx - st.dx) * cell, clientY: y0 + (ty - st.dy) * cell });
    cancel ? pos.h.pointercancel() : pos.h.pointerup(); };
  return res;
}
// boards from the generator whose answer needs at least a 3-cell slide from the corner after turning
const boards = []; for (let i = 0; i < 4000 && boards.length < 25; i++) { const P = gen.poMake(8); if (P.ans[0] + P.ans[1] >= 3) boards.push(P); }
check(boards.length >= 10, 'enough generator boards with a 3+ cell slide');

let cases = 0; const seen = { win24: 0, short: 0, within: 0, review: 0 };
for (const P of boards) {
  // spend exactly `used` moves: turn to P.R, then nudge down/up (the sheet ends on row 0 or 1, unturned otherwise)
  const prep = used => { const r = mount(P); for (let i = 0; i < P.R; i++) r.hook.mv('t'); for (let i = P.R; i < used; i++) r.hook.mv(i % 2 === P.R % 2 ? 'd' : 'u'); return r; };
  const dist = st => Math.abs(P.ans[0] - st.dx) + Math.abs(P.ans[1] - st.dy);
  for (const left of [1, 2, 3]) {
    const used = 24 - left, r = prep(used), st = r.hook.state();
    if (st.moves !== used || st.r !== P.R) continue; const d = dist(st); if (d === 0) continue; cases++;
    r.drag(P.ans[0], P.ans[1]); const after = r.hook.state(), went = Math.abs(after.dx - st.dx) + Math.abs(after.dy - st.dy);
    check(after.moves <= 24, `${used}+drag: the counter never passes 24 (got ${after.moves})`);
    check(after.moves === used + went, `${used}+drag: the counter grows by the cells actually travelled`);
    check(!(r.won && r.lost), `${used}+drag: never both won and lost`);
    if (d <= left) seen.within++; else seen.short++;
    if (left === 1 && d >= 3) { seen.review++; check(r.won === 0 && after.moves === 24 && went === 1, 'review case: 23 moves + a 3+ cell drag to the answer moves one cell, ends at 24 and does not win'); }
    if (d <= left) check(r.won === 1 && after.moves === used + d, `${used}+${d}: a slide within the budget wins on move ${used + d}`);
    else { check(r.won === 0, `${used}+${d}: a ${d}-cell slide with ${left} move(s) left does not win`); check(went === left && after.moves === 24, `${used}+${d}: the sheet travels only ${left} cell(s)`); check(r.lost === 1, `${used}+${d}: the board is over when the budget is spent`); }
  }
  // the 24th move can still win: all turns first (4k + R), then slide to one cell short of the answer, 23 moves spent
  { const path = []; let x = 0, y = 0; while (x < P.ans[0]) { path.push('r'); x++; } while (y < P.ans[1]) { path.push('d'); y++; } const last = path.pop(), turns = 23 - path.length;
    if (last && turns >= P.R && (turns - P.R) % 4 === 0) { const r = mount(P); for (let i = 0; i < turns; i++) r.hook.mv('t'); path.forEach(m => r.hook.mv(m));
      const st = r.hook.state(); if (st.moves === 23 && st.r === P.R) { cases++; r.drag(st.dx + (last === 'r'), st.dy + (last === 'd'));
        seen.win24++; check(r.won === 1 && r.hook.state().moves === 24 && r.lost === 0, '23+1: the 24th move (a one-cell drag) still wins'); } } }
  // a cancelled drag costs nothing and moves nothing
  { const r = mount(P); for (let i = 0; i < P.R; i++) r.hook.mv('t'); const c0 = JSON.stringify(r.hook.state()); r.drag(P.ans[0], P.ans[1], true);
    check(JSON.stringify(r.hook.state()) === c0 && r.won === 0, 'a cancelled drag costs no move'); }
  // after a win, further taps and drags change nothing and do not win twice
  { const r = mount(P); for (let i = 0; i < P.R; i++) r.hook.mv('t'); r.drag(P.ans[0], P.ans[1]); const w0 = JSON.stringify(r.hook.state());
    check(r.won === 1, 'a drag onto the answer wins'); for (const m of ['t', 'u', 'd', 'l', 'r', 't']) r.hook.mv(m); r.drag(0, 0);
    check(r.won === 1 && r.lost === 0 && JSON.stringify(r.hook.state()) === w0, 'taps and drags after the win change nothing'); }
}
check(cases >= 30 && seen.win24 >= 3 && seen.short >= 10 && seen.within >= 3 && seen.review >= 3, `every budget edge ran: ${JSON.stringify(seen)}`);
console.log(`pz_pobs move budget: ${JSON.stringify(seen)} · ${n} assertions on ${boards.length} poMake(8) boards (23+1, 23+2, 23+3, review case, cancelled drag, after-win input).`);
