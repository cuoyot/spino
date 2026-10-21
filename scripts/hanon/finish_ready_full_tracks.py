"""Finish healthy free-neighbour tracks through CMC and fresh full scans."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
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
parser.add_argument('--source-run', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--numbers', default='3,4,5,6,7,8,9,10')
parser.add_argument('--skip', default='3:left', help='Tracks already owned by a separate measured continuation')
parser.add_argument('--workers', type=int, default=2)
args = parser.parse_args()
source = args.source_run.resolve(); out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'finisher-state.json').exists(), 'Preserve an earlier finisher run'
skip = set(filter(None, args.skip.split(','))); lock = threading.Lock(); start = time.monotonic()
state = {'pid': os.getpid(), 'status': 'Waiting for healthy source preparation', 'productionReady': False,
         'workers': args.workers, 'active': {}, 'completed': [], 'openFailures': [], 'separatelyOwned': sorted(skip)}


def write():
    state['elapsedSeconds'] = time.monotonic() - start
    temporary = out / 'finisher-state.json.tmp'; temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(out / 'finisher-state.json')


def finish(number, side):
    key = f'{number}:{side}'
    incoming = source / f'hanon-{number:02d}' / side / 'intermediate-handoff.json'
    while not incoming.exists():
        try: authoring = json.loads((source / 'authoring-batch-state.json').read_text())
        except (FileNotFoundError, json.JSONDecodeError): authoring = {}
        problem = next((row for row in authoring.get('openFailures', []) if row['number'] == number and row['hand'] == side), None)
        if problem: raise ValueError('Physical source preparation still needs repair: ' + problem['error'])
        with lock: state['active'][key] = {'stage': 'waiting-for-neighbour-preparation', 'await': str(incoming)}; write()
        time.sleep(3)
    handoff = json.loads(incoming.read_text()); current = Path(handoff['input']['path'])
    assert hashlib.sha256(current.read_bytes()).hexdigest() == handoff['input']['sha256']
    folder = out / f'hanon-{number:02d}' / side; log = out / f'hanon-{number:02d}-{side}.log'
    command = [sys.executable, '-u', str(HERE / 'run_full_hand_pipeline.py'), '--number', str(number), '--hand', side,
               '--author-root', str(args.author_root.resolve()), '--input-path', str(current), '--output-dir', str(folder), '--start', 'thumb']
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, stdout=stream, stderr=subprocess.STDOUT)
        with lock:
            state['status'] = 'Measured CMC routing and fresh full scans running'
            state['active'][key] = {'stage': 'CMC-and-fresh-scan', 'pid': process.pid, 'command': command, 'log': str(log)}; write()
        code = process.wait()
    if code: raise ValueError('Full CMC/five-finger validation remains open: ' + str(folder / 'hand-pipeline-state.json'))
    result = json.loads((folder / 'hand-pipeline-state.json').read_text())
    return {'number': number, 'hand': side, 'productionReady': False,
            'status': result['status'], 'finalDirectory': result['finalDirectory'],
            'handPipelineState': str(folder / 'hand-pipeline-state.json')}


with lock: write()
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    jobs = {pool.submit(finish, number, side): (number, side)
            for number in map(int, args.numbers.split(',')) for side in ('left', 'right') if f'{number}:{side}' not in skip}
    for future in as_completed(jobs):
        number, side = jobs[future]; key = f'{number}:{side}'
        try:
            result = future.result()
            with lock: state['completed'].append(result)
        except Exception as error:
            result = {'number': number, 'hand': side, 'productionReady': False, 'error': str(error)}
            with lock: state['openFailures'].append(result)
        with lock: state['active'].pop(key, None); write()
        print(json.dumps(result), flush=True)
state['status'] = 'Finished with physical contexts still open' if state['openFailures'] else 'Fresh numerical stages passed; paired native/visual review pending'
with lock: write()
