# Dabt PRO v6.0 — Campaign & Relic Systems

## Scope delivered

- Expanded Treasure Island from 3 to 6 playable chapter areas.
- Expanded Planet Journey from 3 to 9 stations.
- Added 9 authored areas (3 island + 6 planetary), each with three authored encounters.
- Total campaign content: 15 areas and 45 puzzle encounters.
- Added persistent collectible relics in each area, with distinct item names per world.
- Added proximity-based pickup interaction, collection feedback, persistent inventory, journal listing, and a world-completion relic bonus.
- Moved save namespace to `dabt-pro-phaser-v60` to avoid collisions with earlier experimental save formats.
- Kept existing six areas and their authored puzzles intact.

## Controls

- A/D or arrows: move.
- Space/W: jump.
- E: interact with puzzle, guide, exit, or relic.
- J/I: open the expedition journal and relic record.
- Esc: close overlay or return to the menu.

## Important limitations

- Phaser 4 runtime is declared in package.json but dependency installation and Vite production build were not run in this environment.
- The new areas reuse the existing six hand-drawn background plates with different authored level layouts and puzzle narratives. They do not yet have nine bespoke painted backgrounds.
- Puzzle interactions remain authored multiple-choice narrative encounters, not yet fully simulated physics/mechanical contraptions.
- Relics are persistent collectibles, but they do not yet unlock unique tools or branch the narrative.
- Browser and physical-device playthrough remains outstanding.

## Local validation

- Node syntax check on `engine-phaser/src/main.js`.
- Existing Phaser scaffold test.
- Existing v5.5 source coverage test.
- v6 campaign test for nine added areas, relic persistence, journal and completion reward.

This is a local development build, not a production release and not published to GitHub.
