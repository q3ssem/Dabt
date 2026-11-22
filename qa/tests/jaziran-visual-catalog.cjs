'use strict';
// Jaziran PDF cards pp.9–32 are the sole source for 86 active puzzle identity colors.
// This audit tests metadata/assets/styles, not gameplay success or sound perception.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=JSON.parse(fs.readFileSync('docs/JAZIRAN_PUZZLE_INDEX_2026-11-22.json','utf8'));
const inventory=JSON.parse(fs.readFileSync('legacy/inventory.json','utf8'));
const designs=fs.readFileSync('ui/puzzle-designs-data.js','utf8');
const accents=fs.readFileSync('ui/jaziran-puzzle-accents.css','utf8');
const board=fs.readFileSync('ds/board-polish.css','utf8');
const fit=fs.readFileSync('ui/fit.js','utf8');
const loader=fs.readFileSync('ui/app.js','utf8');
const manifest=fs.readFileSync('offline-manifest.js','utf8');
const active=source.sections.flatMap(s=>s.entries).filter(x=>x.status==='active');
assert.equal(active.length,86);
assert.equal(inventory.puzzles.length,86);
assert.equal(new Set(active.map(x=>x.proposed_color.toUpperCase())).size,86,'all 86 puzzle palette entries distinct');
const designsIds=[...designs.matchAll(/^\s{2}(pz_[a-z0-9]+):\s*\{/gm)].map(x=>x[1]);
assert.equal(designsIds.length,86,'all puzzle IDs have design entries');
assert.deepEqual([...designsIds].sort(),inventory.puzzles.map(x=>x.id).sort());
assert.deepEqual([...new Set(designsIds)].sort(),designsIds.slice().sort(),'no duplicate design IDs');
const colorDefs=[...accents.matchAll(/html #play\[data-la-game="(pz_[a-z0-9]+)"\] \{ --mlj-puzzle-accent: (#[0-9A-F]{6}); \} \/\* PDF p\.(\d+) \*\//g)];
assert.equal(colorDefs.length,86,'one CSS accent per puzzle');
assert.equal(new Set(colorDefs.map(x=>x[1])).size,86,'no repeated color declarations');
for(const entry of active){
  const rule=colorDefs.find(x=>x[1]===entry.id);
  assert(rule,'missing puzzle accent: '+entry.id);
  assert.equal(rule[2],entry.proposed_color.toUpperCase(),'PDF accent mismatch: '+entry.id);
  assert.equal(Number(rule[3]),entry.source_page,'PDF page mismatch: '+entry.id);
}
for(const retired of ['pz_stat','pz_xbottle']){
  assert(!colorDefs.some(x=>x[1]===retired),'retired game color illegally restored: '+retired);
}
const paths=[...designs.matchAll(/"(?:scene|piece)":\s*"([^"]+)"/g)].map(x=>x[1]);
assert.equal(paths.length,168,'all named scene/piece references audited');
for(const path of paths){
  assert(fs.existsSync(path),'missing puzzle art: '+path);
  assert(path.endsWith('.webp')||path.endsWith('.png'),'puzzle art must be an image: '+path);
  assert(!path.endsWith('.svg'),'no vector characters');
}
assert(loader.includes("'ds/board-polish.css', 'ui/jaziran-puzzle-accents.css'"),'palette loaded after shared board theme');
assert(manifest.includes('"ui/jaziran-puzzle-accents.css"'),'palette available offline');
assert(accents.includes('border-block-start: 3px solid'),'palette is confined to title rim');
assert(accents.includes('html[data-skin="dark"]'),'dark mode has adjusted decorative accent');
assert(accents.includes('html[data-skin="auto"]'),'system dark mode has adjusted accent');
assert(!accents.includes('#pzb'),'never globally recolor puzzle board');
assert(!accents.includes('#stage'),'never globally recolor game board contents');
assert(board.includes('object-fit:contain'),'art remains unstretched');
assert(fit.includes('const MIN_ZOOM = 0.58'),'fit UI remains live');
const audio=fs.readFileSync('audio/mindlab-audio.js','utf8');
const idsMatch=audio.match(/const puzzleIdentityIds = (\[[^\n]+\]);/);
assert(idsMatch,'distinct fallback sound signature table must be present');
const ordered=JSON.parse(idsMatch[1]);
assert.deepEqual(ordered,active.map(x=>x.id),'per-puzzle sound identity follows the live source index');
const notes=ordered.map((id,i)=>320+((i*37)%89)*13);
assert.equal(new Set(notes).size,86,'86 unique sound identities without a frequency collision');
assert(audio.includes("sfx.puzzleIdentity?.(id)")&&audio.includes("if (lastSound >= at - 5 || S.st.mute || document.hidden) return;"),
  'the sound signature is only played for otherwise silent taps, never muted or idle');
assert(audio.includes("if (index === undefined || !ready()) return false;"),
  'retired or unknown puzzles and suspended audio contexts stay silent');
console.log('JAZIRAN_VISUAL_AUDIO_CATALOG=passed: 86 colors, 168 painted assets, 86 unique subtle silent-tap signatures, no global recolors.');
