// Pure constraint validators shared by Treasure Island, Planets, Lab cases and Child World.
// Every validator checks the constraints in `setup`; the authored `answer` is only used
// where the setup does not carry enough information to derive the rule (single choice,
// free-text logic sets). Alternative solutions that satisfy all constraints are accepted.

export const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
export function normalizeDigits(s) {
  return String(s ?? '').replace(/[٠-٩]/g, d => String(AR_DIGITS.indexOf(d))).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/٫/g, '.').trim();
}
export function parseNumber(s) {
  const t = normalizeDigits(s);
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every(x => b.some(y => String(y) === String(x)));
const sum = a => a.reduce((s, x) => s + Number(x), 0);
const R = (ok, reason = '') => ({ ok, reason });
const EMPTY = { ok: false, empty: true, reason: 'empty' };

// ---------- ordering ----------
export function satisfiesBefore(order, before = []) {
  for (const [a, b] of before) {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia < 0 || ib < 0 || ia > ib) return false;
  }
  return true;
}

export function sequenceTarget(setup) {
  if (setup.rule && Array.isArray(setup.given)) {
    // arithmetic continuation; length = number of pieces
    const n = (setup.pieces || []).length;
    const out = []; let last = setup.given[setup.given.length - 1];
    for (let i = 0; i < n; i++) { last += setup.rule.add; out.push(last); }
    return out;
  }
  if (setup.cycle && Array.isArray(setup.given)) {
    const out = []; const c = setup.cycle;
    let idx = c.indexOf(setup.given[setup.given.length - 1]);
    for (let i = 0; i < setup.count; i++) { idx = (idx + 1) % c.length; out.push(c[idx]); }
    return out;
  }
  return null;
}

export function sequencePieces(setup) {
  if (setup.rule) return [...setup.pieces];
  if (setup.cycle) return [...setup.cycle];
  return [...setup.items];
}
export function sequenceSlotCount(setup, answer) {
  if (setup.rule) return setup.pieces.length;
  if (setup.cycle) return setup.count;
  return setup.items.length;
}
export function sequenceReusable(setup) { return !!setup.cycle; }

export function validateSequence(setup, response, answer) {
  const n = sequenceSlotCount(setup, answer);
  if (!Array.isArray(response) || response.length !== n || response.some(x => x == null)) return EMPTY;
  const target = sequenceTarget(setup);
  if (target) return R(eq(response.map(String), target.map(String)), 'rule');
  if (!sequenceReusable(setup) && new Set(response).size !== response.length) return R(false, 'duplicate');
  if (setup.sort === 'ascending') return R(response.every((x, i) => i === 0 || Number(response[i - 1]) <= Number(x)), 'sort');
  if (setup.sort === 'descending') return R(response.every((x, i) => i === 0 || Number(response[i - 1]) >= Number(x)), 'sort');
  if (setup.before) return R(satisfiesBefore(response, setup.before), 'before');
  // No relational constraint: compare the displayed result (equivalent pieces allowed).
  const disp = x => (setup.display && setup.display[x]) || x;
  return R(eq(response.map(disp), answer.map(disp)), 'display');
}

// ---------- assignment / logic grid ----------
export function validateAssignment(setup, response) {
  // response: array aligned with setup.slots (or positions if no slots)
  const slots = setup.slots || setup.items.map((_, i) => i + 1);
  if (!Array.isArray(response) || response.length !== slots.length || response.some(x => x == null)) return EMPTY;
  if (new Set(response).size !== response.length) return R(false, 'duplicate');
  if (!response.every(x => setup.items.includes(x))) return R(false, 'unknown');
  for (const [slot, item] of Object.entries(setup.fixed || {})) {
    const i = slots.findIndex(s => String(s) === String(slot));
    if (response[i] !== item) return R(false, 'fixed');
  }
  for (const [slot, items] of Object.entries(setup.forbidden || {})) {
    const i = slots.findIndex(s => String(s) === String(slot));
    if (items.includes(response[i])) return R(false, 'forbidden');
  }
  if (setup.before && !satisfiesBefore(response, setup.before)) return R(false, 'before');
  return R(true);
}

