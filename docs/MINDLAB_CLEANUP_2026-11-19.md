# MindLab 5.5.28 — cleanup decision record (19 Nov 2026)

- Remove the retired Arabic word-fluency game `hasad` from the source, dependencies, catalogue registration, loader, and cache.
- Remove eight 4 MB-class pre-puzzle backdrop atlases and the retired river opening-only artwork. Retain lightweight story text, approved heroine portrait, explicit start button, and existing countdown gate.
- Remove three V3 station opening-only background pictures; preserve station map, in-play scenery, journeys, locks, progress and quest transitions.
- Prune offline manifests and roll the service-worker cache generation. Existing `miran:v2` player save keys and the `mindlab:openings:seen:v1` seen history remain intact.
- Retain active legacy engine assets and QA evidence. Filename age alone is insufficient proof of an unused runtime dependency. Additional cleanup requires a demonstrated reachability audit.
- Validation: `node qa/tests/cleanup.cjs`, `npm test`, `node qa/tests/design-integration.cjs`, Chromium and WebKit `display_audio_review.py --check`.
