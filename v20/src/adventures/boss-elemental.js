/** Pure rules for the guardian's three elemental phases. */
export const BOSS_PHASES = {
  1: { weakness: 'water', label: 'الماء', hint: 'الماء يطفئ درع الحارس الأول' },
  2: { weakness: 'light', label: 'الضوء', hint: 'الضوء يكشف شقوق الدرع الثاني' },
  3: { weakness: 'fire', label: 'النار', hint: 'النار تكسر القلب المتقد في المرحلة الأخيرة' }
};

export function resolveBossElement({ phase = 1, element, exposed = false, attackLock = false, energyInterruptUsed = false, hp = 3 } = {}) {
  if (hp <= 0) return { ok: false, reason: 'الحارس هُزم بالفعل.' };
  if (!BOSS_PHASES[phase]) return { ok: false, reason: 'مرحلة الحارس غير صالحة.' };
  if (element === 'energy' && attackLock && !exposed) {
    if (energyInterruptUsed) return { ok: false, reason: 'استخدمت الطاقة لإيقاف هجوم الحارس بالفعل.' };
    return { ok: true, action: 'interrupt', energyInterruptUsed: true, message: 'أوقفت الطاقة شحنة الهجوم!' };
  }
  if (!exposed) return { ok: false, reason: 'انتظر انكشاف قلب الحارس.' };
  const weakness = BOSS_PHASES[phase].weakness;
  if (element !== weakness) return { ok: false, reason: `نقطة الضعف الحالية هي ${BOSS_PHASES[phase].label}.` };
  const nextHp = Math.max(0, hp - 1);
  return { ok: true, action: 'damage', element, hp: nextHp, defeated: nextHp === 0, nextPhase: nextHp === 0 ? 3 : nextHp === 1 ? 3 : 2 };
}
