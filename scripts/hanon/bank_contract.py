"""Verify the immutable evidence handoff before a complete static-bank export."""
import hashlib
import json
from pathlib import Path

APPROVED_SHA256 = 'e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text())


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, separators=(',', ':')) + '\n')
    temporary.replace(path)


def checked_file(entry):
    path = Path(entry['path']).resolve()
    if sha(path) != entry['sha256']:
        raise ValueError('Evidence file changed: ' + str(path))
    return path


def verify_track(path, probe=False):
    track = read_json(path)
    number = track['number']
    if number not in range(1 if probe else 2, 11):
        raise ValueError('Unexpected exercise number')
    source = checked_file(track['sourceBlend'])
    if sha(source) != APPROVED_SHA256:
        raise ValueError('The immutable accepted rig changed')
    if probe:
        if number != 1:
            raise ValueError('Technical cache probes may use only the accepted No.1 source')
    elif track.get('productionReady') is not True:
        raise ValueError('Whole-hand production handoff has not passed')
    for side in ('left', 'right'):
        hand = track['hands'][side]
        input_path, cache_path, scan_path = [checked_file(hand[name]) for name in ('input', 'solutions', 'scan')]
        record, scan = read_json(input_path), read_json(scan_path)
        if len(record['wrists']) != 2880 or len(record['clearance_angles']) != 2880:
            raise ValueError('Only complete native motion tracks may enter this bank')
        if scan['input_sha256'] != sha(input_path) or scan['solution_cache_sha256'] != sha(cache_path):
            raise ValueError('Fresh scan is not bound to the rendered input/cache')
        if scan['finger_checks'] != 14400 or any(scan[name] for name in ('physics_failures', 'support_failures', 'self_crossings')):
            raise ValueError('Whole-hand placement is still failing')
        if record['metadata']['pressure'][-1] != 0:
            raise ValueError('The terminal pose must be released')
        if not probe and (scan.get('fresh_scan_without_search_cache') is not True or scan.get('canonical_note_and_fingering_errors') != 0):
            raise ValueError('A fresh canonical full-track scan is required')
    if not probe:
        native = read_json(checked_file(track['nativeAudit']))
        if native.get('passed') is not True or native.get('nativeFrames') != 2880:
            raise ValueError('Complete native audit has not passed')
        for side in ('left', 'right'):
            for name in ('input', 'solutions'):
                if native['hands'][side][name + 'Sha256'] != track['hands'][side][name]['sha256']:
                    raise ValueError('Native audit is not bound to the final motion records')
        if native.get('motionContinuityPassed') is not True or native.get('visualReviewPassed') is not True:
            raise ValueError('Continuous native motion and representative visual review remain open')
    canonical = read_json(checked_file(track['canonical']))
    if canonical['id'] != f'hanon-{number}' or len(canonical['frames']) != 1440 or len(canonical['events']) != 113:
        raise ValueError('Canonical exercise coverage changed')
    return track
