/** Deterministic elemental puzzle rules shared by island and planetary encounters. */
export const ELEMENTS = Object.freeze({
  water: { label:'الماء', counters:['fire'], enables:['steam','conductive-flow'], blocks:['dust'] },
  fire: { label:'النار', counters:['ice','vines'], enables:['heat','thermal-current'], blocks:['darkness'] },
  light: { label:'الضوء', counters:['shadow'], enables:['reflection','photosynthesis','signal'], blocks:['concealment'] },
  energy: { label:'الطاقة', counters:['dormant-machine'], enables:['circuit','magnetic-field','lift'], blocks:['power-loss'] },
});

export function resolveElementInteraction({ element, target, state = {} }) {
  if (!Object.hasOwn(ELEMENTS, element) || typeof target !== 'string' || !target) {
    return { ok:false, changed:false, reason:'invalid-interaction', state:{ ...state } };
  }
  const rules = ELEMENTS[element];
  const effects = {
    water: { steam: target === 'hot-surface', 'conductive-flow': target === 'circuit-channel', 'dust-clear': target === 'dust-cloud' },
    fire: { heat: target === 'frozen-lock', 'thermal-current': target === 'thermal-vent', 'vine-clear': target === 'thorn-vines' },
    light: { reflection: target === 'mirror', photosynthesis: target === 'seed-pod', signal: target === 'signal-prism' },
    energy: { circuit: target === 'dormant-machine', 'magnetic-field': target === 'magnetic-rail', lift: target === 'lift-platform' },
  }[element];
  const effect = Object.keys(effects).find(key => effects[key]);
  if (!effect) return { ok:false, changed:false, reason:'no-compatible-reaction', state:{ ...state } };
  const next = { ...state, [target]:effect };
  return { ok:true, changed:true, element, target, effect, state:next };
}

export function evaluateLinkedPuzzle({ localSolved = [], requiredLocal = [], remoteFlags = [], worldFlags = {} }) {
  const localReady = requiredLocal.every(id => localSolved.includes(id));
  const remoteReady = remoteFlags.every(id => worldFlags[id] === true);
  return { unlocked:localReady && remoteReady, localReady, remoteReady,
    missingLocal:requiredLocal.filter(id => !localSolved.includes(id)),
    missingRemote:remoteFlags.filter(id => worldFlags[id] !== true) };
}

export function evaluateBossPhase({ healthRatio, phase = 1, exposed = false }) {
  const hp = Math.max(0, Math.min(1, Number(healthRatio)));
  if (!Number.isFinite(hp)) return { phase, vulnerable:false, pattern:'invalid-state' };
  const nextPhase = hp <= 0 ? 3 : hp <= 0.35 ? 3 : hp <= 0.7 ? 2 : 1;
  return { phase:Math.max(phase,nextPhase), vulnerable:Boolean(exposed),
    pattern: nextPhase === 1 ? 'telegraph-and-sweep' : nextPhase === 2 ? 'area-denial-and-dash' : 'final-combination' };
}
