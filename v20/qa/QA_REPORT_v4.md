# QA Report — Dabt PRO v4

## Static checks
- JavaScript syntax: run `node --check src/handdrawn-adventure.js`.
- HTML structure: confirm canvas, controls, pause layer, puzzle modal and navigation links exist.
- Content integrity: 6 scenes, 9 puzzles, each puzzle has 4 options and a valid integer answer index.
- Save namespace: prototype uses `dabt4.*`, separate from v3.5.
- Route gating: next scene requires all puzzles in current scene to be solved.
- No external game engine or runtime CDN dependency. Font stylesheet may use Google Fonts; system fallback is available offline.

## Manual QA required
- Run through local HTTP server in desktop Chrome/Safari/Firefox.
- Verify movement, jump, collision feel, E interaction and puzzle gating.
- Verify touch controls on iOS/Android.
- Verify save/restore after reload and separate progress per world.
- Check Arabic layout, text clipping, contrast, keyboard focus and reduced-motion behavior.

## Limitations
This report records static checks and intended manual test cases. It does not claim real-device QA or complete browser automation. Procedural illustrations are a style prototype, not final hand-painted production assets.
