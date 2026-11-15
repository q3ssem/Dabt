(function (root) {
  'use strict';
  const TASHKEEL = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
  const PUNCT = /[،؛؟!.,:؛()[\]{}"'«»]/g;
  function normalizeAnswer(value) {
    return String(value == null ? '' : value)
      .normalize('NFC')
      .replace(/[ـ]/g, '')
      .replace(TASHKEEL, '')
      .replace(PUNCT, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  // Only the initial-letter task canonicalises hamza-on-alif, as specified by its source policy.
  function normalizeInitial(value) {
    const s = normalizeAnswer(value);
    if (!s) return '';
    return ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا' })[s[0]] ? ({ 'أ': 'ا', 'إ': 'ا', 'آ': 'ا' })[s[0]] + s.slice(1) : s;
  }
  function buildIndex(words) {
    const byId = new Map(), byMatch = new Map();
    (words || []).forEach(word => {
      byId.set(word.id, word);
      const key = normalizeAnswer(word.match || word.word);
      if (!byMatch.has(key)) byMatch.set(key, []);
      byMatch.get(key).push(word);
    });
    return { byId, byMatch };
  }
  function countIds(ids, byId) { return (ids || []).filter(id => byId.has(id)).length; }
  function eligiblePrompts(prompts, byId, mode) {
    return (prompts || []).filter(p => {
      if (p.mode !== mode) return false;
      if (mode === 'alternating') {
        const groups = Object.values(p.accepted_ids_by_category || {});
        return groups.length === 2 && groups.every(ids => countIds(ids, byId) >= 10);
      }
      return countIds(p.accepted_ids, byId) >= 10;
    });
  }
  function advancedForPrompt(prompt, words, mode) {
    const adv = (words || []).filter(w => w.tier === 'advanced');
    if (mode === 'semantic') return adv.filter(w => w.domain_id === prompt.domain_id);
    if (mode === 'alternating') {
      const ids = new Set(Object.keys(prompt.accepted_ids_by_category || {}));
      return adv.filter(w => ids.has(w.category_id));
    }
    if (mode === 'initial_letter') {
      const target = normalizeInitial(prompt.initial_letter);
      return adv.filter(w => normalizeInitial(w.match || w.word).startsWith(target));
    }
    return [];
  }
  function makeAllowed(prompt, words, index, level) {
    let ids = [];
    if (prompt.mode === 'alternating') ids = Object.values(prompt.accepted_ids_by_category || {}).flat();
    else ids = prompt.accepted_ids || [];
    const allowed = new Set(ids.filter(id => index.byId.has(id)));
    if ((level || 1) >= 4) advancedForPrompt(prompt, words, prompt.mode).forEach(w => allowed.add(w.id));
    const groups = prompt.mode === 'alternating'
      ? Object.entries(prompt.accepted_ids_by_category || {}).map(([categoryId, groupIds]) => [categoryId, new Set(groupIds.filter(id => index.byId.has(id)))])
      : [];
    if (prompt.mode === 'alternating' && (level || 1) >= 4) {
      advancedForPrompt(prompt, words, 'alternating').forEach(w => {
        const g = groups.find(([categoryId]) => categoryId === w.category_id);
        if (g) { g[1].add(w.id); allowed.add(w.id); }
      });
    }
    return { allowed, groups };
  }
  function classifyAnswer(args) {
    const { text, prompt, index, allowed, groups, used, acceptedCount = 0 } = args;
    const key = normalizeAnswer(text);
    if (!key) return { status: 'empty' };
    const matches = index.byMatch.get(key);
    if (!matches || !matches.length) return { status: 'unknown' };
    // Normalised collisions are preserved rather than silently merged; these require a clear ID match.
    const word = matches.find(w => allowed.has(w.id)) || matches[0];
    if (used.has(word.id)) return { status: 'duplicate', word };
    if (prompt.mode === 'alternating') {
      const expected = groups[acceptedCount % 2];
      if (!expected) return { status: 'invalid_prompt', word };
      if (word.category_id !== expected[0] || !expected[1].has(word.id)) {
        const other = groups.find(g => g[0] === word.category_id && g[1].has(word.id));
        return { status: other ? 'out_of_turn' : (word.tier === 'advanced' && !allowed.has(word.id) ? 'advanced_locked' : 'wrong_group'), word, expectedCategoryId: expected[0] };
      }
    } else if (!allowed.has(word.id)) {
      return { status: word.tier === 'advanced' ? 'advanced_locked' : 'wrong_group', word };
    }
    return { status: 'accepted', word };
  }
  root.MINDLAB_HASAD_ENGINE = { normalizeAnswer, normalizeInitial, buildIndex, eligiblePrompts, advancedForPrompt, makeAllowed, classifyAnswer };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MINDLAB_HASAD_ENGINE;
})(typeof globalThis !== 'undefined' ? globalThis : this);
