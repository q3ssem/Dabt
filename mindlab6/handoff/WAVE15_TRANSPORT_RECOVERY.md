# Wave15 isolated transport recovery

Status: TOOL_ADDED | LOCAL_EXECUTION_BLOCKED | SPLIT_NOT_RUN | JOIN_NOT_RUN | IMPORT_NOT_STARTED

2026-11-27: Container and Python minimal probes again returned ClientError before any new bulk materialization. Cleanup ledger header read directly from native Library; recorded archive_sha256 matches the reference (not an independent hash). No new bulk copy attempted.

Use original Work workspace or another healthy execution environment. This utility reads the original only, validates full identity, writes a new directory of 16 raw parts (32 MiB max) and manifest. Preserve original and cleanup ledger; never delete or overwrite them. No source/public release/TV changes.

```sh
python3 mindlab6/tools/test-wave15-transport.py
python3 mindlab6/tools/wave15-transport.py split /path/to/MindLab_FULL_CLOSURE_HANDOFF_Wave15.zip /path/to/wave15-parts
python3 mindlab6/tools/wave15-transport.py join /path/to/wave15-parts /path/to/reconstructed-wave15.zip
python3 mindlab6/tools/audit-wave15-intake.py /path/to/reconstructed-wave15.zip /path/to/MindLab_Cleanup_Ledger_Wave15.json --report /path/to/independent-audit.json
```

The transport tool and fixture test have not executed in the blocked environment. Transport integrity is not post-clean approval, dependency mapping, runtime parity or physical-device verification. M02 remains open; M03 prohibited until intake and EXP-0001 gates pass. Never put binary transport parts or evidence in the runtime repository. Use an independent workspace and non-existing destinations. After any failed split, retain the original and use a fresh destination for retry; partial directories are not approved.
