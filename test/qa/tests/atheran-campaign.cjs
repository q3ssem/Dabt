'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html', 'utf8');
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };

function balanced(source, at, open, close) {
  let depth = 0, quote = null, escaped = false;
  for (let i = at; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === open) depth++;
    else if (ch === close && --depth === 0) return source.slice(at, i + 1);
  }
  throw new Error(`unclosed ${open} at ${at}`);
}
function splitTopLevel(source) {
  const out = []; let start = 0, quote = null, escaped = false, round = 0, square = 0, curly = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') round++; else if (ch === ')') round--;
    else if (ch === '[') square++; else if (ch === ']') square--;
    else if (ch === '{') curly++; else if (ch === '}') curly--;
    else if (ch === ',' && round === 0 && square === 0 && curly === 0) { out.push(source.slice(start, i).trim()); start = i + 1; }
  }
  const last = source.slice(start).trim(); if (last) out.push(last);
  return out;
}
function extractFunction(marker) {
  const start = html.indexOf(marker);
  assert.ok(start >= 0, `function found: ${marker}`);
  const brace = html.indexOf('{', start);
  return html.slice(start, brace) + balanced(html, brace, '{', '}');
}

// 1) The campaign map has exactly 21 unique main stations: three entry trials and two per each of nine regions.
const astnAt = html.indexOf('const ASTN=');
const arrayAt = html.indexOf('[', astnAt);
const astnArray = balanced(html, arrayAt, '[', ']');
let entries = splitTopLevel(astnArray.slice(1, -1));
for (const m of html.matchAll(/ASTN\.push\(/g)) {
  const at = m.index + 'ASTN.push'.length;
  const call = balanced(html, at, '(', ')');
  entries.push(...splitTopLevel(call.slice(1, -1)));
}
const stations = entries.map((src, i) => {
  const id = src.match(/\bid:'([^']+)'/)?.[1];
  assert.ok(id, `station ${i + 1} has an id`);
  return { id, src };
});
eq(stations.length, 21, 'exactly 21 main campaign stations');
eq(new Set(stations.map(x => x.id)).size, 21, 'all main station IDs are unique');
for (const [i, st] of stations.entries()) {
  ok(/\bn:'[^']+'/.test(st.src), `${st.id} has a displayed name`);
  ok(/\bstory:'[^']+'/.test(st.src), `${st.id} has a story entry`);
  ok(/\bfx:\s*\{/.test(st.src), `${st.id} has a reward definition`);
  ok(html.includes(`{id:'${st.id}',maxLv:`), `${st.id} is backed by an actual puzzle engine`);
  if (i < 3) ok(!/\breg:\d+/.test(st.src), `${st.id} is an entry trial, not a region station`);
}
const regionCounts = Array(9).fill(0), traceAwards = [], atlasAwards = new Set();
for (const st of stations.slice(3)) {
  const reg = Number(st.src.match(/\breg:(\d+)/)?.[1]);
  ok(Number.isInteger(reg) && reg >= 0 && reg < 9, `${st.id} belongs to a valid region`);
  regionCounts[reg]++;
}
eq(regionCounts.length, 9, 'nine regions in the campaign');
for (let i = 0; i < 9; i++) eq(regionCounts[i], 2, `region ${i + 1} has exactly two main stations`);
for (const st of stations) {
  const tr = st.src.match(/\btr:\[([^\]]*)\]/)?.[1];
  if (tr) for (const n of tr.match(/\d+/g) || []) traceAwards.push(Number(n));
  const atlas = st.src.match(/\batlas:\{([^}]+)\}/)?.[1];
  if (atlas) for (const n of atlas.matchAll(/(?:^|,)(\d+):/g)) atlasAwards.add(Number(n[1]));
}
eq(new Set(traceAwards).size, 14, 'fourteen unique expedition traces are awarded');
eq(traceAwards.length, 14, 'each expedition trace is awarded exactly once');
for (let i = 0; i < 14; i++) ok(traceAwards.includes(i), `expedition trace ${i} is reachable`);
eq(atlasAwards.size, 9, 'main campaign reveals all nine geographic regions');
for (let i = 0; i < 9; i++) ok(atlasAwards.has(i), `geographic region ${i} has an unlock reward`);
eq(stations.at(-1).id, 'pz_aheart', 'the heart is the final main station');

