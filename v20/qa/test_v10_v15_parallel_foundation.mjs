import assert from 'node:assert/strict';
import { createPlatformState, PLATFORM_STATE_KEY } from '../src/core/platform-state.js';
import { ELEMENTS, resolveElementInteraction, evaluateLinkedPuzzle, evaluateBossPhase } from '../src/adventures/elemental-systems.js';
import { validateGameReview, summarizeSessionMode, COGNITIVE_REVIEW_CRITERIA } from '../src/games/review-matrix.js';
import { CHILD_AGE_BANDS, childActivityPolicy } from '../src/child/curriculum.js';

class MemoryStorage {
  data = new Map();
  getItem(k) { return this.data.has(k) ? this.data.get(k) : null; }
  setItem(k,v) { this.data.set(k,String(v)); }
}
const storage = new MemoryStorage();
const platform = createPlatformState(storage);
assert.equal(platform.setProgress('adventures','treasure:0-0',{solved:true}),true);
assert.equal(platform.setStoryFlag('tide-gate-open'),true);
assert.equal(platform.recordChoice('ending','mercy'),true);
const restored = createPlatformState(storage).getState();
assert.equal(restored.progress.adventures['treasure:0-0'].solved,true);
assert.equal(restored.story.flags['tide-gate-open'],true);
assert.equal(restored.story.choices.ending,'mercy');
assert.ok(storage.getItem(PLATFORM_STATE_KEY));
assert.equal(platform.importState('{broken').ok,false);
assert.equal(platform.importState(JSON.stringify({schema:'wrong',version:1})).ok,false);
const exported = platform.exportState();
assert.equal(platform.importState(exported).ok,true);
assert.equal(platform.setProgress('unknown','x',{}),false);

assert.deepEqual(Object.keys(ELEMENTS),['water','fire','light','energy']);
assert.equal(resolveElementInteraction({element:'water',target:'hot-surface'}).effect,'steam');
assert.equal(resolveElementInteraction({element:'fire',target:'frozen-lock'}).effect,'heat');
assert.equal(resolveElementInteraction({element:'light',target:'mirror'}).effect,'reflection');
assert.equal(resolveElementInteraction({element:'energy',target:'dormant-machine'}).effect,'circuit');
assert.equal(resolveElementInteraction({element:'water',target:'unrelated-rock'}).ok,false);
assert.equal(evaluateLinkedPuzzle({localSolved:['a'],requiredLocal:['a'],remoteFlags:['moon-power'],worldFlags:{'moon-power':true}}).unlocked,true);
assert.equal(evaluateLinkedPuzzle({localSolved:['a'],requiredLocal:['a'],remoteFlags:['moon-power'],worldFlags:{}}).unlocked,false);
assert.equal(evaluateBossPhase({healthRatio:.8}).pattern,'telegraph-and-sweep');
assert.equal(evaluateBossPhase({healthRatio:.5}).phase,2);
assert.equal(evaluateBossPhase({healthRatio:.2,exposed:true}).vulnerable,true);

assert.equal(validateGameReview(Object.fromEntries(COGNITIVE_REVIEW_CRITERIA.map(k=>[k,true]))).ready,true);
assert.equal(validateGameReview({}).ready,false);
assert.deepEqual(summarizeSessionMode([{mode:'practice'},{mode:'assessment'},{mode:'other'}]),{practice:1,assessment:1,other:1});
assert.equal(CHILD_AGE_BANDS.length,4);
assert.equal(childActivityPolicy({ageBand:'early',choices:3,hasTimer:true}).validChoiceCount,false);
assert.equal(childActivityPolicy({ageBand:'early',choices:2,hasTimer:true}).avoidTimePressure,true);
console.log('PASS: v10-v15 shared state, safe import/export, elemental reactions, linked puzzles, boss phases, cognitive review gate, and child age-band policy');
