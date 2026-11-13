// Profile storage for V21 with reversible migration from earlier versions.
// Legacy keys are never deleted or rewritten; they are copied into a backup and
// summarised in profile.legacy. Old progress is NOT counted as a solution of the new puzzles.

export const PROFILE_KEY = 'dabt21.profile';
export const PREMIGRATION_KEY = 'dabt21.backup.premigration';
export const PRERESTORE_KEY = 'dabt21.backup.prerestore';
export const SCHEMA = 'dabt21-profile';
export const VERSION = 1;

const listeners = new Set();
export function onSaveState(fn) { listeners.add(fn); return () => listeners.delete(fn); }
let lastError = null;
export function saveError() { return lastError; }

export function defaultProfile() {
  return {
    schema: SCHEMA, version: VERSION, createdAt: new Date().toISOString(), updatedAt: null,
    settings: { reduceMotion: false, highContrast: false, textSize: 1, sound: true, narration: false, digits: 'arabic', timeFree: true },
    treasure: { results: {}, drafts: {}, chapterNotes: {}, sealsAwarded: [], finalChoice: null, decisions: {} },
    planets: { results: {}, drafts: {}, cardsAwarded: [], finalChoice: null, decisions: {} },
    lab: { sessions: [], results: {}, drafts: {} },
    child: { ageBand: null, results: {}, drafts: {}, works: {}, decisions: {} },
    legacy: null, last: null,
  };
}

function storage() { return globalThis.localStorage; }

export function legacyKeys(ls = storage()) {
  const out = [];
  for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && /^dabt/i.test(k) && !k.startsWith('dabt21.')) out.push(k); }
  return out.sort();
}

const LAB_LEGACY = { 'rule-shift': 'rule-switch', 'attention-inhibition': 'stroop', 'route-planner': 'planning', 'sequence-planning': 'planning', 'spatial-transform': 'visual-rotation', 'probability-judgement': 'probability-lab', 'working-memory-update': 'working-update', 'evidence-literacy': 'evidence-check' };

export function summariseLegacy(raw) {
  const parse = k => { try { return JSON.parse(raw[k]); } catch { return null; } };
  const count = k => { const v = parse(k); return Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : 0; };
  const sessions = parse('dabt.pro.v3.sessions');
  const lab = Array.isArray(sessions) ? sessions.map(s => ({
    legacyGameId: s.gameId, mappedGameId: LAB_LEGACY[s.gameId] || s.gameId, mode: s.mode, startedAt: s.startedAt,
    accuracy: s.metrics?.accuracy ?? null, attempts: s.metrics?.attempts ?? null, rules: 'legacy',
  })) : [];
  return {
    keys: Object.keys(raw),
    treasureSolvedOld: count('dabt35.treasure.solved') + count('dabt4.solved'),
    planetsSolvedOld: count('dabt35.planets.solved') + count('dabt17.planets.missions'),
    childCompletedOld: count('dabt35.child.completed'),
    childAgeOld: raw['dabt35.child.age'] || null,
    labSessions: lab,
    note: 'سجلات الإصدار السابق محفوظة للأرشفة فقط، ولا تُحتسب حلًا لأي لغز جديد لأن الألغاز والقواعد تغيرت.',
  };
}

export function loadProfile(ls = storage()) {
  let p = null;
  try { p = JSON.parse(ls.getItem(PROFILE_KEY) || 'null'); } catch { p = null; }
  if (p && p.schema === SCHEMA) return { profile: upgrade(p), migrated: false };
  // first run of V21: snapshot legacy data, never modify it
  const raw = {};
  for (const k of legacyKeys(ls)) raw[k] = ls.getItem(k);
  const profile = defaultProfile();
  if (Object.keys(raw).length) {
    try { if (!ls.getItem(PREMIGRATION_KEY)) ls.setItem(PREMIGRATION_KEY, JSON.stringify({ createdAt: new Date().toISOString(), raw })); } catch { /* backup failure is reported by the next save */ }
    profile.legacy = { importedAt: new Date().toISOString(), ...summariseLegacy(raw) };
    const age = raw['dabt35.child.age'];
    // old age labels differ; keep only when the identifier still exists
    if (['early', 'foundation', 'builder', 'explorer'].includes(age)) profile.child.ageBand = age;
  }
  return { profile, migrated: Object.keys(raw).length > 0 };
}

function upgrade(p) {
  const d = defaultProfile();
  for (const k of Object.keys(d)) if (p[k] == null) p[k] = d[k];
  for (const sec of ['treasure', 'planets', 'lab', 'child']) for (const k of Object.keys(d[sec])) if (p[sec][k] == null) p[sec][k] = d[sec][k];
  p.settings = { ...d.settings, ...p.settings };
  return p;
}

export function saveProfile(profile, ls = storage()) {
  profile.updatedAt = new Date().toISOString();
  try {
    if (globalThis.__dabtFailSave) throw new Error('simulated storage failure');
    ls.setItem(PROFILE_KEY, JSON.stringify(profile));
    const check = ls.getItem(PROFILE_KEY);
    if (!check) throw new Error('write not persisted');
    lastError = null; listeners.forEach(f => f({ ok: true }));
    return true;
  } catch (e) {
    lastError = e; listeners.forEach(f => f({ ok: false, error: e }));
    return false;
  }
}

export function exportBackup(profile) {
  return JSON.stringify({ schema: 'dabt21-backup', version: VERSION, exportedAt: new Date().toISOString(), profile }, null, 2);
}

export function validateBackup(obj) {
  if (!obj || obj.schema !== 'dabt21-backup' || !obj.profile || obj.profile.schema !== SCHEMA) return false;
  for (const s of ['treasure', 'planets', 'lab', 'child']) if (typeof obj.profile[s] !== 'object') return false;
  return true;
}

export function restoreBackup(text, current, ls = storage()) {
  let obj; try { obj = JSON.parse(text); } catch { return { ok: false, reason: 'json' }; }
  if (!validateBackup(obj)) return { ok: false, reason: 'schema' };
  try { ls.setItem(PRERESTORE_KEY, JSON.stringify({ createdAt: new Date().toISOString(), profile: current })); } catch { return { ok: false, reason: 'rollback-backup' }; }
  const profile = upgrade(obj.profile);
  return saveProfile(profile, ls) ? { ok: true, profile } : { ok: false, reason: 'save' };
}

export function undoRestore(ls = storage()) {
  try { const b = JSON.parse(ls.getItem(PRERESTORE_KEY) || 'null'); if (!b) return null; const p = upgrade(b.profile); return saveProfile(p, ls) ? p : null; } catch { return null; }
}

// Records one result per case. Replays never duplicate rewards; a later unassisted
// solve upgrades an assisted one, never the other way around.
export function recordResult(sectionState, id, { assisted, attempts, hintsUsed }) {
  const prev = sectionState.results[id];
  const status = assisted ? 'assisted' : 'solved';
  if (!prev) { sectionState.results[id] = { status, at: new Date().toISOString(), attempts, hintsUsed, replays: 0 }; return { first: true }; }
  prev.replays = (prev.replays || 0) + 1;
  if (prev.status === 'assisted' && status === 'solved') { prev.status = 'solved'; prev.upgradedAt = new Date().toISOString(); }
  return { first: false };
}
