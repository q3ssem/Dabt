# Dabt PRO v8.0 — World Interactivity & Art Direction

## Release intent
A major world-building pass: environments are no longer only backdrops. Each area now contains a two-part environmental sigil puzzle that changes traversal and reveals a hidden cache.

## New systems
- **15 distinct area backdrops:** bespoke SVG vector scenes for the six island chapters and nine planetary areas. Each scene has its own palette and landmark motif. These are authored vector illustrations, not hand-painted raster art.
- **Environmental sigils:** two inactive sigils in each area. Activate both using E.
- **Secret bridge:** activating both sigils materializes a collision-enabled bridge and reveals a cache.
- **Secret cache:** interact with it to record a persistent discovery. Its state survives reloads.
- **World-specific movement:** island tide-burst dash and planetary low-gravity jump/drift, with keyboard Shift and a touch control.
- **Journal integration:** tracks environmental sigils and whether the area's secret cache has been found.
- **Save migration:** advances to `dabt-pro-phaser-v80`, migrating v7.0 data (or v6.0 as fallback).

## Controls
- Move: arrows or A/D
- Jump: Space / W / touch
- Interact: E / touch
- Special movement: Shift / touch star button
- Journal: J / I
- Field tool: T

## QA
- `node --check engine-phaser/src/main.js`
- `node qa/test_v80_world_interactivity.mjs`
- All prior source/content QA scripts retained and rerun where compatible.
- SVG file presence and basic root-tag checks included.

## Honest limitations
- No Vite production build or browser/device playthrough is claimed.
- SVG scenes are custom vector illustrations, not frame-by-frame hand-painted backgrounds.
- Environmental switches are discrete interactables; they do not yet use a physics simulation or dynamic water/gravity fields.
- Secret bridge and cache are implemented as a repeatable area-level discovery, not a branching narrative consequence.
