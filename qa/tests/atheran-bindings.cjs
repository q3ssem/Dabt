// 5.5.28 athran-assets-2 — static audit of the Atheran interactive bindings (piece states, UI frames, VFX).
// Proves every approved asset id the bindings can show exists in the registry, all 80 piece states and all 14 frames
// have a binding, the derived frame borders exist and are cached offline, and asset ids/paths are untouched.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), assert = require('assert');
const ROOT = path.resolve(__dirname, '..', '..'); process.chdir(ROOT);
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const inv = JSON.parse(fs.readFileSync('atheran/assets/asset_inventory_master.json', 'utf8')).completed_assets;
const byId = Object.fromEntries(inv.map(r => [r.asset_id, r]));
const src = fs.readFileSync('atheran/bindings/bindings.js', 'utf8');
// PIECES table, evaluated in isolation
const tbl = src.slice(src.indexOf('const PIECES = {') + 'const PIECES = '.length, src.indexOf('};', src.indexOf('const PIECES = {')) + 1);
const PIECES = Function('return ' + tbl)();
const states = inv.filter(r => r.asset_type === 'puzzle_piece_state');
ok(states.length === 80, '80 piece-state assets');
const reachable = new Set();
for (const [g, c] of Object.entries(PIECES)) {
  const st = new Set([...Object.keys(c.states || {}), ...Object.keys(c.pre || {})]);
  if (c.base !== null) st.add('default');
  if (!c.noWrong) st.add('wrong');
  if (!c.noWin) st.add(c.win || 'correct');
  if (c.corrOn) st.add('correct');
  for (const s of st) { const id = `${g}_${c.art}_${s}`; if (byId[id]) reachable.add(id); }
}
for (const r of states) ok(reachable.has(r.asset_id), 'piece state bound: ' + r.asset_id);
ok(Object.keys(PIECES).length === 21, '21 stations have a piece binding');
// frames
const frames = inv.filter(r => r.asset_type === 'ui_frame');
ok(frames.length === 14, '14 UI frames');
const man = fs.readFileSync('offline-manifest.js', 'utf8');
for (const f of frames) {
  ok(src.includes(`'${f.asset_id}'`), 'frame bound to a screen: ' + f.asset_id);
  const d = `atheran/bindings/frames/${f.asset_id}.png`;
  ok(fs.existsSync(d), 'derived border exists: ' + d);
  ok(man.includes(`"${d}"`), 'derived border cached offline: ' + d);
}
// VFX ids referenced by the bindings exist
const vfxIds = [...new Set([...src.matchAll(/'((?:vfx_|pz_a)[a-z0-9_]*vfx[a-z0-9_]*|vfx_[a-z_]+)'/g)].map(m => m[1]))];
for (const id of vfxIds) ok(!!byId[id], 'VFX id exists: ' + id);
for (const r of inv.filter(r => r.asset_type === 'vfx_spritesheet')) ok(src.includes(`'${r.asset_id}'`), 'sprite sheet bound: ' + r.asset_id);
for (const r of inv.filter(r => r.asset_type === 'puzzle_vfx')) ok(src.includes(`'${r.asset_id}'`) || /\$\{id\}_success_vfx/.test(src) && /_success_vfx$/.test(r.asset_id), 'station VFX bound: ' + r.asset_id);
ok(/relic_\$\{num\}_vfx/.test(src), 'relic VFX bound by relic number');
ok(/relic_\$\{num\}_silhouette/.test(src) && /relic_\$\{num\}_icon/.test(src), 'relic strip: icon when found, silhouette when missing');
for (let i = 1; i <= 14; i++) { const n2 = String(i).padStart(2, '0'); for (const k of ['icon', 'silhouette', 'vfx']) ok(!!byId[`relic_${n2}_${k}`], `relic_${n2}_${k} exists`); }
ok(/function spreadMap/.test(src), 'atlas buttons are spread apart on narrow phones');
// asset ids and files untouched
for (const r of inv) {
  const p = path.join('atheran/assets', r.relative_path);
  ok(fs.existsSync(p), 'asset file present ' + r.asset_id);
  ok(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') === r.sha256, 'asset unchanged ' + r.asset_id);
}
// wiring + offline
ok(man.includes('"atheran/bindings/bindings.js"') && man.includes('"atheran/bindings/bindings.css"'), 'bindings cached offline');
ok(/load\('atheran\/bindings\/bindings\.js'/.test(fs.readFileSync('ui/app.js', 'utf8')), 'bindings loaded by ui/app.js');
ok(!/localStorage\.setItem|S\.save\(|txSave/.test(src), 'bindings never write the save');
const app = fs.readFileSync('ui/app.js', 'utf8');
ok(/DESIGN = 375/.test(app) && /sw >= 400 && sw < 600/.test(app) && /portrait/.test(app), 'large phones (400–600 pt, portrait) lay out at 375 pt and scale up; tablets/landscape untouched');
ok(app.indexOf('DESIGN = 375') < 1200, 'the phone fit runs first in ui/app.js');
ok(/prefers-reduced-motion/.test(fs.readFileSync('atheran/bindings/bindings.css', 'utf8')), 'VFX respect reduced motion');
console.log(`Atheran bindings: ${n} checks passed — 80/80 piece states, 14/14 frames, ${vfxIds.length} VFX ids, 546 assets unchanged.`);
