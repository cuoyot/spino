"""Wait for measured CMC tracks, then run fresh scans and a paired native bake.

The native source remains pending independent motion/pulp/key/identity and
visual review. This queue never marks a production bank ready by itself.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time

HERE = Path(__file__).resolve().parent; REPO = HERE.parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, choices=range(2, 11), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--left-await', type=Path, required=True)
parser.add_argument('--right-await', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'pair-queue-state.json').exists(), 'Preserve an existing queue'
state = {'pid': os.getpid(), 'number': args.number, 'productionReady': False,
         'status': 'Waiting for CMC authoring; final numerical/native review pending',
         'hands': {}, 'steps': []}
lock = threading.Lock(); start = time.monotonic()
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')


def save():
    state['elapsedSeconds'] = time.monotonic() - start
    temporary = out / 'pair-queue-state.json.tmp'; temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(out / 'pair-queue-state.json')


def execute(command, log, target):
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        with lock:
            target.update(pid=process.pid, command=command, log=str(log), status='running'); save()
        code = process.wait()
    with lock: target.update(status='complete' if code == 0 else 'failed', returncode=code); save()
    if code: raise ValueError('Preserved failed stage: ' + str(log))


def scan_side(side):
    source = getattr(args, side + '_await').resolve()
    hand = {'status': 'waiting-for-authoring', 'awaitInput': str(source)}
    with lock: state['hands'][side] = hand; save()
    while True:
        plan = source.parent / (side + '-thumb-plan.json')
        if plan.exists():
            try:
                if json.loads(plan.read_text()).get('failures'):
                    raise ValueError('CMC authoring still has physical failures: ' + str(plan))
            except json.JSONDecodeError: pass
        try:
            raw = source.read_bytes(); record = json.loads(raw)
            if len(record['clearance_angles']) == len(record['wrists']) == 2880:
                time.sleep(1)
                if source.read_bytes() == raw: break
        except (FileNotFoundError, json.JSONDecodeError): pass
        time.sleep(3)
    with lock: hand['inputSha256'] = hashlib.sha256(raw).hexdigest(); save()
    command = [sys.executable, '-u', str(HERE / 'run_full_hand_pipeline.py'), '--number', str(args.number),
               '--hand', side, '--author-root', str(args.author_root.resolve()), '--input-path', str(source),
               '--output-dir', str(out / side), '--start', 'scan']
    execute(command, out / (side + '-final-scan.log'), hand)
    return out / side / 'fresh-final-01'


with lock: save()
try:
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {side: pool.submit(scan_side, side) for side in ('left', 'right')}
        finals = {side: future.result() for side, future in futures.items()}
    merged = out / 'validated'
    command = [sys.executable, str(HERE / 'merge_full_pair.py'), '--number', str(args.number),
               '--left', str(finals['left']), '--right', str(finals['right']),
               '--author-root', str(args.author_root.resolve()), '--output-dir', str(merged)]
    step = {'name': 'merge-fresh-pair'}
    with lock: state['steps'].append(step); state['status'] = 'Fresh scans passed; merging immutable native-audit inputs'; save()
    execute(command, out / 'merge.log', step)
    command = ['/Applications/Blender.app/Contents/MacOS/Blender', '--background', '--threads', '1', '--python-exit-code', '1',
               '--python', str(HERE / 'audit_full_pair_clearance.py'), '--', '--pair', str(merged / 'pre-native-track.json'),
               '--output', str(out / 'inter-hand-clearance.json')]
    step = {'name': 'inter-hand-clearance'}
    with lock: state['steps'].append(step); state['status'] = 'Checking complete paired hand clearance'; save()
    execute(command, out / 'inter-hand-clearance.log', step)
    command = ['/Applications/Blender.app/Contents/MacOS/Blender', '--background', '--threads', '1', '--python-exit-code', '1',
               '--python', str(args.author_root.resolve() / 'bake_film_excerpt08.py'), '--', '--number', str(args.number),
               '--input-dir', str(merged), '--output-dir', str(out / 'native')]
    step = {'name': 'native-agreement-bake'}
    with lock: state['steps'].append(step); state['status'] = 'Fresh paired scans pass; native agreement bake running'; save()
    execute(command, out / 'native-bake.log', step)
    native = out / 'native' / f'hanon-{args.number:02d}-film-08.blend'
    with lock:
        state.update(status='Paired numerical/native agreement passed; independent native and visual review pending',
                     validatedDirectory=str(merged), nativeBlend=str(native),
                     nativeBlendSha256=hashlib.sha256(native.read_bytes()).hexdigest())
        save()
    print(json.dumps(state, indent=2), flush=True)
except Exception as error:
    with lock: state['status'] = 'Incomplete validation; do not export'; state['error'] = str(error); save()
    raise
