/** Age-band content scaffolding; actual child-facing copy remains authored per activity. */
export const CHILD_AGE_BANDS = Object.freeze([
  { id:'early', label:'4–5 سنوات', interaction:'tap-and-match', maxChoices:2, suggestedMinutes:5, reading:'adult-supported' },
  { id:'foundation', label:'6–7 سنوات', interaction:'tap-sequence', maxChoices:3, suggestedMinutes:7, reading:'emerging-reader' },
  { id:'builder', label:'8–10 سنوات', interaction:'sort-and-plan', maxChoices:4, suggestedMinutes:10, reading:'independent' },
  { id:'explorer', label:'11–12 سنة', interaction:'multi-step-reasoning', maxChoices:5, suggestedMinutes:12, reading:'independent' },
]);
export function getChildBand(id) { return CHILD_AGE_BANDS.find(x => x.id === id) || CHILD_AGE_BANDS[1]; }
export function childActivityPolicy({ ageBand, choices, hasTimer = false, hasAudio = false }) {
  const band = getChildBand(ageBand);
  return { validChoiceCount:Number.isInteger(choices) && choices >= 2 && choices <= band.maxChoices,
    timerNeedsOptIn:Boolean(hasTimer), audioAvailable:Boolean(hasAudio),
    recommendedMinutes:band.suggestedMinutes, interaction:band.interaction,
    avoidTimePressure:band.id === 'early' || band.id === 'foundation' };
}

/** Trim answer choices to the selected age band while always retaining the keyed answer. */
export function adaptChoicesForAgeBand(question, ageBand) {
  if (!question || !Array.isArray(question.options) || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) {
    return { ...question, options:[], correct:-1, valid:false };
  }
  const limit = getChildBand(ageBand).maxChoices;
  const indices = Array.from({length:question.options.length},(_,i)=>i).slice(0,limit);
  if (!indices.includes(question.correct)) indices[indices.length-1] = question.correct;
  const unique = [...new Set(indices)];
  const correct = unique.indexOf(question.correct);
  return { ...question, options:unique.map(i=>question.options[i]), correct, valid:unique.length>=2 };
}
