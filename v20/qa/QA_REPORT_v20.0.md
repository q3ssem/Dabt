# V20.0 QA Report — Offline-ready first test

## Scope
V20 focuses on making the existing platform easier to test on desktop and iPhone, rather than expanding the content catalog.

## Implemented
- Added a PWA web manifest with Arabic RTL metadata, standalone display, theme colors, and app icons (192, 512, maskable 512, plus iOS touch icon).
- Added a versioned service worker with app-shell precache, same-origin asset caching, offline navigation fallback, and cleanup of older Dabt shell caches.
- Registered the service worker from the main application when served over HTTP/HTTPS. Online functionality remains available if registration fails.
- Updated V20 title/footer labels and refreshed the desktop/iPhone quick-start and local backup instructions.
- Corrected Phaser source and asset URLs to be relative to the project subpath and configured Vite with `base: './'` for eventual GitHub Pages subpath builds.
- Changed main-platform Phaser links to the separate engine run instructions, avoiding a misleading direct link to an unbuilt Vite source entry.
- Added a GitHub Desktop guide for uploading to a separate `v20-test` branch without overwriting `main`.

## Automated verification
- Full regression suite: PASS (21 scripts in the npm test chain).
- HTTP smoke: PASS (11 routes served).
- Release graph audit: PASS (3 HTML entrypoints, 33 JavaScript modules, local references resolved).
- Full backup/restore test: PASS.
- PWA test: PASS, including mocked service-worker install/activate, old-cache cleanup, and offline navigation fallback.
- JavaScript syntax: PASS (57 JS/MJS files).
- ZIP integrity: verified separately at packaging.

## Not verified
- Vite production build: BLOCKED because `vite` is not installed in this environment (`vite: not found`).
- Real browser/device testing: NOT PERFORMED. Automated service-worker simulation does not replace Safari/Chrome/iOS testing.
- GitHub upload/deployment: NOT PERFORMED. The guide prepares a safe branch-based workflow; it does not publish the code.
- Offline availability applies to resources previously fetched and cached after first online launch; Phaser's npm runtime dependencies are not automatically cached by the main app shell.

## Release status
V20 is an offline-ready test candidate, not a production-verified release. Keep `main` unchanged until manual testing is complete.
