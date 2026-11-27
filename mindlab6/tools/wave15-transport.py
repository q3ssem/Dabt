#!/usr/bin/env python3
"""Transport Wave15 without modifying the original. Not an import approval."""
import argparse
import hashlib
import json
import pathlib
import tempfile
import os

EXPECTED_SHA = "f704747cd849d420f5192d8b8e0c1c9048ee44a59c45abcfe5e3c03abaca3c6d"
EXPECTED_BYTES = 529241748
CHUNK = 32 * 1024 * 1024
BUFFER = 1024 * 1024

def inspect(path):
    h = hashlib.sha256()
    total = 0
    with path.open("rb") as f:
        for block in iter(lambda: f.read(BUFFER), b""):
            h.update(block)
            total += len(block)
    return total, h.hexdigest()

def split(source, target):
    if target.exists() or target.is_symlink():
        raise FileExistsError(target)
    if inspect(source) != (EXPECTED_BYTES, EXPECTED_SHA):
        raise ValueError("Original archive identity mismatch")
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".wave15-", dir=target.parent) as temporary:
        stage = pathlib.Path(temporary) / "parts"
        stage.mkdir()
        rows = []
        overall = hashlib.sha256()
        total = 0
        with source.open("rb") as f:
            while True:
                block = f.read(CHUNK)
                if not block:
                    break
                name = f"wave15.part{len(rows)+1:03d}"
                with (stage / name).open("xb") as out:
                    out.write(block)
                digest = hashlib.sha256(block).hexdigest()
                if inspect(stage / name) != (len(block), digest):
                    raise ValueError("Part write verification failed")
                rows.append({"name": name, "bytes": len(block), "sha256": digest})
                overall.update(block)
                total += len(block)
        if (total, overall.hexdigest()) != (EXPECTED_BYTES, EXPECTED_SHA):
            raise ValueError("Source changed during split")
        manifest = {"schema": 1, "archive_sha256": EXPECTED_SHA,
                    "archive_bytes": EXPECTED_BYTES, "chunk_bytes": CHUNK,
                    "parts": rows}
        with (stage / "manifest.json").open("x", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        # Reserve the destination exclusively; no existing directory is overwritten.
        target.mkdir()
        for path in stage.iterdir():
            os.link(path, target / path.name)
        print(json.dumps({"status": "TRANSPORT_SPLIT_VERIFIED", "parts": len(rows),
                          "bytes": total, "sha256": overall.hexdigest()}))

def join(parts, target):
    manifest = json.loads((parts / "manifest.json").read_text(encoding="utf-8"))
    if (manifest["schema"], manifest["archive_bytes"], manifest["archive_sha256"],
        manifest["chunk_bytes"]) != (1, EXPECTED_BYTES, EXPECTED_SHA, CHUNK):
        raise ValueError("Manifest identity mismatch")
    count = (EXPECTED_BYTES + CHUNK - 1) // CHUNK
    if len(manifest["parts"]) != count:
        raise ValueError("Part count mismatch")
    if target.exists() or target.is_symlink():
        raise FileExistsError(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".wave15-", dir=target.parent) as temporary:
        stage = pathlib.Path(temporary) / "joined.zip"
        overall = hashlib.sha256()
        total = 0
        with stage.open("xb") as out:
            for i, row in enumerate(manifest["parts"], 1):
                name = f"wave15.part{i:03d}"
                expected_size = min(CHUNK, EXPECTED_BYTES - (i-1)*CHUNK)
                path = parts / name
                if row["name"] != name or row["bytes"] != expected_size or path.is_symlink() or not path.is_file():
                    raise ValueError("Unexpected part: " + name)
                h = hashlib.sha256()
                size = 0
                with path.open("rb") as f:
                    for block in iter(lambda: f.read(BUFFER), b""):
                        size += len(block)
                        if size > expected_size:
                            raise ValueError("Oversized part: " + name)
                        h.update(block)
                        overall.update(block)
                        out.write(block)
                if size != expected_size or h.hexdigest() != row["sha256"]:
                    raise ValueError("Part verification failed: " + name)
                total += size
        if (total, overall.hexdigest()) != (EXPECTED_BYTES, EXPECTED_SHA):
            raise ValueError("Reassembled archive identity mismatch")
        if inspect(stage) != (EXPECTED_BYTES, EXPECTED_SHA):
            raise ValueError("Reassembled file write verification failed")
        os.link(stage, target)  # exclusive publication; never overwrite
        print(json.dumps({"status": "TRANSPORT_JOIN_VERIFIED", "bytes": total,
                          "sha256": overall.hexdigest()}))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["split", "join"])
    parser.add_argument("source", type=pathlib.Path)
    parser.add_argument("destination", type=pathlib.Path)
    args = parser.parse_args()
    (split if args.action == "split" else join)(args.source, args.destination)

if __name__ == "__main__":
    main()
