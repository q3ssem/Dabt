'use strict';
/* 5.5.28 — Atheran phase 2: official campaign cover, heroines, secret worlds hidden until found, light boards,
   progress from the library, hint wording, expedition map/tap/contrast. Source + simulated-DOM checks; the real
   browser run is qa/browser/atheran_campaign.py. */
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const read = f => fs.readFileSync(f, 'utf8');
let n = 0; const ok = (v, m) => { assert.ok(v, m); n++; };
const html = read('index.html'), pkg = JSON.parse(read('package.json')), sw = read('sw.js'), man = read('offline-manifest.js');

// release + offline
ok(pkg.version === '5.5.30', 'package 5.5.28');
ok(sw.includes("const VERSION='5.5.30'"), 'service worker cache 5.5.28');
['atheran/campaign/story.js', 'atheran/campaign/campaign.js', 'atheran/campaign/campaign.css'].forEach(f => { ok(fs.existsSync(f), f + ' exists'); ok(man.includes(`"${f}"`), f + ' cached offline'); });
const ui = read('ui/app.js');
const campaignScripts = [...(ui.match(/const scripts = \[([\s\S]*?)\];/)?.[1] || '').matchAll(/'([^']+)'/g)].map(match => match[1]);
const storyIndex = campaignScripts.indexOf('atheran/campaign/story.js');
const coverIndex = campaignScripts.indexOf('atheran/campaign/campaign.js');
ok(storyIndex >= 0 && coverIndex > storyIndex, 'story loads before the campaign cover');
ok(coverIndex >= 0 && campaignScripts.indexOf('atheran/bindings/bindings.js') > coverIndex, 'bindings load after the campaign cover');
ok(ui.indexOf('script.async = false') < ui.indexOf('document.body.append(script);') &&
   ui.includes('script.async = false'), 'dynamically inserted scripts retain execution order');
ok(ui.indexOf('5.5.2-mini') < ui.indexOf('5.5.28-atheran'), 'cover loads after the library layer');

