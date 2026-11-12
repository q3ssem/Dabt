# Claude implementation brief — v4.5

Continue from this exact local v4.5 branch. Do not upload to GitHub.

## Non-negotiable art direction
Original hand-drawn-inspired 2D side-scrolling art: expressive silhouettes, inked outlines, painted gradients/textures, parallax layers, distinct biome palettes and restrained animation. Use Monster Boy and the Cursed Kingdom only as a high-level quality reference. Do not copy its assets, characters, level layouts, UI, animations or distinctive compositions.

## Current playable scope
- `adventure-2d.html` loads `src/handdrawn-adventure.js` and `src/handdrawn.css`.
- 6 island scenes and 6 planetary scenes.
- 21 authored puzzle interactions.
- Keyboard and touch movement, jump, inspect, pause.
- Local persistence for solved objects, journal, shards, inventory and per-world scene progress.

## Next engineering work
1. Replace procedural hero drawing with a bespoke original sprite sheet (idle, walk, run, jump, fall, inspect) and animation state machine.
2. Create original parallax painted backgrounds and tile/prop atlases for all 12 scenes.
3. Implement NPC dialogue, branching quest flags and item-use interactions.
4. Replace multiple-choice where appropriate with in-world mechanisms: rotate mirrors, set valves, weigh objects, route light, align star discs and sequence control panels.
5. Add checkpoints, scene transitions, accessibility options and save migration.
6. Add browser automation tests and test touch controls on real mobile devices.
7. Migrate to Phaser 4 only after the asset and gameplay contracts are defined; preserve the current Canvas build as a reference until parity is verified.

## Acceptance criteria
No broken legacy saves; all 12 scenes reachable; all 21 puzzle answers validated; one-time rewards only; scene progress survives reload; touch and keyboard work; reduced-motion preference respected; no copied proprietary assets.
