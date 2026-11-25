'use strict';
const assert=require('node:assert/strict');
const MQ=require('../shared/mq.js');
const sockets=[],events=[];
class FakeWS{
  constructor(url){this.url=url;this.readyState=0;this.sent=[];this.closed=false;sockets.push(this)}
  send(bytes){assert.equal(this.readyState,1);this.sent.push(Array.from(bytes))}
  close(){this.closed=true;this.readyState=3}
  ready(){this.readyState=1;this.onopen();this.onmessage({data:Uint8Array.from([0x20,2,0,0]).buffer})}
  lost(){const cb=this.onclose;this.readyState=3;cb()}
}
const mq=MQ(['wss://one.test','wss://two.test','wss://three.test'],()=>{},n=>events.push(n),FakeWS);
try{
  mq.subscribe('qa/state');assert.equal(sockets.length,3);
  sockets.slice().forEach(s=>s.ready());assert.equal(mq.up,3);
  const first=sockets[0],second=sockets[1],third=sockets[2];
  first.lost();assert.equal(mq.up,2);
  mq.refresh(false);assert.equal(sockets.length,4);assert.equal(mq.conns[1].ws,second);assert.equal(mq.conns[2].ws,third);
  mq.refresh(false);assert.equal(sockets.length,4);
  const replacement=sockets[3];replacement.ready();assert.equal(mq.up,3);
  assert.equal(mq.publish('qa/state','hello'),3);
  assert.equal([replacement,second,third].filter(s=>s.sent.some(p=>p[0]===0x30)).length,3);
  mq.conns.forEach(c=>c.lastRefresh=0);mq.conns[1].lastRx=Date.now()-15000;
  mq.refresh(true);assert.equal(sockets.length,5);assert.equal(mq.conns[0].ws,replacement);assert.equal(mq.conns[2].ws,third);assert(second.closed);
  sockets[4].ready();assert.equal(mq.up,3);
  mq.close();assert.equal(mq.up,0);mq.refresh(true);assert.equal(sockets.length,5);assert(sockets.every(s=>s.closed));
  console.log(JSON.stringify({passed:true,healthySocketsPreserved:true,failedSocketRecovered:true,staleSocketReplaced:true,refreshThrottled:true,allTimersClosed:true,events}));
}finally{mq.close()}
