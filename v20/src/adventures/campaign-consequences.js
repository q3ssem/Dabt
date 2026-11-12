/** Persistent, branch-specific consequences for revisiting a completed world. */
export const ENDING_CONSEQUENCES = {
  restore: {
    id: 'restore',
    label: 'إعادة التوازن',
    atmosphere: 'renewal',
    suppressHazards: true,
    guideEpilogue: 'بعد إعادة التوازن، هدأت الممرات وعادت الأجهزة إلى نبضها الطبيعي. لم تعد مصائد هذا العالم نشطة.',
    journalEpilogue: 'أثر القرار: استعادة التوازن عطّلت مسارات الخطر في هذا العالم.'
  },
  preserve: {
    id: 'preserve',
    label: 'حفظ السر',
    atmosphere: 'veiled',
    suppressHazards: false,
    guideEpilogue: 'اخترت حفظ السر. بقيت الممرات القديمة كما هي، لكن أصداء الأطلس أصبحت دليلاً لمن يصغي إليها.',
    journalEpilogue: 'أثر القرار: بقي العالم محمياً بالسر، وظلت مساراته ومخاطره القديمة قائمة.'
  }
};

export function getCampaignConsequence(ending) {
  return ENDING_CONSEQUENCES[ending] || null;
}

export function resolveAreaConsequence({ ending, hazardActive = true, toolCharges = 0 } = {}) {
  const consequence = getCampaignConsequence(ending);
  if (!consequence) return { ending: null, hazardActive, toolCharges, changed: false };
  return {
    ending: consequence.id,
    hazardActive: consequence.suppressHazards ? false : hazardActive,
    toolCharges,
    changed: consequence.suppressHazards && hazardActive
  };
}
