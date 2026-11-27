# Apple Beta integration — Wave15
Status: INTAKE_PREPARED | ARCHIVE_IN_LIBRARY | INDEPENDENT_ARCHIVE_AUDIT_NOT_RUN | IMPORT_NOT_STARTED | DEVICE_NOT_EXECUTED
Date: 2026-11-27
Engineering base: 0797969ec36d3efe076f6d80538f411cad07a3c8
Protected main at intake: 640bba573114d83174b5ea04ef6364ca6c0b30c1
Protected editorial at intake: bb42cdab9aa69beb49575e59a900ccf0defcc517

## Source
MindLab_FULL_CLOSURE_HANDOFF_Wave15.zip — 529241748 bytes; library file located.
Expected SHA256 from MindLab_Cleanup_Ledger_Wave15.json:
f704747cd849d420f5192d8b8e0c1c9048ee44a59c45abcfe5e3c03abaca3c6d
The ledger reports verified archive integrity; this is not independent re-verification. No later approved clean archive is evidenced. Retain the original; do not treat this snapshot as post-clean final approval.

## Gate 1: intake
Run python3 mindlab6/tools/audit-wave15-intake.py <archive.zip> <cleanup-ledger.json> --report <new-report.json>.
Local execution environment returned errors after materialization; no verification claimed.
Review resulting file inventory; separate runtime, assets, source and evidence. Confirm source precedence against the latest post-clean closure. No wholesale extraction into repository, no evidence images in runtime bundles.

## Gate 2: integration
Build explicit allowlist and dependency map. Preserve all 86 original puzzle IDs and solutions, story route context, save keys, stage unlocks and hints. Reconcile existing V6 EXP-0001 runtime mapping; do not bypass its migration gate. Import one vertical slice in this branch first, then expand only after parity. No Genesis, Abyss or TV additions. No changes to main or editorial branch.

## Gate 3: beta
Separate origin and save namespace from production. Test build, asset load, offline, lifecycle, story, audio and persistence. White/dark, Arabic RTL, five agreed safe-area layouts. WebKit automation is not physical Safari. Actual iPhone and iPad portrait/landscape, touch, rotation, interruptions, audio, performance and offline re-entry are required. Publish only isolated beta after passing integration tests; main release requires explicit approval.

## 2026-11-27 — M02 execution checkpoint
- Initial Python and Container probes passed before materialization. GitHub connector read all four requested files and confirmed integration HEAD `aa0cdbb6939162398d368559dd5769898bf5988c`, main `640bba573114d83174b5ea04ef6364ca6c0b30c1`, editorial `bb42cdab9aa69beb49575e59a900ccf0defcc517`.
- Native Library lists Wave15 archive (529241748 bytes) and cleanup ledger (2154513 bytes). Materialization returned matching sizes; subsequent Container and Python calls failed with `ClientError`, including a minimal echo. Direct Git transport also failed DNS resolution. Archive SHA, member integrity, ledger matching and runtime dependency checks are NOT RUN. Underlying failure cause not established.
- No newer approved post-clean archive identified in native Library; cloud mounts not exhaustively searched. No import or publication. EXP-0001 remains open. Preserve all original gates.
- Evidence: `results/wave15-intake-environment-20261127.json`. Next: restore executable access to original bytes and run the existing read-only audit before import. No physical Apple device tests.
