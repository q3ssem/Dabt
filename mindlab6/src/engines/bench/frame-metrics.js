// Frame-time sampler for future EXP-0002 device comparisons; not a benchmark result.
export class FrameMetrics {
  #samples=[];
  #last=null;
  #active=false;
  #limit;
  #jank;
  constructor({ maxSamples=3600,jankThresholdMs=33.333333 }={}) {
    if (!Number.isInteger(maxSamples)||maxSamples<10) throw new RangeError('maxSamples must be >= 10');
    if (!Number.isFinite(jankThresholdMs)||jankThresholdMs<=0) throw new RangeError('jank threshold must be positive');
    this.#limit=maxSamples;
    this.#jank=jankThresholdMs;
  }
  start(timeMs) {
    if (!Number.isFinite(timeMs)) throw new TypeError('Start timestamp must be finite');
    this.#samples=[];
    this.#last=timeMs;
    this.#active=true;
  }
  frame(timeMs) {
    if (!this.#active) return false;
    if (!Number.isFinite(timeMs)) throw new TypeError('Frame timestamp must be finite');
    if (timeMs<=this.#last) throw new RangeError('Frame timestamps must increase');
    const duration=timeMs-this.#last;
    this.#last=timeMs;
    if (this.#samples.length===this.#limit)this.#samples.shift();
    this.#samples.push(duration);
    return true;
  }
  pause(){this.#active=false;this.#last=null;}
  resume(timeMs){
    if (!Number.isFinite(timeMs))throw new TypeError('Resume timestamp must be finite');
    this.#last=timeMs;this.#active=true;
  }
  stop(){this.pause();return this.summary();}
  summary(){
    const intervals=this.#samples.slice();
    if(!intervals.length)return Object.freeze({sampleCount:0,averageFPS:null,p95FrameMs:null,p99FrameMs:null,onePercentLowFPS:null,jankFrames:0});
    const sorted=intervals.slice().sort((a,b)=>a-b),sum=intervals.reduce((a,b)=>a+b,0);
    const p=x=>sorted[Math.max(0,Math.ceil(sorted.length*x)-1)];
    const slowestCount=Math.max(1,Math.ceil(sorted.length*.01));
    const slowest=sorted.slice(-slowestCount).reduce((a,b)=>a+b,0)/slowestCount;
    const round=x=>Math.round(x*100)/100;
    return Object.freeze({sampleCount:intervals.length,averageFPS:round(intervals.length*1000/sum),
      p95FrameMs:round(p(.95)),p99FrameMs:round(p(.99)),
      onePercentLowFPS:round(1000/slowest),jankFrames:intervals.filter(x=>x>this.#jank).length});
  }
}
