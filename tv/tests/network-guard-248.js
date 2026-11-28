const assert=require('node:assert/strict'),G=require('../shared/network-guard-248.js'),D=require('../shared/core.js');
const s={phase:'question',roundStart:1000,players:[{id:'a'},{id:'b'},{id:'c'}],deadline:61000,pausedAt:0};
const phones={a:{seen:19000},b:{seen:19000},c:{seen:19000}};
assert.equal(G.health(s,20000,0,phones).reason,'brokers');assert.equal(G.health(s,20000,1,phones).reason,'');
phones.a.seen=1000;assert.equal(G.health(s,20000,1,phones).reason,'');phones.b.seen=1000;assert.equal(G.health(s,20000,1,phones).reason,'players');
D.pause(s,20000);s.networkPause='players';assert.equal(G.canResume(s,21000,1,phones),false);phones.a.seen=21000;assert.equal(G.canResume(s,21000,1,phones),true);
assert.equal(G.canResume(s,21000,0,phones),false);D.resume(s,25000);assert.equal(s.deadline,66000);assert.equal(s.roundStart,6000);assert.equal(s.networkPause,undefined);console.log('PASS network pause policy and time preservation');