# V14.0 — Elemental Guardian Phases

## Gameplay contract
- Phase 1 (3 HP): Water is the required weakness.
- Phase 2 (2 HP): Light is the required weakness.
- Phase 3 (1 HP): Fire is the required weakness.
- A correct element only damages the guardian during its exposed window and within interaction range.
- A wrong element does not consume HP; the hint names the required element.
- Energy can interrupt one telegraphed attack per battle. It does not damage the guardian.
- The existing guardian-defeated save flag remains the persistence mechanism. The one-time energy interrupt is a battle-local resource and resets if the battle is restarted.

## Controls
- 1: Water; 2: Light; 3: Energy; 4: Fire.
- E: Apply the selected element during the exposed window; or use Energy during a telegraph to cancel one attack.
- Touch controls: choose an element, then press E.

## Validation boundary
The elemental rules are pure functions covered by deterministic Node tests. Phaser runtime, collision feel, touch ergonomics, and browser rendering still require a real browser/device playthrough.
