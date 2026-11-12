# V18.0 — Release Graph Audit

## Added
- Static dependency graph audit for every HTML entrypoint and JavaScript module.
- Checks local `src`/`href` targets and relative ES module imports.
- Explicitly scopes root-absolute asset paths to the corresponding HTML server root, including the separate Phaser Vite app.
- Added audit to the full `npm test` chain.
- Engine package version advanced to 2.3.0.

## Verification
- Full automated suite: run from `engine-phaser/` using `npm test`.
- Local static HTTP smoke test: checks eight routes.
- Release graph audit: checks all HTML entrypoints and local JavaScript imports.

## Not verified
- Vite production build and browser interaction remain blocked until dependencies can be installed.
- No GitHub Pages deployment has been performed.
