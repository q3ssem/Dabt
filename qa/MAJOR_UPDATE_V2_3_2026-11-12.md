# Dabt PRO v2.3 — Major Update

## New games
- Temporal Order Memory: recall an item by its serial position after encoding a sequence.
- Visual Conjunction Search: locate a target defined by a color-shape conjunction among feature-sharing distractors.
- Approximate Number Sense: estimate a dot-array numerosity without serial counting.

## Validation
- 36 catalog entries; 36 unique IDs; no missing required metadata.
- 18,000 generated questions across the three new generators (6,000 each); every item has four unique options and a valid answer index.
- Inline JavaScript syntax check: PASS.
- Existing assessment-engine v1.3 and Rule Switch regression tests: PASS.

## Scientific boundaries
These are task-specific practice activities, not clinical tests or validated IQ measures. Temporal order is a component of episodic memory (systematic review/meta-analysis: https://link.springer.com/article/10.3758/s13415-023-01140-1). Approximate numerosity is affected by grouping cues and visual layout (2024 study: https://link.springer.com/article/10.3758/s13414-024-02908-4). Search times depend on screen size, device, vision and input method.

## Not yet validated
No complete browser end-to-end run across all 36 games; no physical iOS/Android/VoiceOver testing. Historical game results are not yet proven to feed the assessment engine through a valid adapter. The v2.3 index remains a local build until the main-branch file is updated and verified.