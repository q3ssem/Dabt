# Implementation notes — parallel foundation

- `src/core/platform-state.js`: versioned shared state, defensive import validation, and isolated progress namespaces.
- `src/adventures/elemental-systems.js`: deterministic rules for elemental reactions, remote puzzle prerequisites, and boss phase selection. Integrate into Phaser scenes only through explicit encounter definitions.
- `src/games/review-matrix.js`: review gate for each cognitive activity; not a psychometric validation claim.
- `src/child/curriculum.js`: age-band interaction constraints and session-length guidance; not a validated developmental norm.
- `src/ui/accessibility.css`: focus-visible, touch target, and reduced-motion baseline.

Next integration step: replace legacy per-section progress keys gradually through explicit migrations. Do not delete legacy keys until a successful export/import and rollback test has passed.
