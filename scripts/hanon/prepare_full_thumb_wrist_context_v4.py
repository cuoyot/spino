"""Measure lateral/depth palm preparation at actual thumb events.

The complete event and free neighbours need simultaneous whole-skin, key and
support clearance. Each event first tries small common functional directions;
a sampled two-dimensional field is an explicit last fallback. These are
authoring search bounds, not anatomy or motion approval. No rigid hand,
thumb/contact model, geometry, bone length, score or material is changed.
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
parser.add_argument('--maximum-component-mm', type=float, default=5)
parser.add_argument('--padding', type=int, default=7)
parser.add_argument('--families', default='depth,diagonal,outward,depth-heavy,outward-heavy,three-quarter-depth,three-quarter-outward,plane')
parser.add_argument('--resume-checkpoint', type=Path)
parser.add_argument('--resume-script', type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root)); sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load, save
from exact_solver_cache import install
from excerpt_free_preparation import contact_distances
from excerpt_thumb_clearance import apply_arc
from piano_preparation import contact_neighbours
from keyboard_math import smooth
from rig_math import chain_names
from self_clearance import prepare_partitions
from support_depth08 import intervals
import pad_metrics

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'input-{args.hand}.json').exists(), 'Preserve earlier source evidence'
record = load(args.input_path.resolve(), root, args.hand)
assert len(record['wrists']) == 2880
cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X'); inverse = rotation.transposed()
partitions = prepare_partitions(record['geometry'])
prepared = pad_metrics.prepare(record['geometry'], root.parent / 'assets' / (args.hand + '.glb'), args.hand)
m = record['metadata']; count = len(record['wrists']); distances = contact_distances(record)
thumb_distance = contact_neighbours([int(m['active_finger'][i]) == 1 and m['pressure'][i] > .001 for i in range(count)])[2]
angle_grid = [(float(a), float(b)) for a in np.arange(0, 6.01, .5) for b in np.arange(0, 10.01, .5)]
angles = sorted(angle_grid, key=lambda v: (0 if v[0] <= 3 and v[1] <= 3 and v[0] % 1 == v[1] % 1 == 0 else 1 if v[0] <= 3 and v[1] <= 3 else 2 if v[0] % 1 == v[1] % 1 == 0 else 3, v[0] ** 2 + v[1] ** 2))
base_wrists = [v.copy() for v in record['wrists']]
base_world = {f: [v.copy() for v in points] for f, points in record['world'].items()}
events = [e for e in intervals(record) if e['finger'] == 1 and any(record['prepare'][i] for i in range(e['first'], e['last'] + 1))]
values_mm = np.arange(0, args.maximum_component_mm + .0001, .5)
directions = {'depth': (0., 1.), 'diagonal': (1., 1.), 'outward': (1., 0.),
              'depth-heavy': (.5, 1.), 'outward-heavy': (1., .5),
              'three-quarter-depth': (.75, 1.), 'three-quarter-outward': (1., .75)}
families = args.families.split(',')
assert all(name in directions or name == 'plane' for name in families)
selected = np.zeros((count, 2)); tested = {}; witness_hints = {}; started = time.monotonic()
report = {'exercise': args.number, 'hand': args.hand, 'source_input': str(args.input_path.resolve()),
          'source_input_sha256': hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
          'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'method': 'Per actual thumb event, choose a small measured palm lateral/depth field. Start with pure withdrawal, then coupled directions, retaining a two-dimensional sampled fallback. All prepared endpoints stay fixed; free endpoints follow with the existing contact-distance gate and fixed-length reach reservation. Every selected held/free frame needs simultaneous full-hand self/key/idle/pulp feasibility under the unchanged free-CMC family. The field is joined with measured bottleneck routing and physically checked relaxation; continuous CMC, fresh all-five and native motion/visual review remain mandatory.',
          'wrist_height_and_hand_identity_unchanged': True,
          'authoring_bounds_are_not_anatomical_limits': True,
          'maximum_lateral_and_depth_component_m': args.maximum_component_mm * .001,
          'family_order': families, 'events': [], 'failures': [],
          'cmc_witnesses_are_not_a_continuous_motion_route': True,
          'witness_ordering': 'Freshly test an existing valid same-frame/nearby grid witness first. The complete unchanged273-state grid remains the fallback. This changes existence-test order only, not feasibility, wrist-field cost or final continuous CMC selection.',
          'full_support_replan_and_fresh_five_finger_native_review_required': True}
resumed_events = {}
if args.resume_checkpoint:
    assert args.resume_script, 'Preserve the actual prior generator source'
    previous = json.loads(args.resume_checkpoint.read_text())
    assert not previous['failures']
    assert previous['source_input_sha256'] == report['source_input_sha256']
    assert previous['generator_sha256'] == hashlib.sha256(args.resume_script.read_bytes()).hexdigest()
    assert previous['exercise'] == args.number and previous['hand'] == args.hand
    assert previous['family_order'] == families
    assert previous['maximum_lateral_and_depth_component_m'] == report['maximum_lateral_and_depth_component_m']
    resumed_events = {(event['first'], event['last']): event for event in previous['events'] if event.get('samples')}
    report['resumed_exact_event_evidence'] = {
        'checkpoint': {'path': str(args.resume_checkpoint.resolve()), 'sha256': hashlib.sha256(args.resume_checkpoint.read_bytes()).hexdigest()},
        'generator': {'path': str(args.resume_script.resolve()), 'sha256': hashlib.sha256(args.resume_script.read_bytes()).hexdigest()},
        'selected_events': len(resumed_events), 'fresh_geometry_recheck_required': True}


def apply(i, lateral, withdrawal):
    delta = Vector(((-1 if args.hand == 'left' else 1) * lateral, -withdrawal, 0))
    record['wrists'][i] = base_wrists[i] + delta
    if lateral == 0 and withdrawal == 0:
        for f in base_world: record['world'][f][i] = base_world[f][i].copy()
        return {}
    reservations = {}
    for f in base_world:
        follow = smooth(min(6, float(distances[f][i])) / 6)
        record['world'][f][i] = base_world[f][i] + delta * follow
        if int(m['active_finger'][i]) == f and record['prepare'][i]:
            assert record['world'][f][i] == base_world[f][i]
            continue
        names = chain_names(f); rest = record['geometry']['rest']; origin = rest[names[0]]
        maximum = sum((rest[b] - rest[a]).length for a, b in zip(names, names[1:])) - .00025
        local = inverse @ (record['world'][f][i] - record['wrists'][i]); radial = local - origin
        distance = (maximum - radial.length) / .00025
        if distance > 8: continue
        limited = maximum - .00025 * np.logaddexp(0, distance)
        movement = rotation @ (origin + radial * (limited / radial.length) - local)
        record['world'][f][i] += movement; reservations[f] = list(movement)
    return reservations


def witness(i, base):
    attempts = 0
    preferred = [(0., 0.)]
    for neighbour in (i, i - 1, i + 1, i - 2, i + 2):
        if neighbour in witness_hints: preferred.append(witness_hints[neighbour])
    ordered = []; seen = set(); allowed = set(angle_grid)
    for degrees in preferred + angles:
        key = tuple(float(value) for value in degrees)
        assert key in allowed, 'A witness hint must not widen the original sampled CMC family'
        if key not in seen: ordered.append(key); seen.add(key)
    assert len(ordered) == len(angle_grid) and seen == allowed
    for degrees in ordered:
        if any(degrees) and (thumb_distance[i] <= 1 or (int(m['active_finger'][i]) == 1 and record['prepare'][i])):
            continue
        result = base if not any(degrees) else apply_arc(record, i, rotation, base, np.radians(degrees))
        check = result[3]; attempts += 1
        if check['white_collisions'] or check['black_collisions']: continue
        if any(row['finger'] != int(m['active_finger'][i]) and row['minimum_actual_key_clearance_m'] is not None
               and row['minimum_actual_key_clearance_m'] < .00045 for row in check['fingers']): continue
        if not cache.cross(result[1], partitions):
            witness_hints[i] = degrees
            return True, list(degrees), attempts
    return False, None, attempts


def measure(i, lateral, withdrawal):
    key = (i, float(lateral), float(withdrawal))
    if key in tested: return tested[key]
    row = {'frame': i + 1, 'outward_lateral_m': float(lateral), 'withdrawal_m': float(withdrawal),
           'active_finger': int(m['active_finger'][i]), 'note': int(m['note_d'][i]), 'pressure': float(m['pressure'][i])}
    try:
        row['free_reach_reservation_world_m'] = apply(i, lateral, withdrawal)
        solution, vertices, targets, check = cache.solve(record, i, rotation, thumb_clearance=(0, 0))
        collisions = check['white_collisions'] + check['black_collisions']
        passed = not collisions and all(f['finger'] == int(m['active_finger'][i]) or f['minimum_actual_key_clearance_m'] is None
                                        or f['minimum_actual_key_clearance_m'] > .00045 for f in check['fingers'])
        row['key_collisions'] = collisions
        if record['prepare'][i]:
            metric = pad_metrics.support(record['geometry'], solution, vertices, rotation, int(m['active_finger'][i]),
                                         int(m['note_d'][i]), float(m['pressure'][i]), prepared)
            row['support'] = metric
            passed = passed and metric['key_skin_error_m'] < .0003 and (int(m['active_finger'][i]) == 1 or metric['intrinsic_support_radial_dot_dorsal_mean'] < 0)
        row['base_whole_hand_crossings'] = cache.cross(vertices, partitions)
        feasible, degrees, attempts = witness(i, (solution, vertices, targets, check)) if passed else (False, None, 0)
        row.update(free_cmc_feasible=feasible, free_cmc_witness_degrees=degrees, tested_cmc_states=attempts, passed=passed and feasible)
    except Exception as error:
        row.update(passed=False, error=str(error))
    tested[key] = row
    return row


def checkpoint():
    report['seconds'] = time.monotonic() - started; report['exact_search_cache'] = cache.stats
    (out / f'{args.hand}-context-checkpoint.json').write_text(json.dumps(report, indent=2) + '\n')


for event in events:
    first, last = event['first'], event['last']
    prior = resumed_events.get((first, last))
    if prior is not None:
        low, high = (value - 1 for value in prior['context_native'])
        assert low == max(0, first - args.padding) and high == min(count - 1, last + args.padding)
        assert len(prior['samples']) == high - low + 1
        field = np.zeros((high - low + 1, 2))
        samples = []
        for offset, sample in enumerate(prior['samples']):
            i = low + offset
            assert sample['frame'] == i + 1 and sample['passed']
            witness_hints[i] = tuple(sample['free_cmc_witness_degrees'])
            field[offset] = [sample['outward_lateral_m'], sample['withdrawal_m']]
            fresh = measure(i, *field[offset])
            assert fresh['passed'], 'A retained exact event no longer clears actual geometry'
            samples.append(fresh)
        assert not np.any(selected[low:high + 1])
        selected[low:high + 1] = field
        report['events'].append(prior | {'samples': samples, 'resumed_exact_context_freshly_rechecked': True})
        checkpoint()
        print(json.dumps({'stage': 'resumed-thumb-palm-context-freshly-rechecked', 'exercise': args.number,
                          'hand': args.hand, 'event_native': [first + 1, last + 1],
                          'samples': len(samples), 'seconds': time.monotonic() - started}), flush=True)
        continue
    held = [i for i in range(first, last + 1) if record['prepare'][i]]
    neighbours = list(range(max(0, first - 3), first)) + list(range(last + 1, min(count, last + 4)))
    baseline = [measure(i, 0., 0.) for i in sorted(set(held + neighbours))]
    if all(row['passed'] for row in baseline):
        report['events'].append(event | {'status': 'Existing clear supported-thumb event retained', 'maximum_withdrawal_m': 0., 'maximum_outward_lateral_m': 0.})
        continue
    low = max(0, first - args.padding); high = min(count - 1, last + args.padding); length = high - low + 1
    attempts = []; chosen = None
    for family in families:
        states = (np.array([(a, b) for a in values_mm for b in values_mm]) if family == 'plane'
                  else np.array([np.array(directions[family]) * value for value in values_mm])) * .001
        costs = np.full((length, len(states)), np.inf); checked = set(); infeasible = []

        def evaluate_row(i):
            if i in checked: return
            checked.add(i)
            ids = [0] if i in (low, high) and i not in (0, count - 1) else range(len(states))
            for sid in ids:
                row = measure(i, *states[sid])
                if row['passed']: costs[i - low, sid] = .1 * float(np.sum((states[sid] / .001) ** 2))
            if not np.isfinite(costs[i - low]).any(): infeasible.append(i + 1)

        # Reject an exhausted held-key lane before expensive free-CMC testing.
        held_order = sorted(held, key=lambda i: (0 if i == held[-1] else 1 if i == held[0] else 2, i))
        for i in held_order:
            evaluate_row(i)
            if infeasible: break
        if not infeasible:
            for i in range(low, high + 1):
                evaluate_row(i)
                if infeasible: break
        np.savez_compressed(out / f'{args.hand}-context-{first+1}-{last+1}-{family}.npz',
                            costs=costs, states=states, first=low, last=high)
        attempt = {'family': family, 'tested_rows': len(checked), 'infeasible_frames': infeasible}
        attempts.append(attempt)
        if infeasible:
            print(json.dumps({'stage': 'thumb-palm-family-rejected', 'exercise': args.number, 'hand': args.hand,
                              'event_native': [first + 1, last + 1], **attempt, 'seconds': time.monotonic() - started}), flush=True)
            continue
        differences = np.linalg.norm(states[:, None] - states[None, :], axis=-1) / .001
        bottleneck = np.where(np.isfinite(costs[0]), 0., np.inf)
        for row in range(1, length):
            bottleneck = np.min(np.maximum(bottleneck[:, None], differences), axis=0)
            bottleneck[~np.isfinite(costs[row])] = np.inf
        minimum = float(np.min(bottleneck)) if high == count - 1 else float(bottleneck[0])
        bound_mm = max(1.01, minimum + 1e-8)
        transitions = 8 * differences ** 2; transitions[differences > bound_mm] = np.inf
        cumulative = costs.copy(); previous = np.zeros(costs.shape, dtype=np.int16)
        for row in range(1, length):
            score = cumulative[row - 1, :, None] + transitions
            previous[row] = np.argmin(score, axis=0); cumulative[row] += score.min(axis=0)
        sid = int(np.argmin(cumulative[-1])) if high == count - 1 else 0
        assert math.isfinite(cumulative[-1, sid]), 'Measured palm field unexpectedly disconnected'
        path = np.zeros(length, dtype=int)
        for row in range(length - 1, -1, -1): path[row] = sid; sid = int(previous[row, sid])
        field = states[path].copy()
        for _ in range(2):
            proposed = field.copy()
            for row in range(1, length - 1):
                value = (field[row - 1] + 2 * field[row] + field[row + 1]) / 4
                if max(np.linalg.norm(value - field[row - 1]), np.linalg.norm(field[row + 1] - value)) > bound_mm * .001: continue
                if np.max(np.abs(value - field[row])) > 1e-10 and measure(low + row, *value)['passed']: proposed[row] = value
            field = proposed
        samples = [measure(low + row, *value) for row, value in enumerate(field)]
        assert all(row['passed'] for row in samples)
        chosen = (family, field, samples, bound_mm)
        break
    if chosen is None:
        report['failures'].append(event | {'reason': 'No sampled lateral/depth family clears the complete held/free window', 'attempts': attempts})
        break
    family, field, samples, bound_mm = chosen
    existing = selected[low:high + 1]
    if np.any((np.linalg.norm(existing, axis=1) > 1e-10) & (np.linalg.norm(existing - field, axis=1) > 1e-10)):
        report['failures'].append(event | {'reason': 'Measured event fields overlap; a joint context window is required'})
        break
    selected[low:high + 1] = field
    row = event | {'status': 'Measured whole-window palm preparation selected', 'context_native': [low + 1, high + 1],
                   'family': family, 'attempts': attempts, 'maximum_outward_lateral_m': float(field[:, 0].max()),
                   'maximum_withdrawal_m': float(field[:, 1].max()), 'maximum_world_offset_m': float(np.linalg.norm(field, axis=1).max()),
                   'maximum_context_step_m': float(np.linalg.norm(np.diff(field, axis=0), axis=1).max()) if len(field) > 1 else 0.,
                   'measured_authoring_step_bound_mm': bound_mm, 'geometry_checked_relaxation_passes': 2, 'samples': samples}
    report['events'].append(row); checkpoint()
    print(json.dumps({'stage': 'thumb-palm-context-selected', 'exercise': args.number, 'hand': args.hand,
                      'event_native': [first + 1, last + 1], 'family': family, 'maximum_world_offset_m': row['maximum_world_offset_m'],
                      'maximum_context_step_m': row['maximum_context_step_m'], 'seconds': time.monotonic() - started}), flush=True)

record['wrists'] = [point.copy() for point in base_wrists]
record['world'] = {f: [point.copy() for point in points] for f, points in base_world.items()}
report['world_wrist_outward_lateral_and_withdrawal_m'] = selected.tolist()
report['seconds'] = time.monotonic() - started; report['exact_search_cache'] = cache.stats
report['status'] = 'Actual-score palm preparation selected; full support/clearance/native review pending' if not report['failures'] else 'Incomplete palm context; do not export'
(out / f'{args.hand}-thumb-wrist-context.json').write_text(json.dumps(report, indent=2) + '\n')
if report['failures']: raise ValueError(report['failures'])
for i, value in enumerate(selected):
    if np.any(value): apply(i, *value)
save(record, out / f'input-{args.hand}.json')
