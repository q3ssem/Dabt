#!/usr/bin/env python3
"""Read-only Wave15 intake. No extraction, installation or game execution."""
import argparse
import collections
import hashlib
import json
import pathlib
import stat
import zipfile

EXPECTED_SHA = "f704747cd849d420f5192d8b8e0c1c9048ee44a59c45abcfe5e3c03abaca3c6d"
EXPECTED_BYTES = 529241748

def digest(stream):
    h = hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
        h.update(chunk)
    return h.hexdigest()

def audit(archive, ledger):
    with archive.open("rb") as f:
        actual = digest(f)
    if actual != EXPECTED_SHA or archive.stat().st_size != EXPECTED_BYTES:
        raise ValueError("Wave15 identity mismatch; stop intake")
    if ledger["archive_sha256"] != actual:
        raise ValueError("Cleanup ledger identity mismatch")
    rows = []
    counts = collections.Counter()
    seen = set()
    with zipfile.ZipFile(archive) as z:
        for item in z.infolist():
            name = item.filename
            parts = name.rstrip("/").split("/")
            key = name.rstrip("/").casefold()
            mode = item.external_attr >> 16
            if (any(p in ("", ".", "..") or ":" in p for p in parts)
                    or "\\" in name or key in seen or stat.S_ISLNK(mode)
                    or item.flag_bits & 1):
                raise ValueError("Unsafe, encrypted or ambiguous ZIP member: " + name)
            seen.add(key)
            if item.is_dir():
                continue
            with z.open(item) as f:
                sha = digest(f)
            rows.append({"path":name,"bytes":item.file_size,"sha256":sha})
            counts["/".join(parts[:2])] += 1
        by_path = {row["path"]:row for row in rows}
        verified = 0
        for entry in ledger["removed"]:
            if not entry.get("archive_entry"):
                continue
            row = by_path.get(entry["archive_entry"])
            if not row or row["sha256"] != entry["sha256"] or row["bytes"] != entry["bytes"]:
                raise ValueError("Ledger member mismatch: " + entry["archive_entry"])
            verified += 1
    return {"archive_sha256":actual,"archive_bytes":EXPECTED_BYTES,
            "file_count":len(rows),"groups":dict(sorted(counts.items())),
            "ledger_archive_entries_verified":verified,"files":rows,
            "status":"identity-verified-not-approved-for-import",
            "runtime_executed":False,"device_tested":False}

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("archive", type=pathlib.Path)
    p.add_argument("ledger", type=pathlib.Path)
    p.add_argument("--report", required=True, type=pathlib.Path)
    args = p.parse_args()
    result = audit(args.archive, json.loads(args.ledger.read_text(encoding="utf-8")))
    with args.report.open("x", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    print(json.dumps({k:v for k,v in result.items() if k != "files"}, ensure_ascii=False))

if __name__ == "__main__":
    main()
