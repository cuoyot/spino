"""Read-only numerical palm-preparation probe at actual failed thumb supports.

Candidate offsets are authoring measurements, not anatomical limits. This
does not save a retargeted input or approve a full track. Source files, bone
lengths, identity and every prepared support remain unchanged.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import numpy as np
from mathutils import Matrix, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--frames', required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root)); sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load
from exact_solver_cache import install
from excerpt_free_preparation import contact_distances
from piano_preparation import contact_neighbours
from keyboard_math import smooth
from rig_math import chain_names
from self_clearance import prepare_partitions
import pad_metrics

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
destination = out / 'probe.json'
assert not destination.exists(), 'Preserve an earlier numerical probe'
source_hash = hashlib.sha256(args.input_path.read_bytes()).hexdigest()
record = load(args.input_path.resolve(), root, args.hand)
assert len(record['wrists']) == 2880
cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X'); inverse = rotation.transposed()
partitions = prepare_partitions(record['geometry'])
prepared = pad_metrics.prepare(record['geometry'], root.parent / 'assets' / (args.hand + '.glb'), args.hand)
distances = contact_distances(record); m = record['metadata']
thumb_distance = contact_neighbours([int(m['active_finger'][i]) == 1 and m['pressure'][i] > .001 for i in range(2880)])[2]
frames = [int(value) for value in args.frames.split(',')]
original_wrists = {i: record['wrists'][i].copy() for i in (frame - 1 for frame in frames)}
original_world = {i: {f: record['world'][f][i].copy() for f in range(1, 6)} for i in original_wrists}
started = time.monotonic()
report = {'exercise': args.number, 'hand': args.hand, 'source': str(args.input_path.resolve()),
          'sourceSha256': source_hash, 'generatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'scope': 'Only actual prepared/playing thumb states are measured. All supports are pinned; free goals follow a small wrist-depth/lateral offset with the existing contact-distance gate and fixed-length reach reservation. World height, bone lengths, geometry, score and materials stay unchanged. This probe does not establish temporal continuity or full-track clearance.',
          'rows': [], 'summaries': [], 'productionReady': False}


def apply(i, delta):
    record['wrists'][i] = original_wrists[i] + delta
    if delta.length_squared == 0:
        for f in range(1, 6): record['world'][f][i] = original_world[i][f].copy()
        return
    for f in range(1, 6):
        follow = smooth(min(6, float(distances[f][i])) / 6)
        record['world'][f][i] = original_world[i][f] + delta * follow
        if int(m['active_finger'][i]) == f and record['prepare'][i]:
            assert record['world'][f][i] == original_world[i][f]
            continue
        names = chain_names(f); rest = record['geometry']['rest']; origin = rest[names[0]]
        maximum = sum((rest[b] - rest[a]).length for a, b in zip(names, names[1:])) - .00025
        local = inverse @ (record['world'][f][i] - record['wrists'][i]); radial = local - origin
        distance = (maximum - radial.length) / .00025
        if distance <= 8:
            limited = maximum - .00025 * np.logaddexp(0, distance)
            record['world'][f][i] += rotation @ (origin + radial * (limited / radial.length) - local)


withdrawals = [0., .5, 1., 1.5, 2., 3., 4., 5.]
laterals = [0., .5, 1., 1.5, 2., 3., 4., 5., -.5, -1., -1.5, -2., -3.]
trials = sorted([(a, b) for a in laterals for b in withdrawals],
                key=lambda value: (math.hypot(*value), abs(value[0]), value[1], value[0]))
for frame in frames:
    i = frame - 1
    assert int(m['active_finger'][i]) == 1 and (record['prepare'][i] or thumb_distance[i] <= 1), 'Probe only actual pinned thumb supports'
    current = []
    for lateral, withdrawal in trials:
        delta = Vector(((-1 if args.hand == 'left' else 1) * lateral * .001, -withdrawal * .001, 0))
        row = {'frame': frame, 'outwardLateralMm': lateral, 'withdrawalMm': withdrawal,
               'worldWristDeltaM': list(delta), 'pressure': float(m['pressure'][i]), 'note': int(m['note_d'][i])}
        try:
            apply(i, delta)
            solution, vertices, targets, check = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
            collisions = check['white_collisions'] + check['black_collisions']
            idle = [r['minimum_actual_key_clearance_m'] for r in check['fingers'] if r['finger'] != 1 and r['minimum_actual_key_clearance_m'] is not None]
            cross = cache.cross(vertices, partitions)
            metric = pad_metrics.support(record['geometry'], solution, vertices, rotation, 1, int(m['note_d'][i]), float(m['pressure'][i]), prepared)
            row.update(keyCollisions=collisions, selfCrossings=cross, minimumIdleClearanceM=min(idle) if idle else None,
                       thumbSupport=metric, passed=not collisions and not cross and all(value > .00045 for value in idle) and metric['key_skin_error_m'] < .0003)
        except Exception as error:
            row.update(passed=False, error=str(error))
        current.append(row); report['rows'].append(row)
    valid = [row for row in current if row['passed']]
    pure_depth = [row for row in valid if row['outwardLateralMm'] == 0]
    summary = {'frame': frame, 'testedStates': len(current), 'validStates': len(valid),
               'validPureDepthStates': len(pure_depth), 'smallestPassing': valid[0] if valid else None,
               'smallestPureDepth': pure_depth[0] if pure_depth else None}
    report['summaries'].append(summary)
    print(json.dumps({'stage': 'pinned-thumb-palm-probe', 'exercise': args.number, 'hand': args.hand,
                      'frame': frame, 'validStates': len(valid), 'validPureDepthStates': len(pure_depth),
                      'smallestWorldDeltaM': valid[0]['worldWristDeltaM'] if valid else None,
                      'seconds': time.monotonic() - started}), flush=True)
for i in original_wrists:
    record['wrists'][i] = original_wrists[i]
    for f in range(1, 6): record['world'][f][i] = original_world[i][f]
report.update(sourceUnchanged=hashlib.sha256(args.input_path.read_bytes()).hexdigest() == source_hash,
              seconds=time.monotonic() - started, exactSearchCache=cache.stats)
assert report['sourceUnchanged']
destination.write_text(json.dumps(report, indent=2) + '\n')
