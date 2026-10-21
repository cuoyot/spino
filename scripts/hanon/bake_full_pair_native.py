"""Run the frozen native baker with each exact NPZ array loaded only once."""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import sys
import time

import numpy as np

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, choices=range(2, 11), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-dir', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
legacy = args.author_root.resolve() / 'bake_film_excerpt08.py'
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / f'hanon-{args.number:02d}-film-08.blend').exists(), 'Preserve an existing native source'


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


legacy_sha = sha(legacy)
original_load = np.load
expected = {(args.input_dir.resolve() / (side + '-solutions.npz')).resolve() for side in ('left', 'right')}
materialized = {}; report = {'method': 'Exact arrays are decompressed once per input file before the unchanged frozen native baker indexes them. No numeric values or poses are changed.',
                            'wrapperSha256': sha(__file__), 'frozenBaker': str(legacy),
                            'frozenBakerSha256': legacy_sha, 'inputs': {}}


def exact_load(filename, *values, **options):
    try: path = Path(filename).resolve()
    except TypeError: return original_load(filename, *values, **options)
    if path not in expected: return original_load(filename, *values, **options)
    if path not in materialized:
        with original_load(filename, *values, **options) as packed:
            materialized[path] = {name: packed[name] for name in packed.files}
        report['inputs'][str(path)] = {'sha256': sha(path),
                                      'arrays': {name: {'shape': list(array.shape), 'bytes': array.nbytes}
                                                 for name, array in materialized[path].items()}}
    return materialized[path]


np.load = exact_load
sys.argv = [str(legacy), '--', '--number', str(args.number), '--input-dir', str(args.input_dir.resolve()), '--output-dir', str(out)]
start = time.monotonic()
try:
    runpy.run_path(str(legacy), run_name='__main__')
finally:
    np.load = original_load
assert sha(legacy) == legacy_sha
report['seconds'] = time.monotonic() - start
report['materializedBytes'] = sum(array.nbytes for arrays in materialized.values() for array in arrays.values())
native = out / f'hanon-{args.number:02d}-film-08.blend'
report['nativeBlend'] = {'path': str(native), 'sha256': sha(native)}
(out / 'native-bake-wrapper.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report), flush=True)
