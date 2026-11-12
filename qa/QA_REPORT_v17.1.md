# V17.1 Release Readiness QA

## Verified in this package
- Full inherited automated suite plus V17 integration test.
- Static HTTP smoke test: root page, application module, CSS, V16/V17 content modules, and Phaser entry page return HTTP 200.
- Visible title/footer labels updated to V17.1; stale hard-coded hero count removed in favor of runtime game count.
- ZIP integrity verified after packaging.

## Not verified
- Vite production build: dependencies are not installed; offline npm cache does not contain Phaser.
- Real browser interaction, mobile touch, Safari/iOS, accessibility/VoiceOver.
- GitHub Pages deployment.

## Release recommendation
Use this as a preview package for local QA only. Do not replace the existing public `main` site until dependency installation, production build, browser playthrough, and a separate preview deployment have passed.
