'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const game = { id: 'sw', name: 'القاعدة المتغيرة', quiz: { dur: 45, max: 6, make() {} } };
const state = { st: { lv: {}, hist: [], best: {}, days: {} }, saveCalls: 0, save() { this.saveCalls++; } };
const sandbox = {
  G: [game], GM: { sw: game }, S: state,
  gameRank(id) { return id === 'sw' ? [1, 6] : null; },
  window: {}, console: { error() {} }
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'cognition/signal-guard.js'), 'utf8'), sandbox, { filename: 'signal-guard.js' });
const runtime = sandbox.window.MINDLAB_SIGNAL_GUARD_RUNTIME;
assert.ok(runtime, 'runtime is registered');
assert.equal(runtime.id, 'sw', 'the existing game ID is retained');
assert.equal(runtime.title, 'حارس الإشارة');
assert.equal(runtime.stages.length, 7);
assert.equal(runtime.totalTrials, 54);
assert.deepEqual(Array.from(runtime.validate()), []);
assert.equal(typeof game.run, 'function');
assert.equal(game.nocd, 1);
assert.equal(game.quiz, undefined, 'the old random quiz path is not used by the live game');
assert.deepEqual(Array.from(sandbox.gameRank('sw')), [1, 7]);
assert.equal(state.saveCalls, 0, 'loading the add-on must not mutate or save player data');
assert.equal(game.hidden, false, 'game card becomes visible after the replacement is ready');
assert.equal(runtime.readProgress().unlockedStage, 1, 'new progress starts at stage one');
runtime.persistProgress({ unlockedStage: 3, results: [] });
assert.equal(state.st.signalGuard.unlockedStage, 3, 'progress is saved in its isolated state field');
assert.equal(state.st.lv.signalGuard, 3, 'the current rank reflects unlocked progress');
assert.equal(state.saveCalls, 1, 'progress uses the existing save routine');
assert.deepEqual(Array.from(sandbox.gameRank('sw')), [3, 7]);

const expectedCounts = [6, 6, 8, 8, 8, 8, 10];
assert.deepEqual(Array.from(runtime.stages, stage => stage.trials.length), expectedCounts);
for (const stage of runtime.stages) {
  for (const trial of stage.trials) {
    assert.ok(runtime.options[trial.rule], `known rule in stage ${stage.id}`);
    assert.equal(runtime.options[trial.rule].filter(option => option.id === trial.answer).length, 1,
      `exactly one correct answer in stage ${stage.id}`);
    if (trial.signal) {
      assert.ok(['blue', 'violet', 'gold', 'coral', 'purple'].includes(trial.signal));
    }
  }
}

const scored = runtime.summarize([
  { ok: true, rt: 400, rule: 'parity' },
  { ok: false, rt: 600, rule: 'threshold' }, // an error after a rule switch
  { ok: false, rt: 800, rule: 'threshold' }, // an error while repeating the rule
  { ok: true, rt: 200, rule: 'parity' }
]);
assert.equal(scored.total, 4);
assert.equal(scored.correct, 2);
assert.equal(scored.errors, 2);
assert.equal(scored.accuracy, 0.5);
assert.equal(scored.meanRT, 500);
assert.equal(scored.switchErrors, 1);
assert.equal(scored.repeatErrors, 1);

assert.equal(runtime.advanceProgress(1, 1, 0.74), 1, '74% must not unlock the next stage');
assert.equal(runtime.advanceProgress(1, 1, 0.75), 2, '75% unlocks the next stage');
assert.equal(runtime.advanceProgress(4, 2, 1), 4, 'replaying an earlier stage cannot lower progress');
assert.equal(runtime.advanceProgress(6, 7, 1), 7, 'stage seven caps progress at seven');

