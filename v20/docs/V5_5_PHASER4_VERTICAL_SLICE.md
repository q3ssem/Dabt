# Dabt PRO v5.5 — Phaser 4 Adventure Vertical Slice

## What changed

The previous Phaser entry point was a static migration placeholder. v5.5 replaces it with an interactive runtime implementation:

- Arabic adventure selection menu.
- Phaser Arcade Physics platform movement, collision, jumping and camera follow.
- Keyboard and touch controls.
- Two separate adventure campaigns.
- Three playable areas in each campaign: Island beach/cave/observatory and Moon/Mars/Neptune.
- Three authored puzzle interactions per area (18 total).
- Puzzle narrative lead-in, question, answer choices and explanation.
- A guide character in each adventure with contextual dialogue.
- A journal overlay listing evidence already discovered in the current area.
- Seal collection, area unlock progression and local persistence.
- Original explorer spritesheet and six hand-drawn environment assets.

## Run locally

```bash
cd engine-phaser
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The Phaser entry point is `engine-phaser/index.html`.

## Controls

- Left/right arrows or A/D: move
- Space or W: jump
- E: interact
- J: open the journey journal
- Esc: close puzzle / return to the menu
- Touch buttons: move, jump and interact

## Validation performed in this environment

- `node --check engine-phaser/src/main.js`
- `node qa/test_phaser_scaffold.mjs`
- `node qa/test_phaser_v55.mjs`
- Static checks for Phaser 4 dependency, scene classes, physics calls, controls, 18 puzzle records, six area definitions, save progression and asset presence.

## Not yet verified

The environment does not have the Phaser package installed and package-network installation was not available for a full Vite build or browser playthrough. Therefore this package is a source-complete playable implementation target, but a successful `npm run build` and real-device acceptance test remain outstanding. Do not mark it as production-released until those checks pass.

## Scope

This is a vertical slice expansion with six areas and 18 authored puzzle interactions. It is not yet the full final six-chapter narrative with all planned NPC dialogue, inventory combinations, boss encounters, cutscenes, audio score, or all nine planetary stops.
