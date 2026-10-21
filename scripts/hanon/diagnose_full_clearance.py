"""Intermediate exact-input whole-skin diagnostics for free-pose authoring.

This deliberately is not a production scan: a fresh unpatched five-finger/pulp
scan and native review must pass after the routes are authored.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time
from mathutils import Matrix

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = args.author_root.resolve()
sys.path.insert(0, str(root)); sys.path.insert(0, str(root.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from input_record_io import load
from exact_solver_cache import install
from self_clearance import prepare_partitions

out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'{args.hand}-clearance-diagnostic.json').exists()
record = load(args.input_path.resolve(), root, args.hand); cache = install(record)
rotation = Matrix.Rotation(math.radians(16), 3, 'X'); partitions = prepare_partitions(record['geometry'])
report = {'exercise': args.number, 'hand': args.hand, 'status': 'Intermediate diagnostics only; not production clearance',
          'source_input_sha256': hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
          'generator_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
          'self_crossings': [], 'physics_failures': [], 'fresh_final_scan_required': True}
start = time.monotonic()
for i in range(len(record['wrists'])):
    try:
        result = cache.solve(record, i, rotation, thumb_clearance=(0, 0)); cross = cache.cross(result[1], partitions)
        if cross: report['self_crossings'].append({'frame': i + 1, 'crossings': cross})
        if any(row['finger'] != int(record['metadata']['active_finger'][i])
               and row['minimum_actual_key_clearance_m'] is not None
               and row['minimum_actual_key_clearance_m'] < .0004 for row in result[3]['fingers']):
            report['physics_failures'].append({'frame': i + 1, 'error': 'Owned idle skin below actual-key clearance'})
    except Exception as error:
        report['physics_failures'].append({'frame': i + 1, 'error': str(error)})
    if (i + 1) % 240 == 0:
        print(json.dumps({'stage': 'full-clearance-diagnostic', 'exercise': args.number, 'hand': args.hand,
                          'frame': i + 1, 'crossing_frames': len(report['self_crossings']),
                          'physics_failures': len(report['physics_failures']),
                          'seconds': time.monotonic() - start}), flush=True)
report['exact_search_cache'] = cache.stats; report['seconds'] = time.monotonic() - start
(out / f'{args.hand}-clearance-diagnostic.json').write_text(json.dumps(report, indent=2) + '\n')
