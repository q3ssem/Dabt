# Dabt PRO v9.0 — Living Environment & Tool Simulation

## Core design
The environment now responds to player movement, hazards, checkpoints and tool use. This is a systems-focused major update layered on the v8 area art and secrets.

## Implemented systems
- **Moving platform:** a tween-driven platform with Arcade Physics collision, moving between authored positions.
- **Timed hazard lane:** a pulsing danger strip; contact triggers knockback and checkpoint respawn.
- **Persistent checkpoints:** activate the green star/checkpoint or use E nearby. The checkpoint is stored per area and restored on reload.
- **Tool charges:** each world tool receives three charges when its side quest is completed. Charges persist.
- **Environmental device:** at the far side of each area, use E. Without a field tool it remains locked. With the tool, spend one charge to deactivate the hazard and materialize a collision-enabled shortcut platform.
- **Journal:** tool charge count appears with quest and discovery information.
- **Save migration:** namespace advanced to `dabt-pro-phaser-v90`; v8.0 is the first migration source, with v7.0/v6.0 fallback retained.

## Controls
Movement: arrows/A-D; jump: Space/W/touch; interact: E/touch; special movement: Shift/star touch; journal: J/I; field hint: T.

## Validation
- JavaScript syntax check: PASS
- All previous QA scripts retained.
- New `test_v90_environment_simulation.mjs`: PASS.
- ZIP integrity check: PASS.

## Explicit limitations
- The moving platform and hazard are scripted Arcade Physics objects; this is not a full fluid/temperature/gravity simulation.
- Device effects are deterministic per area and do not yet branch the story.
- No npm install, Vite production build, browser playthrough, or physical device QA was run.
