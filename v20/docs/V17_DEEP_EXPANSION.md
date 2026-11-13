# Dabt PRO V17.0 — Deep Expansion

## Delivered

### Planet Journey
- Added 27 authored field missions: three per each of the nine existing planetary stations.
- Replaced the single-puzzle station interaction with a mission board and individual mission flow.
- Added per-mission persistence under `dabt17.planets.missions` while preserving the existing station completion key.
- A station is marked complete only after its three missions are solved.
- Profile progress now reports completed planetary field missions out of 27.

### Cognitive Lab
- Added eight authored practice games: causal reasoning, spatial transformation, sequence planning, probability judgement, working-memory updating, evidence literacy, attention/inhibition, and relational analogy.
- Questions are deterministic and cycle through authored banks; no random answer-index drift.
- Existing session flow records practice/assessment attempts and continues to label results as task-specific rather than IQ scores.

### Reliability correction
- Removed duplicated V16 imports and duplicate content merges from `src/app.js`.
- This prevents repeated campaign/world mutations and duplicate module binding errors.

## Validation
- Full inherited automated suite plus V17 suite: PASS.
- V17 content integrity: 27 missions and 8 games validated across levels/rounds.
- `node --check` across all JS/MJS under `src` and `qa`: PASS.
- ZIP integrity: checked at release.
- Vite build: NOT RUN successfully; `vite` is not installed (`sh: vite: not found`).
- Browser, mobile touch and visual playthrough: NOT PERFORMED.

## Limits
- The new cognitive games are practice activities, not validated psychometric instruments or diagnostic tests.
- Planetary content is an educational game model, not a full physical simulation.
