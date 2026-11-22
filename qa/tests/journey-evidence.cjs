'use strict';
// Evidence notebook is an isolated user draft: completion flags and campaign rewards remain engine-owned.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const src = fs.readFileSync('ui/journey-hub.js', 'utf8');
const css = fs.readFileSync('ui/journey-hub.css', 'utf8');
const state = new Map([
  ['treasureV3', '{"done":{"sea7_0":true}}'],
  ['atheranCampaign', '{"done":{"pz_aarch":true}}'],
  ['mindlab:transitions:seen:v1', '{"departure":true}']
]);
const storage = {
  getItem(k) { return state.get(k) ?? null; },
  setItem(k, v) { state.set(k, String(v)); }
};
const nativePalace = {done:{}};
const nativeAtheran = {done:{},sw:{},swd:{}};
const window = {T7:{state:()=>({done:{}}),data:{stations:[]}},
  ATHERAN_CAMPAIGN:{summary:()=>({a:nativeAtheran})}};
const document = {readyState:'loading',addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
vm.runInNewContext(src,{window,T7:window.T7,document,localStorage:storage,pState:()=>nativePalace,showIntro(){},closePlay(){},console});
const api=window.mindlabJourneyHub;
assert.equal(typeof api.openEvidenceBook,'function');
assert.equal(api.getEvidenceDraft('measurement'),'');
assert.equal(api.saveEvidenceDraft('measurement','  شاهدت أثرًا بجوار المرسى  '),true);
assert.equal(api.getEvidenceDraft('measurement'),'شاهدت أثرًا بجوار المرسى');
assert.equal(api.saveEvidenceDraft('testimony','زمن الحارس لا يطابق زمن المرصد'),true);
assert.equal(api.getEvidenceDraft('testimony'),'زمن الحارس لا يطابق زمن المرصد');
assert.equal(api.getEvidenceDraft('traces'),'');
const notesKey='mindlab:journey:evidence-notes:v1';
assert.deepEqual(Object.keys(JSON.parse(state.get(notesKey))).sort(),['measurement','testimony']);
assert.equal(api.saveEvidenceDraft('measurement','x'.repeat(650)),true);
assert.equal(api.getEvidenceDraft('measurement').length,600,'draft length is capped');
assert.equal(api.saveEvidenceDraft('invalid','fake'),false);
assert.equal(api.saveEvidenceDraft('traces',42),false);
assert.equal(api.saveEvidenceDraft('testimony','   '),true,'an empty draft deletes only its own entry');
assert.equal(api.getEvidenceDraft('testimony'),'');
assert.equal(JSON.parse(state.get('treasureV3')).done.sea7_0,true,'official save untouched');
assert.equal(JSON.parse(state.get('atheranCampaign')).done.pz_aarch,true,'Atheran save untouched');
assert.equal(JSON.parse(state.get('mindlab:transitions:seen:v1')).departure,true,'transition save untouched');
assert(src.includes('id="mlj-open-evidence"'),'legacy map exposes notebook');
assert(src.includes('ملفات الأدلة والملاحظات'),'V3 map exposes notebook without crowding footer');
assert(src.includes('دفتر الأدلة') && src.includes('القياس والاتجاه') && src.includes('الساعة والشهادة') && src.includes('العمر والأثر'),'three authored files');
assert(src.includes('btn.setAttribute') && src.includes("'aria-pressed'"),'tab state is announced');
assert(src.includes("modal.setAttribute('aria-modal', 'true')") && src.includes("e.key === 'Escape'"),'dialog keyboard controls');
assert(css.includes('/* Jaziran evidence notebook:') && css.includes('html[data-skin="dark"] .mlj-evidence-card textarea'),'theme support');
state.set(notesKey,'{broken');
assert.equal(api.getEvidenceDraft('measurement'),'','corrupt drafts do not interfere with campaign save');
assert.equal(api.saveEvidenceDraft('measurement','تعافي'),true,'bad notebook draft can be safely replaced');
// Game completion is read only from the campaign's native state, not notebook text.
assert.equal(api.getEvidenceSnapshot('measurement').nativeCompleted,0,'sea library entries are not sea7 campaign stations');
assert.equal(api.getEvidenceSnapshot('measurement').sources.every(s=>s.state==='unlinked'),true);
assert.equal(api.getEvidenceSnapshot('testimony').readyToCompare,false);
nativePalace.done.pz_pclock=1;
assert.equal(api.getEvidenceSnapshot('testimony').nativeCompleted,1);
nativePalace.done.pz_pjail=1;
const palaceEvidence=api.getEvidenceSnapshot('testimony');
assert.equal(palaceEvidence.nativeCompleted,2);
assert.equal(palaceEvidence.readyToCompare,true,'two different completed stations are ready for manual comparison');
assert.equal(palaceEvidence.inferenceVerified,false,'game completion alone never certifies an inference');
assert.equal(palaceEvidence.sources.find(s=>s.id==='pz_pobs').state,'pending');
nativeAtheran.done.pz_alayer=1;
nativeAtheran.done.pz_acity=1;
assert.equal(api.getEvidenceSnapshot('traces').nativeCompleted,2);
assert.equal(api.getEvidenceSnapshot('traces').readyToCompare,true);
assert.equal(api.evidenceVisibleFiles().length,3,'optional secret branch must be hidden before official finale');
nativeAtheran.sw.bones=1;
assert.equal(api.getEvidenceSnapshot('people').sources[0].state,'pending','discovery alone does not count as solving a secret');
nativeAtheran.swd.bones=1;
assert.equal(api.getEvidenceSnapshot('people').nativeCompleted,1,'cleared world is engine-confirmed');
nativeAtheran.done.pz_aheart=1;
assert.equal(api.evidenceVisibleFiles().length,4,'optional names file appears only after native finale');
assert.equal(api.getEvidenceSnapshot('invalid'),null);
assert.equal(JSON.parse(state.get('treasureV3')).done.sea7_0,true);
// The notebook never silently invents a puzzle or leaks a retired one.
const liveIds = new Set(JSON.parse(fs.readFileSync('legacy/inventory.json','utf8')).puzzles.map(p=>p.id));
for (const fileId of ['measurement','testimony','traces','people']) {
  const sourceIds = api.getEvidenceSnapshot(fileId).sources.map(s=>s.id);
  assert.equal(new Set(sourceIds).size,sourceIds.length,'all dossier sources distinct by puzzle ID: '+fileId);
  for (const sourceId of sourceIds) assert(liveIds.has(sourceId),'notebook source must exist in live inventory: '+sourceId);
}
assert(!src.includes("['pz_stat'") && !src.includes("['pz_xbottle'"),'retired puzzle IDs must not return to the notebook');
const allKeys=[...state.keys()];
assert.equal(allKeys.length,4,'new notebook creates just one isolated localStorage key');
console.log('Journey evidence notebook: 3 core dossiers + 1 gated optional dossier, native completion provenance, notes isolated, no invented inferences passed.');