// ---------- numeric ----------
export function computeNumeric(setup) {
  if ('driverTeeth' in setup) return setup.driverTurns * setup.driverTeeth / setup.drivenTeeth;
  if ('stock' in setup) return (setup.stock - setup.reserve) / setup.perHour;
  if (setup.countMode === 'letters') return [...setup.text.replace(/\s/g, '')].length;
  if ('seals' in setup) return setup.seals * setup.energyPerSeal - sum(setup.expenses);
  if ('window' in setup && setup.durations) return setup.window - sum(setup.durations);
  if (setup.durations) return sum(setup.durations);
  if ('dots' in setup) return setup.dots;
  if ('groups' in setup) return setup.groups * setup.each;
  if (setup.shape === 'square') return 4;
  if (Array.isArray(setup.given) && 'add' in setup && typeof setup.add === 'number') return setup.given[setup.given.length - 1] + setup.add;
  if ('start' in setup && (setup.subtract || setup.add)) return setup.start - sum(setup.subtract || []) + sum(setup.add || []);
  return null;
}
export function validateNumeric(setup, response, answer) {
  const v = parseNumber(response);
  if (v == null) return String(response ?? '').trim() ? R(false, 'nan') : EMPTY;
  const target = computeNumeric(setup) ?? answer;
  return R(Math.abs(v - target) < 1e-9);
}

// ---------- balance ----------
export function validateBalance(setup, count) {
  if (!Number.isInteger(count) || count < 0) return EMPTY;
  if (count > setup.available) return R(false, 'available');
  return R(count * setup.unitWeight === setup.target);
}

// ---------- rotate ----------
const DIRS = ['N', 'E', 'S', 'W'];
export function rotateTarget(setup) {
  if (setup.directions) {
    const deg = sum(setup.clockwiseDegrees);
    const i = DIRS.indexOf(setup.start);
    return DIRS[(i + Math.round(deg / 90)) % 4];
  }
  // dial with labels 1..size
  return ((setup.start - 1 + setup.step * setup.turns) % setup.size + setup.size) % setup.size + 1;
}
export function validateRotate(setup, response) {
  if (response == null) return EMPTY;
  return R(String(response) === String(rotateTarget(setup)));
}

// ---------- grid path ----------
const key = (r, c) => `${r},${c}`;
export function shortestPathLength(setup) {
  const [R_, C_] = setup.grid; const blocked = new Set((setup.blocked || []).map(([r, c]) => key(r, c)));
  const q = [[...setup.start, 0]]; const seen = new Set([key(...setup.start)]);
  while (q.length) {
    const [r, c, d] = q.shift();
    if (r === setup.end[0] && c === setup.end[1]) return d;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 1 || nc < 1 || nr > R_ || nc > C_) continue;
      const k = key(nr, nc); if (blocked.has(k) || seen.has(k)) continue;
      seen.add(k); q.push([nr, nc, d + 1]);
    }
  }
  return Infinity;
}
export function validatePath(setup, cells) {
  if (!Array.isArray(cells) || cells.length < 2) return EMPTY;
  const blocked = new Set((setup.blocked || []).map(([r, c]) => key(r, c)));
  if (!eq(cells[0], setup.start)) return R(false, 'start');
  if (!eq(cells[cells.length - 1], setup.end)) return R(false, 'end');
  const seen = new Set();
  for (let i = 0; i < cells.length; i++) {
    const [r, c] = cells[i]; const k = key(r, c);
    if (blocked.has(k)) return R(false, 'blocked');
    if (seen.has(k)) return R(false, 'repeat'); seen.add(k);
    if (i && Math.abs(r - cells[i - 1][0]) + Math.abs(c - cells[i - 1][1]) !== 1) return R(false, 'adjacent');
  }
  if (setup.metric === 'shortest' && cells.length - 1 !== shortestPathLength(setup)) return R(false, 'length');
  return R(true);
}

