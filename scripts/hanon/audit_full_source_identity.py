"""Run the fixed-keyboard/camera audit on the ten complete native app takes.

This is read-only measurement. It does not approve animation, render assets, or
alter the immutable native sources. The optional wait supports the last paired
source handoff without launching another authoring or bake job.
"""

import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time


NO1_SHA256 = "e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b"
NO2_SHA256 = "a2d92d2b6ec6451f384549f32fd43fa9e739926d645db0a88c8eacccaa7812db"
KEYBOARD_SHA256 = "b1a2642d5009f2d53ab7809c0ef11ce27ce1ae7fede31f9327ecae6474700fe5"


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2) + "\n")
    os.replace(temporary, path)


def source_rows(root, author_root):
    rows = [
        {
            "number": 1,
            "path": str(author_root / "orientation-repair-02/candidate-08/hanon-piano-candidate-08.blend"),
            "sha256": NO1_SHA256,
            "role": "Immutable user-approved complete No1 reference",
        },
        {
            "number": 2,
            "path": str(root / "full-native-pairs-02/hanon-02/native/hanon-02-film-08.blend"),
            "sha256": NO2_SHA256,
            "role": "Complete app-native source",
        },
    ]
    for number in range(3, 11):
        handoff_path = root / ("full-native-pairs-03/hanon-%02d/native-review-handoff.json" % number)
        if not handoff_path.exists():
            return None, [number]
        handoff = json.loads(handoff_path.read_text())
        assert handoff["number"] == number
        rows.append({
            "number": number,
            "path": handoff["nativeBlend"],
            "sha256": handoff["nativeBlendSha256"],
            "handoff": {"path": str(handoff_path), "sha256": sha256(handoff_path)},
            "role": "Complete app-native source; independent motion/source approval is separate",
        })
    for row in rows:
        path = Path(row["path"])
        assert path.is_file(), path
        assert sha256(path) == row["sha256"], ("Source changed from immutable handoff", path)
    return rows, []


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--author-root", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--blender", type=Path, default=Path("/Applications/Blender.app/Contents/MacOS/Blender"))
    parser.add_argument("--wait", action="store_true")
    args = parser.parse_args()
    root, author_root, output = args.root.resolve(), args.author_root.resolve(), args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    state_path = output / "state.json"
    assert not (output / "identity.json").exists(), "Preserve existing identity evidence; select a new output directory"
    state = {
        "pid": os.getpid(),
        "kind": "Read-only exact native fixed-keyboard/main-camera measurement",
        "productionReady": False,
        "startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "Waiting for all ten complete paired native sources",
    }
    while True:
        rows, pending = source_rows(root, author_root)
        state["pending"] = pending
        write_json(state_path, state)
        if rows is not None:
            break
        if not args.wait:
            raise RuntimeError("Complete source handoff missing: %s" % pending)
        time.sleep(15)
    source_map = {
        "kind": "Complete native app-animation takes, not cinematic excerpt sources",
        "sources": rows,
        "approvalScope": "Only fixed keyboard geometry/material/hinge structure and teaching-camera identity are measured here. Poses, active key tracks, motion, contacts, rendering and release retain their independent gates.",
    }
    source_map_path = output / "source-map.json"
    write_json(source_map_path, source_map)
    helper = author_root / "audit_keyboard_identity.py"
    report_path = output / "identity.json"
    command = [str(args.blender), "--background", "--threads", "1", "--python-exit-code", "1", "--python", str(helper), "--"]
    for row in rows:
        command.extend(["--input", row["path"]])
    command.extend(["--output", str(report_path)])
    state.update({"status": "Measuring all ten native sources read-only", "command": command, "sourceMapSha256": sha256(source_map_path), "helperSha256": sha256(helper)})
    write_json(state_path, state)
    with (output / "audit.log").open("w") as log:
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
        state["blenderPid"] = process.pid
        write_json(state_path, state)
        returncode = process.wait()
    assert returncode == 0, ("Identity measurement failed", returncode, output / "audit.log")
    report = json.loads(report_path.read_text())
    assert len(report["sources"]) == 10
    assert report["same_keyboard"] and report["same_main_camera"]
    assert {row["keyboard_sha256"] for row in report["sources"]} == {KEYBOARD_SHA256}
    for expected, actual in zip(rows, report["sources"]):
        assert actual["source_sha256"] == expected["sha256"]
        assert sha256(Path(expected["path"])) == expected["sha256"], "Read-only input changed during measurement"
    state.update({
        "status": "Exact fixed-keyboard/main-camera identity passed across all ten full native sources; independent animation/runtime/release gates remain separate",
        "measurementPassed": True,
        "sourceCount": 10,
        "keyboardSha256": KEYBOARD_SHA256,
        "mainCameraSha256": report["sources"][0]["main_camera_sha256"],
        "identityReport": {"path": str(report_path), "sha256": sha256(report_path)},
        "sourcesUnchangedAfterRead": True,
        "finishedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    write_json(state_path, state)
    print(json.dumps({key: state[key] for key in ("status", "measurementPassed", "sourceCount", "keyboardSha256", "identityReport")}, indent=2), flush=True)


if __name__ == "__main__":
    main()
