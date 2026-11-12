# Dabt PRO v4 — Gameplay and World Design

## Treasure Island: Atlas of Ash
A hand-painted 2D side-view exploration adventure. The player physically walks through the scene, approaches props and uses an inspect action. The six-chapter narrative remains the source of truth; this playable slice implements three environments: the forgetting beach, the forest of lost names and the lighthouse without light. Each scene contains contextual interactables with authored puzzle text, answer logic and consequences. Progress is stored locally.

### Scene loop
Explore → notice a prop → inspect → read story clue → solve the embedded puzzle → add clue to journal → unlock the next route. Scene exits remain locked until all authored puzzles in the current scene are solved.

## Planet Journey: Echoes of Orbit
A parallel 2D exploration campaign with a different visual language. The prototype slice includes the Moon, Mars and Saturn. Their mechanics are tied to their environment: interpreting shadow direction, resource/shelter decisions during dust storm, and selecting a low-density ring gap in a simplified training scenario.

### Science boundary
The scenes are educational abstractions, not physics simulations. Puzzle explanations must distinguish simplified game assumptions from real planetary conditions. Never teach unsafe real-world actions or imply a game score measures scientific aptitude.

## Controls
- Left/right arrows or A/D: move.
- Space: jump.
- E: inspect/interact.
- Escape: pause.
- Touch buttons: left, right, jump and inspect.
- Approaching the edge exits only after the current scene's puzzles are complete.

## Save model
Local keys `dabt4.solved`, `dabt4.journal`, `dabt4.shards`. Data is scoped to this prototype and does not overwrite v3.5 player records.

## Next production milestones
1. Replace procedural stand-ins with original illustrated character/prop atlases.
2. Add real tile collision, slopes, platforms, ladders, moving platforms and checkpoint logic.
3. Add animated NPCs, dialogue portraits, inventory and reusable tools.
4. Build all six island chapters and all nine planet stations as traversable scenes.
5. Add original soundscape, ambient layers and adaptive subtitles.
6. Run browser/device and accessibility QA before merging into the main platform.
