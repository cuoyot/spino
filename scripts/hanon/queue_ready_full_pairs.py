"""Make native audit bakes only after both independent full hand scans pass.

This queue does not approve motion, anatomy or rendering. It preserves each
pair and reports its hash for the parent's separate native/visual review.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('--numbers', default='3,4,5,6,7,8,9,10')
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
root = args.root.resolve(); author = args.author_root.resolve(); out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True)
assert not (out / 'ready-pair-queue-state.json').exists(), 'Preserve prior queue state'
numbers = list(map(int, args.numbers.split(',')))
state = {'pid': os.getpid(), 'productionReady': False,
         'status': 'Waiting for fresh complete five-finger pairs; independent native/visual review remains required',
         'pending': numbers.copy(), 'completed': [], 'failed': [], 'hands': {}, 'active': None}
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')
start = time.monotonic()


def save():
    state['elapsedSeconds'] = time.monotonic() - start
    target = out / 'ready-pair-queue-state.json'; temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(target)


def fresh_hand(number, side):
    candidates = sorted(root.glob(f'full-pipeline-*/hanon-{number:02d}/{side}/fresh-final-01/{side}-full-scan.json'))
    candidates += sorted(root.glob(f'full-finishers-*/hanon-{number:02d}/{side}/fresh-final-01/{side}-full-scan.json'))
    for path in sorted(candidates, key=lambda p: p.stat().st_mtime, reverse=True):
        try: report = json.loads(path.read_text())
        except json.JSONDecodeError: continue
        errors = [len(report.get(key, [])) for key in ('self_crossings', 'physics_failures', 'support_failures')]
        passed = (report.get('fresh_scan_without_search_cache') is True
                  and report.get('finger_checks') == 14400 and not any(errors)
                  and report.get('canonical_note_and_fingering_errors') == 0)
        if passed: return path.parent
    return None


def execute(pair, name, command):
    folder = out / f'hanon-{pair["number"]:02d}'; folder.mkdir(exist_ok=True)
    log = folder / (name + '.log')
    assert not log.exists(), 'Existing native stage evidence is immutable'
    step = {'name': name, 'command': command, 'log': str(log), 'status': 'running'}
    pair['steps'].append(step)
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        step['pid'] = process.pid; save()
        step['returncode'] = process.wait()
    step['status'] = 'complete' if step['returncode'] == 0 else 'failed'; save()
    if step['returncode']: raise ValueError('Native audit preparation failed: ' + str(log))


save()
while state['pending']:
    ready = None
    for number in state['pending']:
        sides = {side: fresh_hand(number, side) for side in ('left', 'right')}
        state['hands'][str(number)] = {side: str(path) if path else 'Fresh whole-hand scan pending' for side, path in sides.items()}
        if all(sides.values()): ready = number, sides; break
    save()
    if ready is None:
        time.sleep(5); continue
    number, sides = ready
    pair = {'number': number, 'productionReady': False, 'hands': {s: str(p) for s, p in sides.items()}, 'steps': []}
    state['active'] = pair; save()
    folder = out / f'hanon-{number:02d}'; folder.mkdir(exist_ok=True); merged = folder / 'validated'
    try:
        execute(pair, 'merge', [sys.executable, str(HERE / 'merge_full_pair.py'), '--number', str(number),
                               '--left', str(sides['left']), '--right', str(sides['right']),
                               '--author-root', str(author), '--output-dir', str(merged)])
        execute(pair, 'inter-hand-clearance', [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1',
                    '--python', str(HERE / 'audit_full_pair_clearance.py'), '--', '--pair', str(merged / 'pre-native-track.json'),
                    '--output', str(folder / 'inter-hand-clearance.json')])
        execute(pair, 'native-bake', [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1',
                    '--python', str(HERE / 'bake_full_pair_native.py'), '--', '--number', str(number),
                    '--author-root', str(author), '--input-dir', str(merged), '--output-dir', str(folder / 'native')])
        native = folder / 'native' / f'hanon-{number:02d}-film-08.blend'
        pair.update(status='Paired numerical/native agreement passed; independent native/motion/visual review pending',
                    pairManifest=str(merged / 'pre-native-track.json'), nativeBlend=str(native),
                    nativeBlendSha256=hashlib.sha256(native.read_bytes()).hexdigest())
        state['completed'].append(pair)
        (folder / 'native-review-handoff.json').write_text(json.dumps(pair, indent=2) + '\n')
        print(json.dumps({'nativeReviewReady': number, 'blend': str(native), 'sha256': pair['nativeBlendSha256']}), flush=True)
    except Exception as error:
        pair.update(status='Incomplete native audit preparation; do not export', error=str(error))
        state['failed'].append(pair)
        print(json.dumps({'nativePreparationFailed': number, 'error': str(error)}), flush=True)
    state['pending'].remove(number); state['active'] = None; save()
state['status'] = 'Paired native audit preparation finished; independent motion/visual reviews remain required'
save()
