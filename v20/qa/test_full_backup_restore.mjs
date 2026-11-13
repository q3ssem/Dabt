import assert from 'node:assert/strict';
import { createFullBackup, restoreFullBackup } from '../src/core/backup.js';

class MemoryStorage {
  map = new Map();
  get length() { return this.map.size; }
  key(index) { return [...this.map.keys()][index] ?? null; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(String(key), String(value)); }
  removeItem(key) { this.map.delete(key); }
}

const storage = new MemoryStorage();
storage.setItem('dabt.pro.v3.sessions', JSON.stringify([{ id: 'session-1', metrics: { accuracy: 75 } }]));
storage.setItem('dabt35.treasure.solved', JSON.stringify(['0-0', '0-1']));
storage.setItem('dabt35.child.age', '"foundation"');
storage.setItem('unrelated.preference', 'keep-me');
const backup = createFullBackup(storage);
storage.setItem('dabt35.treasure.solved', '[]');
storage.setItem('dabt35.child.age', '"advanced"');
storage.setItem('dabt.extra.stale', 'true');
const restored = restoreFullBackup(backup, storage);
assert.deepEqual(restored, { ok: true, restoredKeys: 3 });
assert.deepEqual(JSON.parse(storage.getItem('dabt35.treasure.solved')), ['0-0', '0-1']);
assert.equal(storage.getItem('dabt35.child.age'), '"foundation"');
assert.equal(storage.getItem('dabt.extra.stale'), null);
assert.equal(storage.getItem('unrelated.preference'), 'keep-me');
assert.equal(restoreFullBackup('{broken', storage).reason, 'invalid-json');
assert.equal(restoreFullBackup(JSON.stringify({ schema: 'wrong', version: 1, data: {} }), storage).reason, 'unsupported-schema');
assert.equal(restoreFullBackup(JSON.stringify({ schema: 'dabt-pro-full-backup', version: 1, data: { 'other.key': '1' } }), storage).reason, 'invalid-data');
assert.deepEqual(JSON.parse(JSON.parse(createFullBackup(storage)).data['dabt.pro.v3.sessions']), [{ id: 'session-1', metrics: { accuracy: 75 } }]);
console.log('PASS: full backup/restore — sessions and game progress round-trip, unrelated browser settings remain untouched, invalid files rejected.');