// 2) Secret worlds: conditions must follow the story, not merely raw counters.
const swStart = html.indexOf('const ASW=');
const swAt = html.indexOf('[', swStart);
const swArray = balanced(html, swAt, '[', ']');
const swContext = { ATR: Array(14).fill(null), hour: 12, aHour: () => swContext.hour };
vm.createContext(swContext);
vm.runInContext(`const ASW=${swArray}; globalThis.__ASW=ASW; const aAllSecrets=a=>ASW.every(w=>(a.swd||{})[w.k]); globalThis.__allSecrets=aAllSecrets;`, swContext);
const worlds = swContext.__ASW;
eq(worlds.length, 5, 'five secret worlds are registered');
const byKey = Object.fromEntries(worlds.map(w => [w.k, w]));
let a = { done: {}, tr: [], perfect3: {}, sw: {}, swd: {} };
ok(!byKey.bones.cond(a), 'skeleton valley remains locked before the giant encounter');
a.done.pz_agiant = 1; ok(!!byKey.bones.cond(a), 'skeleton valley unlocks after the giant encounter');
ok(!byKey.spores.cond(a), 'spore garden remains locked before the living city');
a.done.pz_acity = 1; ok(!byKey.spores.cond(a), 'spore garden respects the night transition');
swContext.hour = 19; ok(!!byKey.spores.cond(a), 'spore garden unlocks at in-world night');
swContext.hour = 12; ok(!byKey.spores.cond(a), 'spore garden closes again outside night without the pass');
a.nightPass = 1; ok(!!byKey.spores.cond(a), 'night-pass button opens the garden without real-world waiting');
ok(!byKey.ship.cond({...a, done: { ...a.done, pz_aheart: 1 }, tr: Array(14).fill(0)}), 'ship cannot unlock from duplicate trace entries');
const allTraces = Array.from({ length: 14 }, (_, i) => i);
ok(!byKey.ship.cond({...a, tr: allTraces}), 'ship remains locked before the final heart');
ok(!!byKey.ship.cond({...a, done: { ...a.done, pz_aheart: 1 }, tr: allTraces}), 'ship unlocks after the heart and all fourteen unique traces');
ok(!byKey.lake.cond({...a, stars: { pz_asilent: 3 }}), 'legacy three-star record alone does not forge a flawless three-stage run');
ok(!!byKey.lake.cond({...a, perfect3: { pz_asilent: 1 }}), 'sky lake unlocks after three flawless silent-water stages');
const firstReady = {...a, swd: { bones: 1, spores: 1, ship: 1, lake: 1 }};
ok(!!byKey.first.cond(firstReady), 'first-origin world unlocks after the other four are solved');
ok(!byKey.first.cond({...firstReady, swd: { bones: 1, spores: 1, ship: 1 }}), 'first-origin world remains locked if one secret is merely missing');
ok(!swContext.__allSecrets(firstReady), 'final farewell stays locked until all five secret worlds are solved');
ok(swContext.__allSecrets({...firstReady, swd: {...firstReady.swd, first: 1}}), 'all-secret completion enables the final farewell');