const ui = fs.readFileSync(path.join(root, 'ui/app.js'), 'utf8');
const offline = fs.readFileSync(path.join(root, 'offline-manifest.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(ui.includes("load('cognition/signal-guard.js')"), 'addon loader includes Signal Guard');
assert.ok(offline.includes('cognition/signal-guard.js') && offline.includes('cognition/signal-guard.css'),
  'both game assets are included in offline precache');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.ok(sw.includes(`const VERSION='${pkg.version}'`), 'service-worker cache version matches package');


// Exercise the actual game.run() flow with a small deterministic DOM harness.
class FakeButton {
  constructor(dataset = {}) {
    this.dataset = dataset; this.disabled = !!dataset.disabled; this.handlers = {}; this.className = '';
    this.classList = { add() {} };
  }
  addEventListener(type, fn) { this.handlers[type] = fn; }
  click() { if (!this.disabled && this.handlers.click) this.handlers.click(); }
}
class FakeNode { constructor() { this.textContent = ''; this.className = ''; this.disabled = false; } }
class FakeStage {
  constructor(nodes) { this.nodes = nodes; this._html = ''; this.stageButtons = []; this.choiceButtons = []; }
  set innerHTML(html) {
    this._html = html;
    this.stageButtons = [...html.matchAll(/<button\b[^>]*data-stage="(\d+)"[^>]*>/g)]
      .map(m => new FakeButton({ stage: m[1], disabled: /\sdisabled(?:[\s>]|$)/.test(m[0]) }));
    this.choiceButtons = [...html.matchAll(/<button\b[^>]*data-choice="([^"]+)"[^>]*data-choice-index="(\d+)"[^>]*>/g)]
      .map(m => new FakeButton({ choice: m[1], choiceIndex: m[2] }));
    this.nodes.sgBack = /id="sgBack"/.test(html) ? new FakeButton() : null;
    this.nodes.sgFeedback = /id="sgFeedback"/.test(html) ? new FakeNode() : null;
  }
  get innerHTML() { return this._html; }
  querySelectorAll(selector) {
    if (selector === '[data-stage]') return this.stageButtons;
    if (selector === '[data-choice]') return this.choiceButtons;
    return [];
  }
  querySelector(selector) {
    const m = selector.match(/^\[data-choice-index="(\d+)"\]$/);
    return m ? this.choiceButtons.find(b => b.dataset.choiceIndex === m[1]) || null : null;
  }
}
const nodes = { sc: new FakeNode(), ml: new FakeNode(), tl: new FakeNode() };
const stageHost = new FakeStage(nodes);
const gameplayState = { st: { lv: {}, hist: [], best: {}, days: {} }, saves: 0,
  save() { this.saves++; } };
let clock = 0, completion = null;
const gameplayGame = { id: 'sw', name: 'القاعدة المتغيرة', quiz: { max: 6 } };
const gameplaySandbox = {
  G: [gameplayGame], GM: { sw: gameplayGame }, S: gameplayState,
  gameRank(id) { return id === 'sw' ? [1, 6] : null; },
  document: { querySelector(selector) {
    if (selector === '#stage') return stageHost;
    const m = selector.match(/^#(sc|ml|tl|sgBack|sgFeedback)$/);
    return m ? (m[1] === 'sgBack' || m[1] === 'sgFeedback' ? nodes[m[1]] : nodes[m[1]]) : null;
  } },
  performance: { now() { clock += 125; return clock; } },
  later(fn) { fn(); }, hudHTML() { return '<div class="hud"></div>'; },
  window: {}, console: { error() {} }
};
vm.runInNewContext(fs.readFileSync(path.join(root, 'cognition/signal-guard.js'), 'utf8'), gameplaySandbox,
  { filename: 'signal-guard-gameplay.js' });
const gameplayRuntime = gameplaySandbox.window.MINDLAB_SIGNAL_GUARD_RUNTIME;
function launchStageOne() {
  completion = null;
  gameplayGame.run()(result => { completion = result; });
  const firstStage = stageHost.querySelectorAll('[data-stage]').find(button => button.dataset.stage === '1');
  assert.ok(firstStage, 'stage one is rendered in the selector');
  const lockedStageTwo = stageHost.querySelectorAll('[data-stage]').find(button => button.dataset.stage === '2');
  assert.ok(lockedStageTwo && lockedStageTwo.disabled, 'stage two starts locked');
  firstStage.click();
  return gameplayRuntime.stages[0].trials;
}
function playStageOne(trials, wrongAnswers = 0) {
  trials.forEach((trial, index) => {
    const buttons = stageHost.querySelectorAll('[data-choice]');
    const correct = buttons.find(button => button.dataset.choice === trial.answer);
    assert.ok(correct, `correct answer button is rendered for trial ${index + 1}`);
    if (index < wrongAnswers) {
      const wrong = buttons.find(button => button.dataset.choice !== trial.answer);
      assert.ok(wrong, 'a wrong answer option is available');
      wrong.click();
    } else correct.click();
  });
  assert.ok(completion, 'finishing the stage calls the host result callback');
}
let stageOneTrials = launchStageOne();
playStageOne(stageOneTrials, 2); // 4/6 = 66.7%: should not unlock stage two.
assert.equal(gameplayRuntime.readProgress().unlockedStage, 1, 'a failed attempt does not unlock the next stage');
assert.match(completion.detail, /لم تُفتح المرحلة التالية/);
stageOneTrials = launchStageOne();
playStageOne(stageOneTrials, 1); // 5/6 = 83.3%: stage two should open.
assert.equal(gameplayRuntime.readProgress().unlockedStage, 2, 'a passing attempt unlocks stage two');
assert.equal(gameplayState.saves, 2, 'each completed attempt is persisted using the existing save method');
assert.equal(gameplayRuntime.readProgress().results.length, 2, 'both attempts are kept in the isolated game history');
gameplayGame.run()(() => {}); // Host replay reopens the selector using the saved progress.
const stageTwo = stageHost.querySelectorAll('[data-stage]').find(button => button.dataset.stage === '2');
assert.ok(stageTwo && !stageTwo.disabled, 'stage two is enabled after the passing attempt');

console.log('حارس الإشارة: نجحت جميع اختبارات البيانات والمفاتيح والتقدم والتكامل دون تغيير الحفظ الحالي.');
