'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../cognition/ear-alert.js'), 'utf8');
const legacySw = { id: 'sw', name: 'حارس الإشارة', run() {}, marker: 'keep' };
const legacyHasad = { id: 'hasad', name: 'حصاد الكلمات', marker: 'keep' };
const state = { lv: { signalGuard: 3 }, signalGuard: { unlockedStage: 3, results: [{ stage: 1 }] } };
let saves = 0, renders = 0;
const G = [legacySw, legacyHasad];
const GM = { sw: legacySw, hasad: legacyHasad };
const sandbox = {
  G, GM, I: {}, S: { st: state, save() { saves++; } },
  gameRank() { return null; }, renderAll() { renders++; },
  console, setTimeout, clearTimeout, performance: { now: () => 1000 }
};
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'ear-alert.js' });

const runtime = sandbox.MINDLAB_EAR_ALERT_RUNTIME;
assert.ok(runtime, 'runtime must register');
assert.equal(runtime.id, 'ear');
assert.equal(runtime.title, 'أذن يقظة');
assert.deepEqual(Array.from(runtime.validate()), []);
assert.equal(runtime.stages.length, 6);
assert.equal(runtime.totalTrials, 48);
assert.equal(G.filter(g => g.id === 'ear').length, 1);
assert.equal(GM.ear, G.find(g => g.id === 'ear'));
assert.equal(GM.ear.cat, 'foc');
assert.equal(GM.ear.nocd, 1);
assert.equal(typeof GM.ear.run, 'function');
assert.equal(sandbox.I.ear, '👂');
assert.equal(renders, 1, 'catalog should refresh after registration');

// Every fixed trial has a unique correct choice and valid playback payload.
runtime.stages.forEach(stage => stage.trials.forEach((trial, index) => {
  assert.equal(trial.options.filter(option => option.id === trial.answer).length, 1, `unique answer ${stage.id}.${index + 1}`);
  const events = runtime.buildEvents(trial);
  assert.ok(events.length >= 1, `audio events ${stage.id}.${index + 1}`);
  events.forEach(event => {
    assert.ok(event.freq >= 250 && event.freq <= 1000, `frequency range ${stage.id}.${index + 1}`);
    assert.ok(event.duration >= 80 && event.duration <= 150, `duration ${stage.id}.${index + 1}`);
    assert.ok(event.gap >= 50 && event.gap <= 450, `gap ${stage.id}.${index + 1}`);
  });
}));

// Verify that yes/no target keys match the actual sound data.
runtime.stages[4].trials.forEach((trial, index) => {
  const hasTarget = trial.tones.some(item => item.freq === 760);
  assert.equal(trial.answer, hasTarget ? 'yes' : 'no', `target detection key ${index + 1}`);
});
runtime.stages[5].trials.forEach((trial, index) => {
  const hasTarget = trial.pairs.some(pair => pair[0] === 760 && pair[1] === 360);
  assert.equal(trial.answer, hasTarget ? 'yes' : 'no', `paired target key ${index + 1}`);
});

const score = runtime.summarize([{ ok: true, rt: 500 }, { ok: false, rt: 700 }, { ok: true, rt: 600 }, { ok: true, rt: 400 }]);
assert.equal(score.total, 4);
assert.equal(score.correct, 3);
assert.equal(score.errors, 1);
assert.equal(score.accuracy, 0.75);
assert.equal(score.meanRT, 550);
assert.equal(runtime.advanceProgress(2, 2, 0.74), 2);
assert.equal(runtime.advanceProgress(2, 2, 0.75), 3);
assert.equal(runtime.advanceProgress(6, 6, 1), 6);

runtime.persistProgress({ unlockedStage: 4, results: [{ stage: 1, passed: true }] });
assert.equal(state.earAlert.unlockedStage, 4);
assert.equal(state.lv.earAlert, 4);
assert.equal(saves, 1);
assert.deepEqual(JSON.parse(JSON.stringify(runtime.readProgress())), JSON.parse(JSON.stringify(state.earAlert)));
assert.deepEqual(JSON.parse(JSON.stringify(state.signalGuard)), { unlockedStage: 3, results: [{ stage: 1 }] }, 'signal guard progress must remain unchanged');
assert.equal(legacySw.marker, 'keep');
assert.equal(legacyHasad.marker, 'keep');
assert.deepEqual(Array.from(sandbox.gameRank('ear')), [4, 6]);
assert.equal(sandbox.gameRank('sw'), null, 'existing game rank behavior must be preserved');

