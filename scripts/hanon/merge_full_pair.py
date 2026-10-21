"""Bind two freshly cleared full hand caches for native audit, not export."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, choices=range(2, 11), required=True)
parser.add_argument('--left', type=Path, required=True)
parser.add_argument('--right', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'pre-native-track.json').exists(), 'Preserve the immutable existing pair'


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def entry(path): return {'path': str(Path(path).resolve()), 'sha256': sha(path)}


hands = {}
for side in ('left', 'right'):
    folder = getattr(args, side).resolve()
    scan_path = folder / f'{side}-full-scan.json'; scan = json.loads(scan_path.read_text())
    input_path = folder / f'input-{side}.json'; cache_path = folder / f'{side}-solutions.npz'
    assert scan['fresh_scan_without_search_cache'] is True
    assert scan['finger_checks'] == 14400 and scan['native_frames'] == 2880
    assert scan['canonical_note_and_fingering_errors'] == 0
    assert not any(scan[name] for name in ('self_crossings', 'physics_failures', 'support_failures'))
    assert scan['input_sha256'] == sha(input_path) and scan['solution_cache_sha256'] == sha(cache_path)
    record = json.loads(input_path.read_text())
    assert len(record['wrists']) == len(record['clearance_angles']) == 2880
    assert record['source']['absolute_first_native_frame'] == 1 and record['source']['absolute_last_native_frame'] == 2880
    assert record['metadata']['pressure'][-1] == 0
    for path in (input_path, cache_path, scan_path):
        target = out / path.name
        assert not target.exists()
        shutil.copy2(path, target)
        assert sha(target) == sha(path)
    hands[side] = {name: entry(out / path.name) for name, path in
                   (('input', input_path), ('solutions', cache_path), ('scan', scan_path))}
source = repo / 'output/blender/hanon-hands-2026-10-20/keyboard-standard-v2/orientation-repair-02/candidate-08/hanon-piano-candidate-08.blend'
assert sha(source) == 'e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b'
canonical = repo / f'public/warmups/hanon-frames-v1/exercises/hanon-{args.number}.json'
score = json.loads(canonical.read_text()); assert len(score['events']) == 113 and len(score['frames']) == 1440
for side, offsets in (('left', (0, 1)), ('right', (2, 3))):
    record = json.loads(Path(hands[side]['input']['path']).read_text())
    for i in range(2880):
        event = score['events'][score['frames'][i // 2][0]]
        assert [record['metadata'][name][i] for name in ('note_d', 'active_finger')] == [event[j] for j in offsets]
manifest = {'number': args.number, 'productionReady': False,
            'status': 'Both fresh numerical whole-hand scans pass; native agreement, actual motion, all-finger pulp, keys, identity and visual review are pending',
            'authorRoot': str(args.author_root.resolve()), 'sourceBlend': entry(source),
            'canonical': entry(canonical), 'hands': hands,
            'generator': entry(__file__)}
(out / 'pre-native-track.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest, indent=2), flush=True)
