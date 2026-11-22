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
const window = {T7:{state:()=>({done:{}}),data:{stations:[]}}};
const document = {readyState:'loading',addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];}};
vm.runInNewContext(src,{window,T7:window.T7,document,localStorage:storage,showIntro(){},closePlay(){},console});
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
const allKeys=[...state.keys()];
assert.equal(allKeys.length,4,'new notebook creates just one isolated localStorage key');
console.log('Journey evidence notebook: 3 files, isolated drafts, corrupt-store recovery, no progression/save mutations passed.');
