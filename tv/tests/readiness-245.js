const assert=require('node:assert/strict'),D=require('../shared/core.js');
const d=D.initial();d.bank.questions=[D.question({id:'q',t:'Question',o:['a','b','c','d'],a:0,s:20})];d.config.requireReady=true;d.session=D.newSession(d.bank,d.config,1000);D.player(d.session,'p1','One',0);D.player(d.session,'p2','Two',1);
assert.throws(()=>D.start(d.session,d.bank,d.config,2000));assert.throws(()=>D.start(d.session,d.bank,d.config,2000,undefined,['p1']));assert.equal(d.session.phase,'lobby');assert.equal(D.normalize(d).config.requireReady,true);
D.start(d.session,d.bank,d.config,2000,undefined,['p1','p2']);assert.equal(d.session.phase,'ready');
assert.equal(D.config({}).requireReady,false);console.log('Readiness core gate and backward compatible config passed');