// Integration wiring and offline/version assertions.
const appJs = fs.readFileSync(path.join(__dirname, '../../ui/app.js'), 'utf8');
const offline = fs.readFileSync(path.join(__dirname, '../../offline-manifest.js'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '../../sw.js'), 'utf8');
assert.match(appJs, /cognition\/ear-alert\.css/);
assert.match(appJs, /load\('cognition\/ear-alert\.js'\)/);
assert.match(offline, /cognition\/ear-alert\.js/);
assert.match(offline, /cognition\/ear-alert\.css/);
assert.match(sw, /VERSION='5\.5\.5'/);

console.log('أذن يقظة: جميع تحققات التكامل ناجحة — 6 مراحل، 48 محاولة، مفاتيح الإجابة، جدولة الصوت، الحفظ، وربط الكتالوج والعمل دون اتصال.');

// Exercise the real selector -> audio playback/replay -> answer -> progression flow.
class FakeButton {
  constructor(dataset = {}, disabled = false) { this.dataset = dataset; this.disabled = disabled; this.handlers = {}; this.className = ''; this.textContent = ''; this.classList = { add() {} }; }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  click() { return this.disabled ? undefined : (this.handlers.click ? this.handlers.click() : undefined); }
}
class FakeNode { constructor() { this.textContent = ''; this.className = ''; this.disabled = false; } }
class FakeStage {
  constructor() { this._html = ''; this.stageButtons = []; this.answerButtons = []; this.nodes = {}; }
  set innerHTML(html) {
    this._html = html;
    this.stageButtons = [...html.matchAll(/<button\b[^>]*data-stage="(\d+)"[^>]*>/g)]
      .map(m => new FakeButton({ stage: m[1] }, /\sdisabled(?:[\s>]|$)/.test(m[0])));
    this.answerButtons = [...html.matchAll(/<button\b[^>]*data-answer="([^"]+)"[^>]*>/g)]
      .map(m => new FakeButton({ answer: m[1] }, /\sdisabled(?:[\s>]|$)/.test(m[0])));
    this.nodes.play = /id="eaPlay"/.test(html) ? new FakeButton() : null;
    this.nodes.back = /id="eaBack"/.test(html) ? new FakeButton() : null;
    this.nodes.status = /id="eaSoundStatus"/.test(html) ? new FakeNode() : null;
    this.nodes.feedback = /id="eaFeedback"/.test(html) ? new FakeNode() : null;
  }
  get innerHTML() { return this._html; }
  querySelectorAll(selector) {
    if (selector === '[data-stage]') return this.stageButtons;
    if (selector === '[data-answer]') return this.answerButtons;
    return [];
  }
  querySelector(selector) {
    if (selector === '#eaPlay') return this.nodes.play;
    if (selector === '#eaBack') return this.nodes.back;
    if (selector === '#eaSoundStatus') return this.nodes.status;
    if (selector === '#eaFeedback') return this.nodes.feedback;
    return null;
  }
}
class FakeAudioParam { setValueAtTime() {} exponentialRampToValueAtTime() {} }
class FakeAudioNode {
  constructor() { this.frequency = new FakeAudioParam(); this.gain = new FakeAudioParam(); }
  connect() {} disconnect() {} start() {} stop() {}
}
class FakeAudioContext {
  constructor() { this.state = 'running'; this.currentTime = 1; this.destination = {}; }
  createOscillator() { return new FakeAudioNode(); }
  createGain() { return new FakeAudioNode(); }
  resume() { return Promise.resolve(); }
  close() { this.state = 'closed'; return Promise.resolve(); }
}
(async () => {
  const asyncState = { lv: {} }, stageHost = new FakeStage();
  let now = 0, timerId = 0, completion = null;
  const pending = new Map();
  const asyncLegacyGame = { id: 'sw', name: 'حارس الإشارة' };
  const asyncSandbox = {
    G: [asyncLegacyGame], GM: { sw: asyncLegacyGame }, I: {}, S: { st: asyncState, save() {} },
    gameRank() { return null; }, renderAll() {}, cleanup: [], AudioContext: FakeAudioContext,
    document: { querySelector(selector) { return selector === '#stage' ? stageHost : null; } },
    performance: { now() { now += 100; return now; } },
    setTimeout(fn) { const id = ++timerId; pending.set(id, fn); return id; },
    clearTimeout(id) { pending.delete(id); },
    console: { error() {} }
  };
  asyncSandbox.window = asyncSandbox;
  vm.runInNewContext(source, asyncSandbox, { filename: 'ear-alert-gameplay.js' });
  const asyncRuntime = asyncSandbox.MINDLAB_EAR_ALERT_RUNTIME;
  const asyncGame = asyncSandbox.GM.ear;
  assert.ok(asyncGame, 'ear game is registered after module load');
  const flushTimer = () => {
    const next = pending.entries().next().value;
    assert.ok(next, 'a scheduled gameplay timer should exist');
    pending.delete(next[0]); next[1]();
  };
  asyncGame.run()(result => { completion = result; });
  const stageOne = stageHost.querySelectorAll('[data-stage]').find(button => button.dataset.stage === '1');
  assert.ok(stageOne, 'stage one selector button is rendered');
  const stageTwoLocked = stageHost.querySelectorAll('[data-stage]').find(button => button.dataset.stage === '2');
  assert.ok(stageTwoLocked && stageTwoLocked.disabled, 'stage two is locked before stage one passes');
  stageOne.click();
  const trials = asyncRuntime.stages[0].trials;
  for (let i = 0; i < trials.length; i++) {
    const play = stageHost.querySelector('#eaPlay');
    assert.ok(play, `listen button rendered for trial ${i + 1}`);
    await play.click();
    assert.ok(stageHost.querySelectorAll('[data-answer]').every(button => button.disabled), 'answers remain disabled during playback');
    flushTimer();
    if (i === 0) {
      const replay = stageHost.querySelector('#eaPlay');
      assert.ok(replay && !replay.disabled, 'one replay is available after first playback');
      await replay.click();
      assert.ok(stageHost.querySelectorAll('[data-answer]').every(button => button.disabled), 'answers lock again during replay');
      flushTimer();
    }
    const options = stageHost.querySelectorAll('[data-answer]');
    const selected = options.find(button => button.dataset.answer === trials[i].answer);
    const chosen = i < 3 ? options.find(button => button.dataset.answer !== trials[i].answer) : selected;
    assert.ok(chosen && !chosen.disabled, 'answer options unlock only after playback ends');
    chosen.click(); flushTimer();
  }
  assert.ok(completion, 'the game calls the host completion callback after eight attempts');
  assert.equal(asyncRuntime.readProgress().unlockedStage, 1, 'five correct answers do not meet the 75% pass threshold');
  completion = null;
  asyncGame.run()(result => { completion = result; });
  stageHost.querySelectorAll('[data-stage]').find(button => button.dataset.stage === '1').click();
  for (let i = 0; i < trials.length; i++) {
    await stageHost.querySelector('#eaPlay').click(); flushTimer();
    const options = stageHost.querySelectorAll('[data-answer]');
    const selected = options.find(button => button.dataset.answer === trials[i].answer);
    const chosen = i < 2 ? options.find(button => button.dataset.answer !== trials[i].answer) : selected;
    assert.ok(chosen && !chosen.disabled);
    chosen.click(); flushTimer();
  }
  assert.ok(completion, 'a passing retry completes normally');
  assert.equal(asyncRuntime.readProgress().unlockedStage, 2, 'exactly 75% accuracy unlocks stage two');
  assert.equal(asyncRuntime.readProgress().results.length, 2, 'both attempts are preserved');
  assert.equal(pending.size, 0, 'all scheduled UI timers are drained');
  console.log('أذن يقظة: تدفق اللعب الفعلي المحاكى نجح، بما فيه تشغيل الصوت وإعادة الاستماع وقفل الإجابات وفتح المرحلة عند 75٪.');
})().catch(error => { console.error(error); process.exit(1); });