// identifiers and saves untouched
const ids = [...html.matchAll(/\{id:'(pz_a[a-z]+)',n:'/g)].map(m => m[1]);
['pz_aarch', 'pz_aport', 'pz_alight', 'pz_acur', 'pz_ashell', 'pz_aroot', 'pz_aring', 'pz_ashade', 'pz_aswarm', 'pz_aecho', 'pz_avsong', 'pz_agiant', 'pz_aherd', 'pz_abridge', 'pz_asilent', 'pz_alayer', 'pz_acity', 'pz_asong', 'pz_aflow', 'pz_arelic', 'pz_aheart']
  .forEach(id => ok(html.includes(`id:'${id}'`), 'station id kept: ' + id));
['pz_wbone', 'pz_wspore', 'pz_wlog', 'pz_wlake', 'pz_wfirst'].forEach(id => ok(html.includes(`id:'${id}'`), 'secret id kept: ' + id));
ok(html.includes("'miran:v2'") || html.includes('"miran:v2"') || html.includes('miran:v2'), 'save key miran:v2 present');
ok(read('expedition10/app.js').includes("const SAVE_KEY='mindlab:expedition10:v1'"), 'expedition save key unchanged');
ok(html.includes('const aOpen=()=>{const p=txState().a4;return!!p&&p.prog>=PW.length}'), 'aOpen unlock rule unchanged');
const camp = read('atheran/campaign/campaign.js');
ok(!/localStorage\.(setItem|removeItem)|S\.st\.tx\s*=|delete /.test(camp), 'cover never writes or deletes saves directly');
ok(/if \(p > \(a\.prog \|\| 0\)\) a\.prog = p/.test(camp), 'progress only moves forward (contiguous done count)');

// story layer: every station has heroine lines; locals stay; run it against stubs
const story = read('atheran/campaign/story.js');
const ASTN = ids.map(id => ({ id, sc: [['navigator', 'old']] }));
const ctx = { ASTN, XS_: {}, ACH: { mapgirl: 'x', shipwright: 'y', navigator: 'z' }, window: {}, aFinalePanels: () => [{ t: 'العودة الأخيرة', txt: ['old'] }, { t: 'الصفحة الأخيرة', txt: ['old'] }, { t: 'الأفق الذي لا ينتهي', txt: ['old'] }, { t: 'القرية التي انتظرت', txt: ['keep'] }] };
vm.createContext(ctx); vm.runInContext(story, ctx);
ok(ASTN.length === 21, '21 stations parsed');
ASTN.forEach(s => {
  ok(s.sc.some(([c]) => ['roaa', 'noha', 'ward'].includes(c)), `${s.id}: a heroine speaks`);
  s.sc.forEach(([c, t]) => ok(['roaa', 'noha', 'ward', 'mapgirl', 'shipwright', 'navigator'].includes(c) && t.length > 4, `${s.id}: known speaker with text`));
});
ok(['roaa', 'noha', 'ward'].every(k => ctx.XS_[k] && ctx.XS_[k].includes(`poses/${k}-`)), 'heroine portraits use the approved pose art');
ok(ctx.ACH.mapgirl.includes('أَثْرَان') && ctx.ACH.navigator.includes('أَثْرَان') && ctx.ACH.shipwright.includes('أَثْرَان'), 'Layan, Badr and Nawwar are people of Atheran');
const fin = ctx.aFinalePanels();
ok(fin.find(p => p.t === 'القرية التي انتظرت').txt[0] === 'keep', 'untouched finale panel kept');
const finText = fin.map(p => p.txt.join(' ')).join(' ');
ok(['رواء', 'نهى', 'ورد'].every(x => finText.includes(x)), 'finale names the three heroines');
ok(!/"نوّار".*?بقي|وقف عند المؤخرة/.test(finText), 'Nawwar stays in Atheran (no longer sails away)');

// library: secrets hidden until discovered, aflow + pobs back
const mini = read('ui/mini.js');
ok(mini.includes("const HIDDEN = new Set(['pz_zstars']);"), 'only pz_zstars stays hidden');
ok(mini.includes('!HIDDEN.has(g.id) && secretFound(g.id)'), 'secret worlds filtered until found');
const sf = new Function('S', mini.match(/const SECRET = [^;]+;/)[0] + mini.match(/const secretFound = [^\n]+/)[0] + 'return secretFound;');
ok(sf({ st: {} })('pz_wbone') === false, 'fresh profile: secret hidden');
ok(sf({ st: { tx: { a5: { sw: { bones: 1 } } } } })('pz_wbone') === true, 'discovered secret shown');
ok(sf({ st: {} })('pz_aflow') === true, 'regular station always shown');
const css = read('atheran/campaign/campaign.css');
ok(css.includes('svg.aflg rect[fill="#14303E"]{fill:#E4F0EE}'), 'pz_aflow board is light');
ok(css.includes('svg#pos rect[fill="#1E2A44"]{fill:#EEF3F8}'), 'pz_pobs board is light');

// hints: audited, scoped patches
const pat = JSON.parse(read('qa/allowed_atheran_engine_changes.json')).patches.filter(p => p.reason.startsWith('5.5.28'));
ok(pat.length === 6, 'six audited 5.5.28 hint patches');
pat.forEach(p => ok(html.split(p.after).length - 1 === 1 && (p.after.includes(p.before) || !html.includes(p.before)), 'hint patch applied once: ' + p.reason.slice(0, 50)));
ok(!html.includes('بـ${XAR(i)} خطوة') && !html.includes('تبقى ${XAR(best.c)} خانات'), 'broken number phrases gone');

// Side journey: retire world-map navigation, preserve usable station folders and actual playable map puzzle.
const exc = read('expedition10/style.css'), exa = read('expedition10/app.js');
ok(exa.includes('function openStations()') && exa.includes("mindlabJourneyHub?.openChapters?.('side')"), 'side journey returns through chapter folders');
ok(!exa.includes('function renderMap()') && !exc.includes('expedition10/art/world-map.webp'), 'retired navigation atlas absent');
ok((exa.match(/id:'ml10_\d{2}'/g)||[]).length===24, 'exactly 24 active side-stage IDs persist');
ok(exa.includes('data-ex10="stations2"') && exa.includes('function gameMap(i)'), 'station navigation and playable map puzzle survive');

ok(!fs.readdirSync('expedition10/art/crew/poses').some(f => f.endsWith('.png')), 'unused PNG poses removed');
ok(fs.readdirSync('expedition10/art/crew/poses').filter(f => f.endsWith('.webp')).length === 15, 'all 15 WebP poses kept');
ok(!exa.includes('الفصل الأول ·') && exa.includes('رحلة جانبية'), 'expedition labelled as a side journey');
console.log(`Atheran phase 2: ${n} checks passed.`);
