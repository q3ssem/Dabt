import test from 'node:test';
import assert from 'node:assert/strict';
import { FrameMetrics } from '../src/engines/bench/frame-metrics.js';

test('Frame sampler computes healthy 60fps and non-janky 1% lows from frame intervals',()=>{
 const m=new FrameMetrics();m.start(0);
 for(let i=1;i<=120;i++)m.frame(i*(1000/60));
 const x=m.stop();
 assert.equal(x.sampleCount,120);
 assert.ok(Math.abs(x.averageFPS-60)<.02);
 assert.equal(x.jankFrames,0);
 assert.ok(x.onePercentLowFPS>=59.9);
});
test('Frame sampler exposes isolated long stall in one-percent low metric',()=>{
 const m=new FrameMetrics();m.start(0);let t=0;
 for(let i=0;i<99;i++){t+=1000/60;m.frame(t);}
 t+=200;m.frame(t);
 const x=m.stop();assert.equal(x.sampleCount,100);
 assert.equal(x.jankFrames,1);
 assert.equal(x.p99FrameMs,16.67);
 assert.ok(x.onePercentLowFPS<=5.01);
 assert.ok(x.averageFPS<60);
});
test('Pause/resume excludes background time and rejects bad device timestamps',()=>{
 const m=new FrameMetrics({maxSamples:10});m.start(0);m.frame(16);
 m.pause();assert.equal(m.frame(500000),false);
 m.resume(500000);m.frame(500016);
 assert.equal(m.stop().sampleCount,2);
 assert.equal(m.summary().jankFrames,0);
 assert.throws(()=>m.start(Number.NaN),TypeError);
 m.start(0);assert.throws(()=>m.frame(0),RangeError);
 assert.throws(()=>new FrameMetrics({maxSamples:0}),RangeError);
});
test('Frame sampler uses a bounded sample window without collecting player data',()=>{
 const m=new FrameMetrics({maxSamples:10});m.start(0);
 for(let i=1;i<=30;i++)m.frame(i*16);
 assert.equal(m.summary().sampleCount,10);
 assert.equal(m.summary().averageFPS,62.5);
});
