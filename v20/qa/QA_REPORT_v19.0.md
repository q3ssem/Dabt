# V19.0 QA report — first hands-on test preparation

## Implemented
- Full local application backup/restore for all application-owned `dabt*` localStorage keys, including cognitive sessions, child settings/progress, adventure progress, and shared platform state.
- Profile UI export/restore controls with schema and record validation before mutation.
- Restore preserves unrelated browser storage keys and attempts rollback if storage writes fail.
- Added a practical quick-start guide for desktop and same-Wi-Fi iPhone testing.

## Automated verification
- Full regression suite: PASS (20 test scripts in the npm test chain).
- Full backup/restore round-trip: PASS; invalid JSON, unsupported schema, and foreign keys rejected.
- Static HTTP smoke test: PASS (8 routes).
- Release graph audit: PASS (3 HTML entrypoints, 31 JS modules, all local references resolve).
- JavaScript syntax checks: PASS (54 JS/MJS files, zero failures).

## Not verified
- Vite production build: BLOCKED because dependencies are not installed (`vite: not found`).
- Real browser interaction, iOS Safari, touch controls, and cross-device behavior: NOT TESTED.
- Actual player playthroughs: NOT TESTED. This release is a test candidate, not a verified production release.