// ---------- weighted graph ----------
export function graphNodes(setup) {
  const s = new Set(); setup.edges.forEach(([a, b]) => { s.add(a); s.add(b); }); return [...s];
}
function edgeWeight(setup, a, b) {
  const e = setup.edges.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
  return e ? e[2] : null;
}
export function pathCost(setup, nodes) {
  let c = 0;
  for (let i = 1; i < nodes.length; i++) { const w = edgeWeight(setup, nodes[i - 1], nodes[i]); if (w == null) return null; c += w; }
  return c;
}
export function minimumCost(setup) {
  const nodes = graphNodes(setup); const dist = Object.fromEntries(nodes.map(n => [n, Infinity])); dist[setup.start] = 0;
  const done = new Set();
  while (done.size < nodes.length) {
    let u = null; for (const n of nodes) if (!done.has(n) && (u == null || dist[n] < dist[u])) u = n;
    if (dist[u] === Infinity) break; done.add(u);
    for (const [a, b, w] of setup.edges) {
      if (a === u && dist[u] + w < dist[b]) dist[b] = dist[u] + w;
      if (b === u && dist[u] + w < dist[a]) dist[a] = dist[u] + w;
    }
  }
  return dist[setup.end];
}
export function validateGraph(setup, nodes) {
  if (!Array.isArray(nodes) || nodes.length < 2) return EMPTY;
  if (nodes[0] !== setup.start) return R(false, 'start');
  if (nodes[nodes.length - 1] !== setup.end) return R(false, 'end');
  if (new Set(nodes).size !== nodes.length) return R(false, 'repeat');
  const cost = pathCost(setup, nodes);
  if (cost == null) return R(false, 'edge');
  if (setup.visitAll) return R(nodes.length === graphNodes(setup).length, 'visitAll');
  if (setup.metric === 'minimum') return R(cost === minimumCost(setup), 'cost');
  return R(true);
}

// ---------- mirrors ----------
const STEP = { N: [-1, 0], S: [1, 0], E: [0, 1], W: [0, -1] };
const SLASH = { E: 'N', N: 'E', W: 'S', S: 'W' };
const BACK = { E: 'S', S: 'E', W: 'N', N: 'W' };
export function traceBeam(setup, mirrors) {
  // mirrors: array aligned with setup.mirrorSlots, values '/', '\\' or null
  const [R_, C_] = setup.grid; const at = new Map();
  setup.mirrorSlots.forEach(([r, c], i) => mirrors[i] && at.set(key(r, c), mirrors[i]));
  let [r, c, d] = setup.source; const path = []; const seen = new Set();
  for (let guard = 0; guard < 400; guard++) {
    const m = at.get(key(r, c));
    if (m === '/') d = SLASH[d]; else if (m === '\\') d = BACK[d];
    const state = `${r},${c},${d}`;
    if (seen.has(state)) return { path, end: 'loop' };
    seen.add(state); path.push([r, c, d]);
    if (r === setup.receiver[0] && c === setup.receiver[1] && d === setup.receiver[2]) return { path, end: 'receiver' };
    r += STEP[d][0]; c += STEP[d][1];
    if (r < 1 || c < 1 || r > R_ || c > C_) return { path, end: 'edge' };
  }
  return { path, end: 'loop' };
}
export function validateMirror(setup, mirrors) {
  if (!Array.isArray(mirrors) || mirrors.length !== setup.mirrorSlots.length || mirrors.some(m => !m)) return EMPTY;
  const t = traceBeam(setup, mirrors);
  return R(t.end === 'receiver', t.end);
}

// ---------- toggles (XOR) ----------
export function toggleState(setup, pressed) {
  const s = [...setup.initial];
  for (const b of pressed) for (const i of setup.buttons[b]) s[i] ^= 1;
  return s;
}
export function validateToggle(setup, pressed) {
  if (!Array.isArray(pressed)) return EMPTY;
  return R(eq(toggleState(setup, pressed), setup.target));
}

// ---------- coordinates ----------
export function coordinateTarget(setup) {
  if (setup.moves) {
    let [r, c] = setup.start;
    for (const [d, n] of setup.moves) { r += STEP[d][0] * n; c += STEP[d][1] * n; }
    return [r, c];
  }
  if (setup.observations) {
    const o = setup.observations; const a = o[o.length - 2], b = o[o.length - 1];
    return [b[0] + (b[0] - a[0]), b[1] + (b[1] - a[1])];
  }
  return null;
}
export function validateCoordinate(setup, cell) {
  if (!Array.isArray(cell)) return EMPTY;
  return R(eq(cell, coordinateTarget(setup)));
}

