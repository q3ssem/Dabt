/** Shared, versioned progression state for the six parallel Dabt PRO workstreams. */
export const PLATFORM_STATE_KEY = 'dabt-pro-platform-v1';
export const PLATFORM_SCHEMA_VERSION = 1;
export const WORKSTREAMS = Object.freeze(['adventures','art','cognitive-lab','child-worlds','shared-platform','release-quality']);

const emptyState = () => ({
  schema: 'dabt-pro-platform-state', version: PLATFORM_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  profile: { locale: 'ar-SA', direction: 'rtl', reducedMotion: false },
  progress: { adventures: {}, childWorlds: {}, cognitiveLab: {} },
  story: { flags: {}, choices: {} },
  accessibility: { narration: false, highContrast: false },
});

function isRecord(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function sanitizeState(value) {
  if (!isRecord(value) || value.schema !== 'dabt-pro-platform-state' || value.version !== PLATFORM_SCHEMA_VERSION) return null;
  const base = emptyState();
  for (const key of ['profile','progress','story','accessibility']) {
    if (isRecord(value[key])) base[key] = { ...base[key], ...value[key] };
  }
  for (const key of ['adventures','childWorlds','cognitiveLab']) {
    if (!isRecord(base.progress[key])) base.progress[key] = {};
  }
  if (!isRecord(base.story.flags)) base.story.flags = {};
  if (!isRecord(base.story.choices)) base.story.choices = {};
  base.updatedAt = new Date().toISOString();
  return base;
}

export function createPlatformState(storage = globalThis.localStorage) {
  let state = emptyState();
  try {
    const raw = storage?.getItem(PLATFORM_STATE_KEY);
    if (raw) state = sanitizeState(JSON.parse(raw)) || emptyState();
  } catch { state = emptyState(); }

  function persist() {
    state.updatedAt = new Date().toISOString();
    try { storage?.setItem(PLATFORM_STATE_KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }
  function setProgress(track, id, value) {
    if (!['adventures','childWorlds','cognitiveLab'].includes(track) || typeof id !== 'string' || !id.trim()) return false;
    state.progress[track][id] = value;
    return persist();
  }
  function setStoryFlag(id, value = true) {
    if (typeof id !== 'string' || !id.trim()) return false;
    state.story.flags[id] = Boolean(value); return persist();
  }
  function recordChoice(id, choice) {
    if (typeof id !== 'string' || !id.trim() || typeof choice !== 'string' || !choice.trim()) return false;
    state.story.choices[id] = choice; return persist();
  }
  function exportState() { return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2); }
  function importState(serialized) {
    let parsed;
    try { parsed = JSON.parse(serialized); } catch { return { ok:false, reason:'invalid-json' }; }
    const next = sanitizeState(parsed);
    if (!next) return { ok:false, reason:'unsupported-schema' };
    const previous = state; state = next;
    if (!persist()) { state = previous; return { ok:false, reason:'storage-failed' }; }
    return { ok:true };
  }
  return {
    getState: () => structuredClone(state), setProgress, setStoryFlag, recordChoice,
    exportState, importState, persist,
  };
}
