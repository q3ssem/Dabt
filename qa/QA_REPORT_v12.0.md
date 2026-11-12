# QA Report — V12.0 Enemy Perception & Combat Telegraph

## Automated checks
- `node --check` across all 38 `.js` and `.mjs` files: PASS.
- `npm test` in `engine-phaser`: PASS (11 test scripts, including inherited campaign, elemental, save, boss/story, and new enemy AI checks).
- Deterministic AI transition tests cover patrol, sound investigation, visual chase, lost-target investigation, attack telegraph, recovery, and search timeout.
- ZIP integrity check: performed after packaging.

## Implemented in V12
- Enemy states: patrol, investigate, chase, telegraph, recover, and search.
- Dash and jump emit gameplay noise events; nearby enemies can investigate their location.
- Basic vision approximation uses distance, vertical separation, and facing direction.
- Close-range attacks include a telegraph window and recovery delay.
- State decisions are separated into a pure helper module for deterministic testing.

## Not tested / limitations
- No `npm install` or Vite production build was completed; dependencies are not installed in this environment.
- No real browser playthrough or physical iOS/Android test was performed.
- Vision does not yet use obstacle occlusion or raycast checks; enemies do not perform navigation around complex geometry.
- Audio sensing is an in-game noise event, not microphone capture.
- Combat remains a compact patrol/investigate/chase/strike loop, not advanced tactical group AI.
