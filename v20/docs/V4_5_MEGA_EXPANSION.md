# Dabt PRO v4.5 — Hand-Drawn Adventures Expansion

## Direction
Both adventures remain original 2D side-scrolling explorations with hand-inked Canvas illustration, layered environments, warm paper-like UI, outlined props and animated ambience. The visual reference is limited to broad genre qualities (expressive 2D animation, rich painted environments, parallax and tactile silhouettes); no characters, layouts, sprites, music or proprietary assets from Monster Boy are copied.

## Scope added
- Treasure Island: three new chapters — Tide Caves, Mangrove Swamp, Atlas Observatory.
- Planet Journey: three new stations — Venus, Jupiter, Neptune.
- 12 explorable scenes total, 21 authored puzzle interactions total.
- Scene-specific animated environmental layers: cave bioluminescence, mangrove roots, observatory silhouette/star marks, Venus cloud bands, Jupiter storm rings, Neptune wind ribbons and ice spires.
- Player idle/walk bob and limb motion.
- Persistent per-world scene progress and inventory names, while preserving v4 solved/journal/shard keys.
- Completion text for the final available scene in each world.

## Story progression
Treasure Island moves from the shore and forest through the storm lighthouse, then descends into tide caves, crosses the mangrove roots, and reaches the Atlas Observatory. The final observatory restores the coordinates of the island's forgotten route.

Planet Journey expands from the Moon, Mars and Saturn to Venus, Jupiter and Neptune. Each station uses a different environmental motif and a puzzle tied to a simplified scientific concept. These are game abstractions, not scientific simulators.

## Known limitations
- Rendering is procedural Canvas 2D illustration, not a final hand-painted sprite atlas.
- Player animation is procedural pose motion, not frame-by-frame character animation.
- The adventure is a side-scrolling vertical slice with authored puzzle interactions; it is not yet a full physics platformer with slopes, moving platforms, combat, voiced NPCs or cutscenes.
- No Phaser 4 migration in this build.
- Browser/device QA is required before release; local syntax and content checks do not establish device compatibility.
