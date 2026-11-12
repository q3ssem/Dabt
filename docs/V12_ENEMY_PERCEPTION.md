# V12 — Enemy Perception & Combat Telegraph

## Implemented
- Deterministic AI transition helper separates perception decisions from Phaser movement.
- Enemy states: patrol, investigate, chase, telegraph, recover, and short search.
- Player dash and jump emit short-lived sound events with location and radius.
- Enemies investigate sound, pursue visible players, and telegraph a close-range strike.
- Alert marker colors communicate enemy state.

## Boundaries
- Sound is a gameplay event, not microphone input.
- Visibility is approximated by distance, vertical separation, and facing direction; no occlusion raycast or obstacle-aware pathfinding is claimed.
- This is a basic enemy combat loop, not a full tactical AI system.
- Browser/device playtesting remains a release gate.
