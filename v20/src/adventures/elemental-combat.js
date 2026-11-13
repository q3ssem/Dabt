/**
 * Pure elemental combat resolver. Phaser applies the resulting status duration
 * and presentation; this module validates which element affects the guardian.
 */
const EFFECTS = {
  water: { kind: 'slow', durationMs: 4200 },
  light: { kind: 'stun', durationMs: 1900 },
  energy: { kind: 'disable', durationMs: 2600 },
  fire: { kind: 'damage', damage: 1 }
};
export function resolveElementalCombat({ element, hp = 2, defeated = false } = {}) {
  if (defeated) return { ok: false, reason: 'الحارس هُزم بالفعل.' };
  const effect = EFFECTS[element];
  if (!effect) return { ok: false, reason: 'هذا العنصر غير معروف.' };
  if (effect.kind !== 'damage') return { ok: true, ...effect, hp, defeated: false };
  const nextHp = Math.max(0, hp - effect.damage);
  return { ok: true, ...effect, hp: nextHp, defeated: nextHp === 0 };
}
