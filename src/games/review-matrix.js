/** Editorial review contract: task-specific practice is not a diagnostic instrument. */
export const COGNITIVE_REVIEW_CRITERIA = Object.freeze([
  'construct-definition','evidence-review','nearby-task-review','answer-key-validation',
  'difficulty-progression','accessibility-review','practice-assessment-separation','interpretation-limits'
]);
export const INTERPRETATION_NOTICE = 'نتائج هذه الأنشطة تصف الأداء في المهمة نفسها، ولا تمثل تشخيصاً أو درجة ذكاء معيارية.';
export function validateGameReview(review) {
  const missing = COGNITIVE_REVIEW_CRITERIA.filter(key => review?.[key] !== true);
  return { ready:missing.length === 0, missing };
}
export function summarizeSessionMode(sessions = []) {
  return {
    practice: sessions.filter(s => s.mode === 'practice').length,
    assessment: sessions.filter(s => s.mode === 'assessment').length,
    other: sessions.filter(s => !['practice','assessment'].includes(s.mode)).length,
  };
}
