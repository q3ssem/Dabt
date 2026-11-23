'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const vm = require('node:vm');

const read = path => fs.readFileSync(path, 'utf8');
const audio = read('audio/mindlab-audio.js');
const palette = audio.slice(audio.indexOf('(function installMechanicAudio'));
const clips = [...palette.matchAll(/^\s+'([\w.]+)':\s+\[/gm)].map(match => match[1]);
const samples = [], sources = [], handlers = {};
const AC = {
  currentTime: 1,
  sampleRate: 48000,
  createBuffer(channels, length, rate) {
    assert.equal(channels, 1);
    const data = new Float32Array(length);
    samples.push(data);
    return { duration: length / rate, getChannelData: () => data };
  },
  createBufferSource() {
    const source = {
      playbackRate: {}, connect() {}, disconnect() {},
      start(at) { this.at = at; },
      stop() { this.onended(); }
    };
    sources.push(source);
    return source;
  },
  createGain() { return { gain: {}, connect() {}, disconnect() {} }; }
};
const context = {
  AC, MASTER: {}, sfx: {}, S: { st: { mute: false } }, cleanup: [],
  audioOK: () => true, window: { addEventListener: (name, fn) => { handlers[name] = fn; } },
  document: { hidden: false, addEventListener: (name, fn) => { handlers[name] = fn; } }
};
vm.runInNewContext(palette, context);
let channel = context.sfx.roundScene();
const measured = {};
for (const [i, key] of clips.entries()) {
  assert.equal(channel.play(key, .04), true, key);
  const source = sources.at(-1);
  assert.equal(source.at, AC.currentTime + .008 + .04);
  source.onended();
  const signal = samples[i];
  const rms = Math.sqrt(signal.reduce((sum, x) => sum + x*x, 0) / signal.length);
  assert.ok(rms > .015 && rms < .65, key + ' PCM RMS');
  measured[key] = {
    seconds: source.buffer.duration, rms: +rms.toFixed(4),
    sha: crypto.createHash('sha256').update(new Uint8Array(signal.buffer)).digest('hex')
  };
  AC.currentTime++;
}
assert.equal(new Set(Object.values(measured).map(m => m.sha)).size, clips.length);
assert.equal(channel.play(clips[0]), true);
assert.equal(channel.play(clips[0]), false, 'same effect throttled');
assert.equal(samples.length, clips.length, 'PCM buffers reused');
for (const key of clips.slice(1, 4)) assert.equal(channel.play(key), true);
assert.equal(channel.play(clips[4]), false, 'four-source polyphony cap');
context.cleanup.pop()();
assert.equal(channel.play(clips[4]), false, 'closed scope stops and rejects new effects');
channel = context.sfx.roundScene();
context.S.st.mute = true;
assert.equal(channel.play(clips[4]), false, 'mute prevents scheduling');
context.S.st.mute = false;
assert.equal(channel.play(clips[4]), true, 'another round can schedule again');
handlers.pagehide();
assert.equal(channel.play('missing'), false);
console.log(JSON.stringify({ measured, checks: ['PCM distinct', 'scheduled delay', 'buffer reuse', 'debounce', 'polyphony four', 'close', 'mute', 'pagehide'], audibleDeviceTest: false }, null, 2));

const html = read('index.html');
const rush = html.slice(html.indexOf('function rushEngine('), html.indexOf('function runRush()'));
const handlersRun = [];
function element() {
  const classes = new Set();
  return {
    classList: { add: c => classes.add(c), remove: (...cs) => cs.forEach(c => classes.delete(c)), toggle: () => {} },
    dataset: {}, style: { setProperty() {} }, setPointerCapture() {}, setAttribute() {}, remove() {}
  };
}
const board = element(), rendered = [], played = [];
board.parentNode = element();
board.getBoundingClientRect = () => ({ width: 300 });
board.appendChild = el => { if ('i' in el.dataset) rendered[el.dataset.i] = el; };
board.querySelector = selector => rendered[Number(selector.match(/"(\d+)"/)[1])];
board.querySelectorAll = selector => selector === '.rhcar' ? rendered : [];
let state, wins = 0;
const rushVM = {
  $: () => board, document: { createElement: element }, carSVG: () => 'legacy',
  pzHook: h => { state = h; }, tone() {}, clamp: (v, min, max) => Math.max(min, Math.min(max, v)),
  later: (fn, ms) => handlersRun.push([fn, ms]), setTimeout() {}, pzPlay() {}, sfx: {}
};
vm.createContext(rushVM);
vm.runInContext(rush, rushVM);
const api = { body: {}, ended: false, msg() {} };
let vehicle = { r: 2, c: 2, h: true, len: 2 };
rushVM.rushEngine(api, { vs: [vehicle], min: 1 }, () => wins++, {
  paintCar: () => 'review raster',
  play: (event, _, delay) => played.push([event, delay])
});
assert.ok(api.body.innerHTML.includes('top:33.333333333333336%'));
const car = rendered[0];
assert.equal(car.innerHTML, 'review raster');
const touch = (x, pointerId = 1) => ({ button: 0, pointerId, clientX: x, clientY: 0, preventDefault() {} });
car.onpointerdown(touch(0));
car.onpointerdown(touch(104, 2));
car.onpointerup(touch(104, 2));
assert.equal(state.vs[0].c, 2, "a second finger cannot commit or replace the drag");
car.onpointermove(touch(104));
car.onlostpointercapture(touch(104));
assert.equal(state.vs[0].c, 2, 'touch cancellation never commits a move');
assert.equal(car.style.left, '33.333333333333336%');
assert.ok(!played.length);
car.onpointerdown(touch(0));
car.onpointermove(touch(104));
car.onpointerup(touch(104));
assert.equal(state.vs[0].c, 4);
assert.deepEqual(played.map(x => x[0]), ['move', 'stop', 'gate']);
handlersRun.sort((a,b) => a[1]-b[1]).forEach(([fn]) => fn());
assert.equal(played.at(-1)[0], 'exit');
assert.equal(wins, 1);
assert.equal(vehicle.c, 2, 'original puzzle input unchanged');
console.error('Rush engine: cancel reverts touch, valid release commits, gate events precede one win.');
