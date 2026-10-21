"""Check that the two freshly cleared hand skins do not intersect each other."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import numpy as np
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

parser = argparse.ArgumentParser()
parser.add_argument('--pair', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
assert not args.output.exists(), 'Preserve existing pair evidence'
pair = json.loads(args.pair.read_text()); root = Path(pair['authorRoot'])
sys.path.insert(0, str(root)); sys.path.insert(0, str(root.parent))
from input_record_io import load
from orientation_math import deformed_vertices
from rig_math import chain_names


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


records = {}; caches = {}
for side in ('left', 'right'):
    hand = pair['hands'][side]
    for name in ('input', 'solutions', 'scan'): assert sha(hand[name]['path']) == hand[name]['sha256']
    records[side] = load(hand['input']['path'], root, side)
    with np.load(hand['solutions']['path'], allow_pickle=False) as packed:
        caches[side] = {name: packed[name] for name in packed.files}
rotation = np.array(Matrix.Rotation(math.radians(16), 3, 'X'))
report = {'number': pair['number'], 'pairSha256': sha(args.pair), 'framesChecked': 0,
          'method': 'Actual articulated source skins from the hash-bound complete caches; AABB separating-axis test, followed by complete cross-hand triangle BVH intersection whenever the bounds overlap. Individual self/key/pulp scans and native agreement are separate evidence.',
          'minimumSeparatingAxisGapM': 1, 'overlappingBoundsFrames': 0,
          'intersections': [], 'productionReady': False}
start = time.monotonic()
for i in range(2880):
    vertices = {}; bounds = {}
    for side in records:
        cache = caches[side]
        solution = {f: {'points': [Vector(point) for point in cache['points'][i, f - 1]],
                        'residual': float(cache['residuals'][i, f - 1])} for f in range(1, 6)}
        solution[1]['rotations'] = {name: Matrix(cache['thumb_rotations'][i, j]) for j, name in enumerate(chain_names(1))}
        vertices[side] = deformed_vertices(records[side]['geometry'], solution) @ rotation.T + np.array(records[side]['wrists'][i])
        bounds[side] = (vertices[side].min(axis=0), vertices[side].max(axis=0))
    left, right = bounds['left'], bounds['right']
    gap = float(np.max(np.maximum(left[0] - right[1], right[0] - left[1])))
    report['minimumSeparatingAxisGapM'] = min(report['minimumSeparatingAxisGapM'], gap)
    if gap <= 0:
        report['overlappingBoundsFrames'] += 1
        trees = {side: BVHTree.FromPolygons([Vector(point) for point in vertices[side]],
                                          records[side]['geometry']['faces'], all_triangles=True) for side in records}
        overlap = trees['left'].overlap(trees['right'])
        if overlap: report['intersections'].append({'frame': i + 1, 'trianglePairs': len(overlap)})
    report['framesChecked'] += 1
report['passed'] = not report['intersections']; report['seconds'] = time.monotonic() - start
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report), flush=True)
assert report['passed'], 'The two hand skins intersect'
