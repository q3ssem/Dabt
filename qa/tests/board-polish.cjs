'use strict';
// Do not couple visual polish to a specific puzzle engine or player-save format.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const style = fs.readFileSync('ds/board-polish.css', 'utf8');
const app = fs.readFileSync('ui/app.js', 'utf8');
const offline = fs.readFileSync('offline-manifest.js', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');

for (const fragment of [
  'html[data-skin="light"] #play',
  'html[data-skin="dark"] #play',
  'html[data-skin="auto"] #play',
  '--bp-teal:', '--bp-gold:', '--bp-azure:', '--bp-violet:',
  '--bp-red:', '--bp-green:',
  'font-family:', "'Tajawal'", "'Aref Ruqaa'",
  '.pbar .x', '.pzhud .pzhb', '.fit-tools .pzgive',
  '.ml-authored-levels button', '.fit-sheet-card',
  '.t7', '.ex10', ':focus-visible', 'object-fit:contain',
  'prefers-reduced-motion'
]) assert.ok(style.includes(fragment), 'Visual board layer missing '+fragment);

assert.ok(app.includes("'ui/fullscreen-puzzles.css', 'ds/board-polish.css'"), 'Board style should follow all other puzzle layers');
assert.ok(offline.includes('self.MINDLAB_OFFLINE_FILES.push("ds/board-polish.css", "ui/jaziran-puzzle-accents.css")'), 'Board polish and per-game accents must be available offline');
assert.ok(sw.includes("PATCH='brain-touch-31'"), 'Update PWA cache identity when visual assets change');
assert.ok(!/#[a-zA-Z0-9_-]*board\s*\*\s*\{/.test(style), 'Never blindly recolor game pieces');
assert.ok(!/\#pzb\s*\*\s*\{/.test(style), 'Never change all puzzle content at once');

for (const token of ['#pk.peek', '#xp.xnav', '#xn.xnav', 'min-height: 44px !important']) {
  assert.ok(style.includes(token),'Measured brain-game touch target guard missing '+token);
}
const brainAudit = fs.readFileSync('qa/browser/brain_game_board_audit.py','utf8');
assert.ok(brainAudit.includes('criticalControls') && brainAudit.includes('labelled_control_below_44px'),
  'Browser acceptance must measure post-layout brain-game touch geometry');

for (const token of ['.xkb {', 'repeat(6, minmax(0, 1fr))', '.pkeys .pkey', '.dx-board:has(#dxSum) .dx-row .dx-tile']) {
  assert.ok(style.includes(token),'Dense brain input mobile display rule missing '+token);
}
assert.ok(brainAudit.includes('dense_input_target_below_44px'),
  'Phone audit must reject undersized crossword, piano and balance controls');
const index=fs.readFileSync('index.html','utf8');
assert.ok(index.includes('aria-label="اعزف نغمة ${PNAME[i]}"'),
  'Piano note needs a spoken Arabic name');
assert.ok(index.includes("b.onclick=()=>press(i,b)"),
  'Piano notes must be reachable by keyboard and screen-reader activation');

const fitCSS = fs.readFileSync('ui/fit.css','utf8');
for (const id of ['pz_rid','pz_scale','pz_tpath','pz_ybell','pz_plock','pz_aarch']) {
  assert.ok(fitCSS.includes('[data-la-game="'+id+'"]'),
    'Missing small-screen WebKit clipping guard for '+id);
}
assert.ok(fitCSS.includes('max-height: calc(100dvh - 168px)') &&
  fitCSS.includes('overflow-y: auto !important'),
  'The six small-screen WebKit boards must scroll internally if fit becomes stale');

assert.ok(fitCSS.includes('.pl-range i.ref{width:20px;height:20px;flex:0 0 20px;overflow:hidden') &&
  fitCSS.includes('.pl-range i.ref img{display:block;width:18px!important;height:18px!important;max-width:18px!important'),
  'Palace reference badge art must have an absolute 18px visual footprint instead of percentage sizing');

const fitUI = fs.readFileSync('ui/fit.js','utf8');
assert.ok(fitUI.includes("for (const el of $$('#play .pin, #play .pbar, #stage .pzhud, #stage #m')"),
  'Puzzle fitting must iterate all viewport-height observer targets in mobile WebKit');
assert.ok(fitUI.includes('viewportProbe = setInterval') && fitUI.includes('if (viewportProbe) { clearInterval(viewportProbe);'),
  'WebKit viewport fallback must be created and disposed per puzzle');

const faces = fs.readFileSync('fonts/fonts.css','utf8');
assert.ok(faces.includes("font-family: 'Tajawal'"),'Hosted Arabic text font must remain');
assert.ok(faces.includes("font-family: 'Aref Ruqaa'"),'Hosted historical title font must remain');

console.log('BOARD_POLISH_STATIC=passed');
