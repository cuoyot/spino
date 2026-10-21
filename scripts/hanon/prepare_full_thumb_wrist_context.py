"""Measure a small fore/aft palm preparation around actual thumb supports.

The existing shallow lateral thumb/contact model and every real support remain
anchored. Only wrist depth and freely travelling endpoint preparation change.
This is a numerical source stage; full support, clearance and native review
remain required before export.
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
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--maximum-withdrawal-mm', type=float, default=5)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root)); sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load, save
from exact_solver_cache import install
from excerpt_free_preparation import contact_distances
from keyboard_math import smooth
from rig_math import chain_names
from self_clearance import prepare_partitions
from support_depth08 import intervals
import pad_metrics

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'input-{args.hand}.json').exists(), 'Preserve previous context evidence'
record = load(args.input_path.resolve(), root, args.hand)
cache = install(record); rotation = Matrix.Rotation(math.radians(16), 3, 'X'); inverse = rotation.transposed()
partitions = prepare_partitions(record['geometry'])
prepared = pad_metrics.prepare(record['geometry'], root.parent / 'assets' / (args.hand + '.glb'), args.hand)
distances = contact_distances(record); metadata = record['metadata']; count = len(record['wrists'])
base_wrists = [point.copy() for point in record['wrists']]
base_world = {f: [point.copy() for point in points] for f, points in record['world'].items()}
thumb_events = [e for e in intervals(record) if e['finger'] == 1 and any(record['prepare'][i] for i in range(e['first'], e['last'] + 1))]
states = np.arange(0, args.maximum_withdrawal_mm + .0001, .5) * .001
selected_depth = np.zeros(count)
start = time.monotonic()
report = {'exercise': args.number, 'hand': args.hand, 'source_input': str(args.input_path.resolve()),
          'source_input_sha256': hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
          'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'method': 'Actual-score thumb events select a small palm withdrawal from measured whole-skin feasibility. The playing/prepared thumb and all other real supports remain anchored; only free endpoints follow with a contact-distance gate and fixed-length reach reservation. A temporal cost and physically checked relaxation join the context. This does not rotate the held thumb with the free CMC clearance control.',
          'authoring_bounds_are_not_anatomical_limits': True, 'maximum_withdrawal_m': float(states.max()),
          'wrist_height_and_hand_identity_unchanged': True, 'events': [], 'failures': [],
          'full_support_replan_and_fresh_five_finger_native_review_required': True}


def apply(i, withdrawal):
    delta = Vector((0, -withdrawal, 0))
    record['wrists'][i] = base_wrists[i] + delta
    reservation = {}
    if withdrawal <= 0:
        for f in base_world: record['world'][f][i] = base_world[f][i].copy()
        return reservation
    for f in base_world:
        follow = smooth(min(6, float(distances[f][i])) / 6)
        record['world'][f][i] = base_world[f][i] + delta * follow
        if int(metadata['active_finger'][i]) == f and record['prepare'][i]: continue
        names = chain_names(f); rest = record['geometry']['rest']; origin = rest[names[0]]
        maximum = sum((rest[b] - rest[a]).length for a, b in zip(names, names[1:])) - .00025
        local = inverse @ (record['world'][f][i] - record['wrists'][i]); offset = local - origin
        radius = offset.length; distance = (maximum - radius) / .00025
        if distance > 8: continue
        limited = maximum - .00025 * np.logaddexp(0, distance)
        movement = rotation @ (origin + offset * (limited / radius) - local)
        record['world'][f][i] += movement; reservation[f] = list(movement)
    return reservation


for event in thumb_events:
    first, last = event['first'], event['last']
    support_frames = [i for i in range(first, last + 1) if record['prepare'][i]]
    baseline = []
    for i in support_frames:
        apply(i, 0)
        result = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
        baseline.append({'frame': i + 1, 'self_crossings': cache.cross(result[1], partitions)})
    if not any(row['self_crossings'] for row in baseline):
        report['events'].append(event | {'status': 'Existing clear supported-thumb event retained', 'maximum_withdrawal_m': 0})
        continue
    low = max(0, first - 7); high = min(count - 1, last + 7); length = high - low + 1
    costs = np.full((length, len(states)), np.inf); tested = {}; failures = []

    def measure(i, withdrawal):
        key = (i, float(withdrawal))
        if key in tested: return tested[key]
        reservation = apply(i, withdrawal)
        active = int(metadata['active_finger'][i]); note = int(metadata['note_d'][i])
        row = {'frame': i + 1, 'withdrawal_m': float(withdrawal), 'active_finger': active,
               'note': note, 'pressure': float(metadata['pressure'][i]), 'free_reach_reservation_world_m': reservation}
        try:
            solution, vertices, targets, check = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
            collisions = check['white_collisions'] + check['black_collisions']
            passed = not collisions and all(f['finger'] == active or f['minimum_actual_key_clearance_m'] is None
                                             or f['minimum_actual_key_clearance_m'] > .00045 for f in check['fingers'])
            row['key_collisions'] = collisions
            if record['prepare'][i]:
                metric = pad_metrics.support(record['geometry'], solution, vertices, rotation, active, note,
                                             float(metadata['pressure'][i]), prepared)
                row['support'] = metric; passed = passed and metric['key_skin_error_m'] < .0003
            if active == 1 and record['prepare'][i]:
                row['whole_hand_crossings'] = cache.cross(vertices, partitions)
                passed = passed and not row['whole_hand_crossings']
            row['passed'] = passed
        except Exception as error:
            row.update(passed=False, error=str(error))
        tested[key] = row
        return row

    for i in range(low, high + 1):
        ids = [0] if i in (low, high) and i not in (0, count - 1) else range(len(states))
        for sid in ids:
            row = measure(i, states[sid])
            if row['passed']: costs[i - low, sid] = .1 * (states[sid] / .001) ** 2
        if not np.isfinite(costs[i - low]).any(): failures.append(i + 1)
    np.savez_compressed(out / f'{args.hand}-thumb-context-{first + 1}-{last + 1}.npz',
                        costs=costs, states=states, first=low, last=high)
    if failures:
        report['failures'].append(event | {'infeasible_frames': failures, 'reason': 'No whole-skin clear small withdrawal state'})
        break
    steps = np.abs(states[:, None] - states[None, :]) / .001
    bottleneck = np.where(np.isfinite(costs[0]), 0., np.inf)
    for row in range(1, length):
        bottleneck = np.min(np.maximum(bottleneck[:, None], steps), axis=0)
        bottleneck[~np.isfinite(costs[row])] = np.inf
    bound_mm = max(1.01, float(np.min(bottleneck) if high == count - 1 else bottleneck[0]) + 1e-8)
    transitions = 8 * steps ** 2; transitions[steps > bound_mm] = np.inf
    cumulative = costs.copy(); previous = np.zeros(costs.shape, dtype=np.int16)
    for row in range(1, length):
        values = cumulative[row - 1, :, None] + transitions
        previous[row] = np.argmin(values, axis=0); cumulative[row] += values.min(axis=0)
    sid = int(np.argmin(cumulative[-1])) if high == count - 1 else 0
    assert math.isfinite(cumulative[-1, sid]), 'Measured context route unexpectedly disconnected'
    path = np.zeros(length, dtype=int)
    for row in range(length - 1, -1, -1): path[row] = sid; sid = int(previous[row, sid])
    values = states[path].copy()
    for _ in range(2):
        proposed = values.copy()
        for row in range(1, length - 1):
            value = float((values[row - 1] + 2 * values[row] + values[row + 1]) / 4)
            if max(abs(value - values[row - 1]), abs(values[row + 1] - value)) > bound_mm * .001: continue
            if abs(value - values[row]) > 1e-10 and measure(low + row, value)['passed']: proposed[row] = value
        values = proposed
    samples = []
    for row, value in enumerate(values):
        sample = measure(low + row, float(value)); assert sample['passed']; samples.append(sample)
    selected_depth[low:high + 1] = values
    report['events'].append(event | {'status': 'Measured supported-thumb palm preparation selected',
        'context_native': [low + 1, high + 1], 'baseline': baseline,
        'maximum_withdrawal_m': float(values.max()), 'maximum_context_step_m': float(np.abs(np.diff(values)).max()) if len(values) > 1 else 0,
        'measured_authoring_step_bound_mm': bound_mm, 'geometry_checked_relaxation_passes': 2, 'samples': samples})
    print(json.dumps({'stage': 'thumb-wrist-context-selected', 'exercise': args.number, 'hand': args.hand,
                      'event_native': [first + 1, last + 1], 'maximum_withdrawal_m': float(values.max()),
                      'maximum_step_m': float(np.abs(np.diff(values)).max()), 'seconds': time.monotonic() - start}), flush=True)

record['wrists'] = [point.copy() for point in base_wrists]
record['world'] = {f: [point.copy() for point in points] for f, points in base_world.items()}
report['world_wrist_withdrawal_m'] = selected_depth.tolist()
report['seconds'] = time.monotonic() - start; report['exact_search_cache'] = cache.stats
report['status'] = 'Actual-score thumb palm preparation selected; full support/clearance/native review pending' if not report['failures'] else 'Incomplete thumb palm context; do not export'
(out / f'{args.hand}-thumb-wrist-context.json').write_text(json.dumps(report, indent=2) + '\n')
if report['failures']: raise ValueError(report['failures'])
for i, value in enumerate(selected_depth):
    if value: apply(i, float(value))
save(record, out / f'input-{args.hand}.json')