// 3) Save migration: preserve finished progress, cap old stars to two, validate unique traces, and recompute contiguous path.
const aStateSrc = extractFunction('function aState(){');
const saved = { a5: { prog: 19, done: { [stations[0].id]: 1, [stations[1].id]: 1 }, stars: { pz_asilent: 3, damaged: -2 }, perfect3: { pz_asilent: 1 }, tr: [0, 0, 1, 13, 13, 99, -1] } };
const migrationContext = { txState: () => saved, ASTN: stations.map(x => ({ id: x.id })), ATR: Array(14).fill(null) };
vm.createContext(migrationContext);
vm.runInContext(aStateSrc, migrationContext);
const migrated = vm.runInContext('aState()', migrationContext);
eq(migrated.prog, 2, 'migration restores the longest contiguous completed-station path');
eq(migrated.stars.pz_asilent, 2, 'legacy station stars are capped because they were stage-local');
eq(migrated.stars.damaged, 0, 'negative legacy stars are sanitized');
eq(migrated.perfect3.pz_asilent, undefined, 'legacy local stars do not become perfect three-stage proof');
eq(migrated.tr.join(','), '0,1,13', 'trace migration removes duplicates and invalid indexes');
eq(migrated.campaignPathV4, 1, 'campaign path migration is recorded once');
migrated.perfect3.pz_asilent = 1; migrated.tr.push(2); vm.runInContext('aState()', migrationContext);
eq(migrated.perfect3.pz_asilent, 1, 'later reads do not clear newly earned perfection');
eq(migrated.tr.join(','), '0,1,13,2', 'subsequent reads preserve newly earned unique traces');

// 4) Run the real stage gate and Atheran win function against a 21-station mock journey.
const hubSrc = extractFunction('function hubStage(id){');
const gateSrc = extractFunction('function stageGate(orig){');
const winSrc = extractFunction('function aWin(api,id,msg){');
function makeCampaignContext(ids) {
  const campaign = { prog: 0, done: {}, atlas: {}, logs: [], stars: {}, perfect3: {} };
  const context = {
    Z3: [], PW: [], ASTN: ids.map(id => ({ id, fx: {} })),
    zState: () => ({}), pState: () => ({}), aState: () => campaign,
    pzMax: () => 8, XAR: v => String(v),
    S: { st: { stg: {}, stgQ: {}, stgR: {}, stgRQ: {} }, saves: 0, save() { this.saves++; } },
    TX_IDS: [], txStageOf: () => null,
  };
  vm.createContext(context);
  vm.runInContext(`${winSrc}\n${hubSrc}\n${gateSrc}`, context);
  return { context, campaign, S: context.S, gate: context.stageGate(context.aWin), hub: context.hubStage };
}
const route = makeCampaignContext(stations.map(x => x.id));
for (let i = 0; i < stations.length; i++) {
  const id = stations[i].id;
  for (let stage = 1; stage <= 3; stage++) {
    const info = route.hub(id);
    eq(info.k, stage, `${id} enters stage ${stage} in sequence`);
    eq(info.lv, [2, 5, 8][stage - 1], `${id} selects its calibrated difficulty for stage ${stage}`);
    const api = { hints: 0, wrongs: 0, wins: [], win(msg) { this.wins.push(msg); } };
    route.gate(api, id);
    ok(api.wins.length === 1, `${id} stage ${stage} completes through the stage gate`);
    if (stage < 3) {
      ok(!route.campaign.done[id], `${id} does not unlock before its third stage`);
      eq(route.campaign.prog, i, `${id} leaves campaign position unchanged before final stage`);
    }
  }
  ok(route.campaign.done[id], `${id} is marked complete after stage three`);
  eq(route.campaign.prog, i + 1, `${id} advances the main campaign by one station`);
  eq(route.campaign.stars[id], 3, `${id} earns three stars only for a flawless three-stage run`);
  ok(route.hub(id) === null, `${id} is not offered as a new main stage after completion`);
  if (i < stations.length - 1) eq(route.hub(stations[i + 1].id).k, 1, 'next station opens only after the current station fully completes');
}
eq(route.campaign.prog, 21, 'all 21 main stations advance in order to the heart');
eq(Object.keys(route.campaign.done).length, 21, 'all 21 station completions are retained');

