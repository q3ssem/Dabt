'use strict';
/* Guard against impossible fake-coin configurations masquerading as playable levels.
 * For 13 unknown heavy-or-light coins in three weighings, the first weighing
 * must put a coins on each pan. An imbalance then leaves 2a distinct suspects,
 * but two remaining weighings have only 3^2 = 9 outcome sequences: a <= 4.
 * A balance leaves 13-2a unknown-sign coins; two weighings with genuine
 * reference coins can distinguish at most 4 coin identities: a >= 5.
 * Those bounds cannot both hold, so the old level-7 (13,u,3) had no sure win.
 */
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const index=fs.readFileSync('index.html','utf8');
const source=index.match(/const SC_LV=(\[[^;\n]+\]);/);
assert.ok(source,'scale level configuration must remain inspectable');
const levels=vm.runInNewContext(source[1]);
assert.equal(levels.length,7,'scale should keep all seven original levels');
for(const [i,[n,mode,weighs]] of levels.entries()){
  assert.ok(Number.isInteger(n)&&n>=3&&Number.isInteger(weighs)&&weighs>=1,'scale level '+(i+1)+' has valid limits');
  assert.ok(mode==='h'||mode==='u','scale level '+(i+1)+' uses known/heavy-or-light rules');
  if(mode==='h')assert.ok(n<=3**weighs,'known-heavy scale level '+(i+1)+' exceeds 3-way information capacity');
}
const level7=levels[6];
assert.equal(level7[0],13,'keep the challenging thirteen-coin board');
assert.equal(level7[1],'u','keep unknown heavier-or-lighter mechanics');
const twoWeighUnknownSignCapacity=4;
const possibleBalancedFirstWeighs=[...Array(7).keys()].filter(a=>
  2*a<=3**2 && 13-2*a<=twoWeighUnknownSignCapacity);
assert.deepEqual(possibleBalancedFirstWeighs,[],'thirteen unknown-sign coins cannot be identified in three weighings');
assert.ok(level7[2]>=4,'level 7 must offer at least four weighings for a logically possible win');
console.log('Scale information bound passed: impossible 13/unknown-sign/3-weigh limit cannot return.');
