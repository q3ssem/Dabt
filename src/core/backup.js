export const BACKUP_SCHEMA = 'dabt-pro-full-backup';
export const BACKUP_VERSION = 1;
const PREFIX = 'dabt';
const MAX_BYTES = 5 * 1024 * 1024;

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function createFullBackup(storage = globalThis.localStorage) {
  if (!storage) throw new Error('storage-unavailable');
  const data = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (typeof key === 'string' && key.startsWith(PREFIX)) data[key] = storage.getItem(key);
  }
  return JSON.stringify({ schema: BACKUP_SCHEMA, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
}

export function restoreFullBackup(serialized, storage = globalThis.localStorage) {
  if (!storage) return { ok: false, reason: 'storage-unavailable' };
  if (typeof serialized !== 'string' || new TextEncoder().encode(serialized).length > MAX_BYTES) return { ok: false, reason: 'backup-too-large' };
  let backup;
  try { backup = JSON.parse(serialized); } catch { return { ok: false, reason: 'invalid-json' }; }
  if (!isObject(backup) || backup.schema !== BACKUP_SCHEMA || backup.version !== BACKUP_VERSION || !isObject(backup.data)) return { ok: false, reason: 'unsupported-schema' };
  const entries = Object.entries(backup.data);
  if (entries.length > 500 || entries.some(([key, value]) => !key.startsWith(PREFIX) || typeof value !== 'string' || value.length > MAX_BYTES)) return { ok: false, reason: 'invalid-data' };
  // Validate JSON-valued app records before changing any existing data.
  for (const [key, value] of entries) {
    try { JSON.parse(value); } catch { return { ok: false, reason: 'invalid-record', key }; }
  }
  const previous = {};
  const keys = [];
  try {
    for (let i = 0; i < storage.length; i++) { const key = storage.key(i); if (key?.startsWith(PREFIX)) keys.push(key); }
    for (const key of keys) previous[key] = storage.getItem(key);
    keys.forEach(key => storage.removeItem(key));
    entries.forEach(([key, value]) => storage.setItem(key, value));
    return { ok: true, restoredKeys: entries.length };
  } catch {
    try {
      for (let i = storage.length - 1; i >= 0; i--) { const key = storage.key(i); if (key?.startsWith(PREFIX)) storage.removeItem(key); }
      Object.entries(previous).forEach(([key, value]) => storage.setItem(key, value));
    } catch { /* best-effort rollback if browser storage is exhausted */ }
    return { ok: false, reason: 'storage-failed' };
  }
}