// Aggregate scoring across stages: a hint and a wrong answer in separate stages both affect the final stars.
const mixed = makeCampaignContext(['pz_asilent']);
for (const [stage, hints, wrongs] of [[1, 1, 0], [2, 0, 1], [3, 0, 0]]) {
  mixed.gate({ hints, wrongs, win() {} }, 'pz_asilent');
  if (stage < 3) eq(mixed.campaign.done.pz_asilent, undefined, `mixed run waits for stage ${stage + 1}`);
}
eq(mixed.campaign.stars.pz_asilent, 1, 'aggregate star score counts hints and errors across all three stages');
eq(mixed.campaign.perfect3.pz_asilent, undefined, 'flawless-water proof is not granted when any stage used a hint or had an error');
eq(mixed.S.st.stgQ.pz_asilent, undefined, 'main stage aggregate is cleared after station completion');
eq(mixed.S.st.stg.pz_asilent, undefined, 'main stage pointer is cleared after station completion');

// A clean replay can earn the perfect mark, but a later weaker replay cannot downgrade the saved best stars.
const replay = makeCampaignContext(['pz_asilent']);
replay.campaign.done.pz_asilent = 1; replay.campaign.prog = 1; replay.campaign.stars.pz_asilent = 3;
let replayStage = 0;
replay.context.txStageOf = () => ({ k: replayStage + 1, lv: [2, 5, 8][replayStage], replay: true });
const replayGate = replay.context.stageGate(replay.context.aWin);
for (let stage = 0; stage < 3; stage++) {
  replayStage = stage;
  replayGate({ hints: 0, wrongs: 0, win() {} }, 'pz_asilent');
  if (stage < 2) replay.S.st.stgR.pz_asilent = stage + 1;
}
eq(replay.campaign.perfect3.pz_asilent, 1, 'three flawless replay stages earn the secret unlock proof');
eq(replay.campaign.stars.pz_asilent, 3, 'flawless replay preserves a three-star best record');
eq(replay.S.st.stgRQ.pz_asilent, undefined, 'replay stage aggregate is cleared after stage three');
replayStage = 0;
for (let stage = 0; stage < 3; stage++) {
  replayStage = stage;
  replayGate({ hints: stage === 0 ? 1 : 0, wrongs: 0, win() {} }, 'pz_asilent');
  if (stage < 2) replay.S.st.stgR.pz_asilent = stage + 1;
}
eq(replay.campaign.stars.pz_asilent, 3, 'a weaker replay cannot downgrade the previous star record');
eq(replay.campaign.perfect3.pz_asilent, 1, 'a weaker replay cannot erase an already earned perfect proof');

// 5) Endings and visible campaign ledger are connected to the actual final station and secret completion.
ok(html.includes("if(id==='pz_aheart')"), 'the heart completion schedules the main finale');
ok(html.includes('if(a.fin){h=h.replace'), 'the post-ending return panel appears only after the main finale');
ok(html.includes("aAllSecrets(a)?'<button class=\"xvault\" id=\"afare\">وداع أخير</button>'"), 'the final farewell button is conditional on all secret worlds');
ok(html.includes('const panel=`<section class="acampaign"'), 'atlas campaign ledger is rendered');
ok(html.includes('aria-valuenow="${done}"'), 'campaign completion is exposed as an accessible progress value');
ok(html.includes('العوالم المكتشفة'), 'campaign ledger names discovered secret worlds');
ok(html.includes('العوالم المكتملة'), 'campaign ledger names completed secret worlds');
ok(html.includes('نجمة للإكمال، ونجمة بلا تلميح، ونجمة بلا خطأ'), 'campaign ledger explains the three-star criteria');
ok(html.includes('a.perfect3[id]=1'), 'flawless proof is granted only after aggregated stage counters are zero');
ok(html.includes("const n=ASW.filter(W=>!!a.sw[W.k]||!!W.cond(a)).length"), 'secret counter includes eligible but not yet opened worlds');
ok(html.includes('Math.max(0,Number((S.st.stgR||{})[id])||0)%3'), 'replay stage index wraps safely');

console.log(JSON.stringify({ status: 'passed', checks, mainStations: stations.length, regions: regionCounts.length, expeditionTraces: 14, secretWorlds: worlds.length, simulatedMainStages: 63, replayStages: 6, scoreAggregation: 'cross-stage', campaignMigration: 'V4', visualBrowserTest: false }, null, 2));