// ---------- subset ----------
function subsets(items) {
  const out = [[]]; for (const it of items) { const n = out.length; for (let i = 0; i < n; i++) out.push([...out[i], it]); } return out;
}
export function validateSubset(setup, chosen) {
  if (!Array.isArray(chosen) || !chosen.length) return EMPTY;
  const names = Object.keys(setup.items); const w = n => setup.items[n];
  if (!chosen.every(c => names.includes(c)) || new Set(chosen).size !== chosen.length) return R(false, 'unknown');
  const req = setup.required || [];
  if (!req.every(r => chosen.includes(r))) return R(false, 'required');
  const total = sum(chosen.map(w));
  if ('target' in setup) return R(total === setup.target, 'target');
  if ('capacity' in setup && total > setup.capacity) return R(false, 'capacity');
  const feasible = subsets(names).filter(s => req.every(r => s.includes(r)) && sum(s.map(w)) <= setup.capacity);
  if (setup.maximizeCount) return R(chosen.length === Math.max(...feasible.map(s => s.length)), 'count');
  if (setup.maximize) return R(total === Math.max(...feasible.map(s => sum(s.map(w)))), 'max');
  return R(true);
}

// ---------- allocation ----------
export function validateAllocation(setup, values) {
  if (!Array.isArray(values) || values.length !== setup.slots.length || values.some(v => !Number.isInteger(v) || v < 0)) return EMPTY;
  const at = s => values[setup.slots.indexOf(s)];
  if (sum(values) !== setup.total) return R(false, 'total');
  for (const [s, v] of Object.entries(setup.fixed || {})) if (at(s) !== v) return R(false, 'fixed');
  if (setup.ratio) { const [a, b, k] = setup.ratio; if (at(a) !== k * at(b)) return R(false, 'ratio'); }
  return R(true);
}

// ---------- multiselect ----------
export function multiselectTarget(setup, answer) {
  if (setup.requiredFeatures) return Object.entries(setup.cards).filter(([, f]) => setup.requiredFeatures.every(x => f.includes(x))).map(([k]) => k);
  if (setup.records) return Object.entries(setup.records).filter(([, [p, q]]) => p <= setup.maxPressure && q >= setup.minSignal).map(([k]) => k);
  return answer;
}
export function validateMultiselect(setup, chosen, answer) {
  if (!Array.isArray(chosen) || !chosen.length) return EMPTY;
  return R(sameSet(chosen.map(String), multiselectTarget(setup, answer).map(String)));
}

// ---------- memory ----------
export function memoryTarget(setup, answer) {
  if (setup.after) return setup.sequence.findIndex((x, i) => x !== setup.after[i]) + 1;
  if (setup.recall === 'reverse') return [...setup.sequence].reverse();
  const m = /^last(\d+)$/.exec(setup.recall || '');
  if (m) return setup.sequence.slice(-Number(m[1]));
  return [...setup.sequence];
}
export function validateMemory(setup, response, answer) {
  const t = memoryTarget(setup, answer);
  if (typeof t === 'number') return response == null ? EMPTY : R(Number(response) === t);
  if (!Array.isArray(response) || response.length !== t.length || response.some(x => x == null)) return EMPTY;
  return R(eq(response, t));
}

// ---------- single ----------
export function validateSingle(setup, choice, answer) {
  if (choice == null) return EMPTY;
  return R(String(choice) === String(answer));
}

// ---------- dispatcher ----------
export function validate(puzzle, response) {
  const { type, setup, answer } = puzzle;
  switch (type) {
    case 'sequence': return validateSequence(setup, response, answer);
    case 'assignment': return validateAssignment(setup, response);
    case 'schedule': return setup.durations ? validateNumeric(setup, response, answer) : validateSequence(setup, response, answer);
    case 'numeric': return validateNumeric(setup, response, answer);
    case 'balance': return validateBalance(setup, response);
    case 'rotate': return validateRotate(setup, response);
    case 'path': return validatePath(setup, response);
    case 'graph': return validateGraph(setup, response);
    case 'mirror': return validateMirror(setup, response);
    case 'toggle': return validateToggle(setup, response);
    case 'coordinate': return validateCoordinate(setup, response);
    case 'subset': return validateSubset(setup, response);
    case 'allocation': return validateAllocation(setup, response);
    case 'multiselect': return validateMultiselect(setup, response, answer);
    case 'memory': return validateMemory(setup, response, answer);
    case 'single': return validateSingle(setup, response, answer);
    case 'choice-story': return response == null ? EMPTY : R(true, 'open');
    case 'freebuild': return R(true, 'open');
    default: throw new Error('Unknown puzzle type ' + type);
  }
}

// Answer in the response shape each widget produces (used by "show solution" and tests).
export function referenceResponse(puzzle) {
  const { type, setup, answer } = puzzle;
  if (type === 'assignment' && !setup.slots) return answer;
  if (type === 'toggle') return answer;
  if (type === 'balance') return answer;
  return answer;
}
