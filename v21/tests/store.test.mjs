// Save layer: migration keeps legacy data untouched and never credits new puzzles,
// backup/restore round-trips with a rollback copy, failed saves are reported.
import assert from 'node:assert/strict';
class LS { constructor(o = {}) { this.m = new Map(Object.entries(o)); } get length() { return this.m.size; } key(i) { return [...this.m.keys()][i]; } getItem(k) { return this.m.has(k) ? this.m.get(k) : null; } setItem(k, v) { if (this.full) throw new Error('QuotaExceeded'); this.m.set(k, String(v)); } removeItem(k) { this.m.delete(k); } }
const legacy = {
  'dabt35.treasure.solved': JSON.stringify(['ti-01', 'ti-02', 'TI-01-01']),
  'dabt35.planets.solved': JSON.stringify(['moon']),
  'dabt35.child.completed': JSON.stringify(['x']),
  'dabt35.child.age': 'foundation',
  'dabt.pro.v3.sessions': JSON.stringify([{ id: 's1', gameId: 'rule-shift', mode: 'practice', metrics: { accuracy: 80, attempts: 10 } }]),
  'dabt4.journal': '[]', 'unrelated.key': 'keep',
};
globalThis.localStorage = new LS(legacy);
const S = await import('../src/core/store.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const { profile, migrated } = S.loadProfile();
ok(migrated, 'legacy detected');
ok(profile.legacy.keys.length === 6, 'six dabt legacy keys archived (unrelated key ignored)');
ok(profile.legacy.labSessions[0].mappedGameId === 'rule-switch', 'legacy lab id mapped via legacyIds');
ok(Object.keys(profile.treasure.results).length === 0, 'old treasure progress NOT counted as solving new puzzles (even same-looking id TI-01-01)');
ok(profile.child.ageBand === 'foundation', 'age band carried when identifier still valid');
ok(localStorage.getItem(S.PREMIGRATION_KEY), 'pre-migration backup written');
for (const [k, v] of Object.entries(legacy)) ok(localStorage.getItem(k) === v, 'legacy key untouched: ' + k);
ok(S.saveProfile(profile), 'save ok');
const again = S.loadProfile(); ok(!again.migrated, 'second load reads V21 profile');

// results: replay never duplicates, assisted can upgrade to solved, not downgrade
const st = again.profile.treasure;
ok(S.recordResult(st, 'TI-01-01', { assisted: true, attempts: 1, hintsUsed: 2 }).first, 'first record');
ok(!S.recordResult(st, 'TI-01-01', { assisted: false, attempts: 1, hintsUsed: 0 }).first, 'replay not first');
ok(st.results['TI-01-01'].status === 'solved' && st.results['TI-01-01'].replays === 1, 'upgrade assisted→solved, replay counted');
S.recordResult(st, 'TI-01-01', { assisted: true });
ok(st.results['TI-01-01'].status === 'solved', 'no downgrade');

// backup round trip
const text = S.exportBackup(again.profile);
again.profile.treasure.results = {};
const res = S.restoreBackup(text, again.profile);
ok(res.ok && res.profile.treasure.results['TI-01-01'], 'restore brings results back');
ok(JSON.parse(localStorage.getItem(S.PRERESTORE_KEY)).profile.treasure.results['TI-01-01'] === undefined, 'pre-restore rollback copy holds the replaced state');
ok(S.undoRestore().treasure.results['TI-01-01'] === undefined, 'undo restore returns the previous state');
ok(!S.restoreBackup('{"x":1}', again.profile).ok, 'invalid backup rejected');
ok(!S.restoreBackup('not json', again.profile).ok, 'non-JSON rejected');

// save failure is reported, never silently accepted
let events = []; S.onSaveState(e => events.push(e.ok));
localStorage.full = true; ok(!S.saveProfile(again.profile), 'quota failure returns false'); ok(events.at(-1) === false, 'failure event emitted');
localStorage.full = false; ok(S.saveProfile(again.profile), 'retry succeeds'); ok(events.at(-1) === true, 'success event clears banner');
console.log(`PASS ${n} store checks`);
