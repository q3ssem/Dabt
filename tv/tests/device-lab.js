const assert=require('node:assert/strict'),L=require('../shared/device-lab.js');
const sample=(n,ms)=>L.stats(Array(n).fill(ms));
assert.equal(sample(120,16.667).fps,60);assert.equal(L.recommend(sample(60,33.33),sample(120,16.667)),'high');
assert.equal(L.recommend(sample(60,33.33),sample(90,22.22)),'balanced');assert.equal(L.recommend(sample(60,33.33),sample(30,66.67)),'lite');assert.equal(L.recommend(sample(20,100),null),'unverified');assert.equal(L.recommend(null,null),'unverified');assert.equal(L.stats([]),null);
assert.equal(L.recommend(sample(60,33.33),L.stats(Array(110).fill(16).concat(Array(10).fill(90)))),'lite');console.log('PASS device lab stats and conservative profiles');