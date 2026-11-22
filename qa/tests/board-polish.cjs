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
assert.ok(offline.includes('self.MINDLAB_OFFLINE_FILES.push("ds/board-polish.css")'), 'Board polish must be available through optional offline preparation');
assert.ok(sw.includes("PATCH='board-polish-19'"), 'Update PWA cache identity when visual assets change');
assert.ok(!/#[a-zA-Z0-9_-]*board\s*\*\s*\{/.test(style), 'Never blindly recolor game pieces');
assert.ok(!/\#pzb\s*\*\s*\{/.test(style), 'Never change all puzzle content at once');

const faces = fs.readFileSync('fonts/fonts.css','utf8');
assert.ok(faces.includes("font-family: 'Tajawal'"),'Hosted Arabic text font must remain');
assert.ok(faces.includes("font-family: 'Aref Ruqaa'"),'Hosted historical title font must remain');

console.log('BOARD_POLISH_STATIC=passed');
