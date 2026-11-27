const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
let timers=new Map(),seq=0,contexts=0,notes=[],nodes=[],buffers=0,clock,master;
function param(v=0){return {value:v,setValueAtTime(x){this.value=x;return this},exponentialRampToValueAtTime(){return this}}}
function source(){let n={frequency:param(),gain:param(),connect(){},disconnect(){this.disconnected=true},start(t){this.at=t;notes.push({t,f:this.frequency.value})},stop(t){if(t===undefined)this.cancelled=true}};nodes.push(n);return n}
class AC{constructor(){contexts++;clock=this;this.state='running';this.currentTime=0;this.sampleRate=44100;this.destination={}}createGain(){let g=source();if(!master)master=g;return g}createOscillator(){return source()}createBufferSource(){return source()}createBiquadFilter(){return source()}createBuffer(c,n){buffers++;return{getChannelData:()=>new Float32Array(n)}}resume(){this.state='running';return Promise.resolve()}}
let env={window:{AudioContext:AC},setInterval(fn){timers.set(++seq,fn);return seq},clearInterval(id){timers.delete(id)}};
vm.createContext(env);vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/av.js'),'utf8'),env);
const music=env.DabtMusic();music.unlock();assert.equal(buffers,1);assert.equal(contexts,1);assert.equal(master.gain.value,0);
music.volume(.4);assert.equal(master.gain.value,0);music.start(0);assert.equal(master.gain.value,.4);assert.equal(timers.size,1);
assert.ok(notes.some(n=>Math.abs(n.f-110)<.001));const prev=nodes.filter(n=>n.at!==undefined);
music.start(1);assert.ok(prev.every(n=>n.cancelled));assert.ok(notes.some(n=>Math.abs(n.f-98)<.001));
music.start(2);assert.ok(notes.some(n=>Math.abs(n.f-130.8)<.001));assert.equal(timers.size,1);
music.volume(0);assert.equal(master.gain.value,0);music.volume(.25);assert.equal(master.gain.value,.25);
music.hurry(true);clock.currentTime=.3;for(const fn of timers.values())fn();assert.ok(notes.some(n=>Math.abs(n.f-554.592)<.01)||notes.some(n=>n.t>.3));
music.stop();assert.equal(timers.size,0);assert.equal(master.gain.value,0);assert.ok(nodes.filter(n=>n.at!==undefined).every(n=>n.cancelled));assert.equal(music.playing(),false);
music.start(0);assert.equal(contexts,1);assert.equal(buffers,1);assert.equal(master.gain.value,.25);music.stop();assert.equal(timers.size,0);assert.equal(master.gain.value,0);
console.log('PASS: theme selection, cancelled scheduled notes, volume, mute, restart, single context and buffer');
