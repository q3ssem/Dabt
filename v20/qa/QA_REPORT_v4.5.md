# QA report — Dabt PRO v4.5

## Automated checks
- PASS — `node --check src/handdrawn-adventure.js`
- PASS — `node --check src/app.js`
- PASS — 6 island chapter declarations and 6 planetary station declarations.
- PASS — 21 authored puzzle definitions detected.
- PASS — every detected puzzle has at least 3 unique answer choices and an in-range answer index.
- PASS — referenced JavaScript/CSS assets exist for both HTML entry points.
- PASS — local HTTP smoke checks returned 200 for the adventure HTML, game module and stylesheet.
- PASS — inventory and per-world scene persistence hooks are present.
- PASS — local HTTP server responds for `adventure-2d.html`, the module and stylesheet.

## Not verified
- Full interactive browser automation did not complete in this headless environment because the continuously animated `requestAnimationFrame` loop prevented `--dump-dom` from exiting within the timeout. HTTP smoke checks confirm files are served, not that gameplay has been fully exercised in a browser.
- No physical iOS/Android device test, touch QA, screen-reader audit, performance profiling or cross-browser test was run.
- No external scientific validation is claimed for the planet puzzle abstractions.

## Release classification
Local prototype / development build only. Not production-certified and not published to GitHub.
