# QA Report — V15.0 Campaign Consequences

## Scope
- Added a pure campaign-consequence rules module.
- The saved `restore` ending now changes every revisited area in that world: hazard lane collision is disabled and platform outlines reflect the restored environment.
- The saved `preserve` ending retains the original hazard challenge and adds branch-specific epilogue text to the guide and journal.
- No ending is inferred or granted automatically; the existing explicit player choice remains the source of truth.

## Validation
- `npm test`: see execution result from the build environment.
- JavaScript syntax checks: see execution result from the build environment.
- ZIP integrity: see execution result from packaging.
- Browser/mobile playthrough: not performed.
- Vite production build: not claimed unless separately verified.
