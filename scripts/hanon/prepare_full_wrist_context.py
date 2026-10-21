"""Prepare a small palm movement for lane-limited long-finger supports.

This is an authoring intermediate. Actual support depth is reselected afterward;
free-neighbour/CMC routes and complete independent scans remain mandatory.
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
parser.add_argument('--event-plan', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root)); sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load, save
from exact_solver_cache import install
from excerpt_free_preparation import contact_distances
from piano_preparation import retreat_on_key
from keyboard_math import smooth
from self_clearance import prepare_partitions
from rig_math import chain_names
import pad_metrics

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'{args.hand}-wrist-context.json').exists(), 'Preserve earlier context evidence'
record = load(args.input_path.resolve(), root, args.hand)
source_plan = json.loads(args.event_plan.read_text())
failures = source_plan['failures']
assert failures, 'No lane-limited support events in this input plan'
cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X')
prepared = pad_metrics.prepare(record['geometry'], root.parent / 'assets' / (args.hand + '.glb'), args.hand)
partitions = prepare_partitions(record['geometry'])
distances = contact_distances(record)
count = len(record['wrists']); start = time.monotonic()
states = sorted([(back, down, advance) for back in range(4) for down in range(3)
                 for advance in range(9) if back or down],
                key=lambda row: (2 * (row[0] ** 2 + row[1] ** 2) + .3 * row[2] ** 2, row))
report = {'exercise': args.number, 'hand': args.hand,
          'source_input_sha256': hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
          'source_event_plan_sha256': hashlib.sha256(args.event_plan.read_bytes()).hexdigest(),
          'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'method': 'Minimum measured withdrawal/downward palm preparation for real lane-limited long-finger supports. Contact endpoints stay anchored; free endpoints follow with a support-distance gate. Depth is only probed here and must be reselected for every support in the next stage. Self clearance is measured but deferred to free-neighbour/CMC routing.',
          'events': [], 'failures': [], 'complete_independent_scan_required': True}


def reserve_free_reach(i, envelope=1):
    """Let free long fingers adapt to palm preparation with fixed bone lengths."""
    inverse = rotation.transposed(); changes = {}
    for f in range(2, 6):
        if int(record['metadata']['active_finger'][i]) == f and record['prepare'][i]: continue
        names = chain_names(f); rest = record['geometry']['rest']; root_point = rest[names[0]]
        maximum = sum((rest[b] - rest[a]).length for a, b in zip(names, names[1:])) - .00025 - .0005 * envelope
        local = inverse @ (record['world'][f][i] - record['wrists'][i]); offset = local - root_point
        scale = .00025; distance = (maximum - offset.length) / scale
        if distance > 8: continue
        limited = maximum - scale * np.logaddexp(0, distance)
        delta = rotation @ (root_point + offset * (limited / offset.length) - local)
        record['world'][f][i] += delta; changes[f] = list(delta)
    return changes


for event in failures:
    first, last, finger, note = (int(event[key]) for key in ('first', 'last', 'finger', 'note'))
    assert finger in (2, 3, 4, 5), 'Lateral thumb support requires its own diagnostic criteria'
    wrists = [point.copy() for point in record['wrists']]
    world = {f: [point.copy() for point in points] for f, points in record['world'].items()}
    frames = [i for i in range(first, last + 1) if record['prepare'][i]]
    worst = []
    for row in event.get('attempts', []):
        sample = row.get('last_sample') or {}
        if sample.get('frame') is not None: worst.append(int(sample['frame']) - 1)
    samples = list(dict.fromkeys(worst[-2:] + [min(last, first + 1), last, first, min(last, first + 4)]))
    samples = [i for i in samples if i in frames]
    attempts = []; selected = None

    def trial(back, down, advance, indices):
        rows = []
        for i in indices:
            envelope = smooth(max(0, 1 - max(first - i, i - last, 0) / 8))
            delta = Vector((0, -.001 * back, -.001 * down)) * envelope
            record['wrists'][i] = wrists[i] + delta
            for f in world:
                follow = smooth(min(6, float(distances[f][i])) / 6)
                record['world'][f][i] = world[f][i] + delta * follow
            free_reach = reserve_free_reach(i, envelope)
            inside = first <= i <= last
            if inside: retreat_on_key(record['world'][finger][i], -.001 * advance, note)
            active = int(record['metadata']['active_finger'][i]); current_note = int(record['metadata']['note_d'][i])
            try:
                solution, vertices, targets, check = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
                metric = pad_metrics.support(record['geometry'], solution, vertices, rotation, active, current_note,
                                             float(record['metadata']['pressure'][i]), prepared) if record['prepare'][i] else {}
                metric.update({'frame': i + 1, 'key_collisions': check['white_collisions'] + check['black_collisions'],
                               'active_finger': active, 'note': current_note, 'inside_target_event': inside,
                               'free_reach_reservation_world_m': free_reach})
                passed = not metric['key_collisions'] and (not record['prepare'][i] or metric['key_skin_error_m'] < .0003)
                if inside: passed = passed and metric['intrinsic_support_radial_dot_dorsal_mean'] < 0
                passed = passed and all(row['finger'] == active or row['minimum_actual_key_clearance_m'] is None
                                        or row['minimum_actual_key_clearance_m'] > .00045 for row in check['fingers'])
                if passed: metric['self_crossings_deferred'] = cache.cross(vertices, partitions)
                rows.append(metric)
            except Exception as error:
                rows.append({'frame': i + 1, 'error': str(error)}); passed = False
            if not passed: return False, rows
        return True, rows

    for back, down, advance in states:
        passed, measured = trial(back, down, advance, samples)
        if passed: passed, measured = trial(back, down, advance, list(range(max(0, first - 7), min(count, last + 8))))
        row = {'wrist_world_delta_m': [0, -.001 * back, -.001 * down],
               'support_advance_probe_m': .001 * advance, 'passed': passed,
               'samples': measured}
        attempts.append(row)
        if passed: selected = row; break
        if len(attempts) % 40 == 0:
            print(json.dumps({'stage': 'full-context-probe', 'exercise': args.number, 'hand': args.hand,
                              'first': first + 1, 'last': last + 1, 'tested': len(attempts),
                              'seconds': time.monotonic() - start}), flush=True)
    record['wrists'] = [point.copy() for point in wrists]
    record['world'] = {f: [point.copy() for point in points] for f, points in world.items()}
    result = {'first_frame': first + 1, 'last_frame': last + 1, 'finger': finger, 'note': note,
              'attempts': attempts, 'selected': selected}
    if selected is None:
        report['failures'].append(result)
    else:
        changes = []
        for i in range(count):
            distance = max(first - i, i - last, 0)
            envelope = smooth(max(0, 1 - distance / 8))
            if not envelope: continue
            delta = Vector(selected['wrist_world_delta_m']) * envelope
            record['wrists'][i] += delta
            for f in world:
                follow = smooth(min(6, float(distances[f][i])) / 6)
                record['world'][f][i] += delta * follow
            free_reach = reserve_free_reach(i, envelope)
            changes.append({'frame': i + 1, 'wrist_world_delta_m': list(delta),
                            'free_reach_reservation_world_m': free_reach})
        result['authored_wrist_context'] = changes
        print(json.dumps({'stage': 'full-context-selected', 'exercise': args.number, 'hand': args.hand,
                          'first': first + 1, 'last': last + 1,
                          'world_delta_m': selected['wrist_world_delta_m'],
                          'depth_probe_m': selected['support_advance_probe_m'],
                          'all_context_samples': len(selected['samples']),
                          'seconds': time.monotonic() - start}), flush=True)
    report['events'].append(result)
    save(record, out / f'input-{args.hand}-checkpoint.json')
    (out / f'{args.hand}-wrist-context-checkpoint.json').write_text(json.dumps(report, indent=2) + '\n')
    if selected is None: break

report['exact_search_cache'] = cache.stats
report['seconds'] = time.monotonic() - start
report['status'] = 'Measured wrist context selected; support replan and full five-finger/native validation pending' if not report['failures'] else 'Incomplete support context; do not export'
(out / f'{args.hand}-wrist-context.json').write_text(json.dumps(report, indent=2) + '\n')
if report['failures']: raise ValueError('No feasible small context; preserved probes')
save(record, out / f'input-{args.hand}.json')
