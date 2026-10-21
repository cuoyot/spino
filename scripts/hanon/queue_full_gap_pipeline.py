"""Wait for a measured free-gap route, then route CMC and run fresh full scans."""
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
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--gap-dir', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--queue-dir', type=Path, required=True)
args = parser.parse_args()
queue = args.queue_dir.resolve(); queue.mkdir(parents=True, exist_ok=True)
assert not (queue / 'queue-state.json').exists(), 'Preserve an existing queue'
gap = args.gap_dir.resolve(); source = gap / f'input-{args.hand}.json'
state = {'pid': os.getpid(), 'number': args.number, 'hand': args.hand, 'productionReady': False,
         'status': 'Waiting for measured gap route; complete clearance remains pending',
         'awaitInput': str(source), 'pipelineDirectory': str(args.output_dir.resolve())}
start = time.monotonic()


def save():
    state['elapsedSeconds'] = time.monotonic() - start
    target = queue / 'queue-state.json'; temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(target)


save()
try:
    while True:
        plan_path = gap / f'{args.hand}-plan.json'
        if plan_path.exists():
            try: plan = json.loads(plan_path.read_text())
            except json.JSONDecodeError: plan = None
            if plan and plan.get('failures'): raise ValueError('Measured gap family is still physically incomplete: ' + str(plan_path))
        try:
            raw = source.read_bytes(); record = json.loads(raw)
            if len(record['wrists']) == len(record['clearance_angles']) == 2880:
                time.sleep(1)
                if source.read_bytes() == raw: break
        except (FileNotFoundError, json.JSONDecodeError): pass
        time.sleep(3)
    state['gapInputSha256'] = hashlib.sha256(raw).hexdigest()
    command = [sys.executable, '-u', str(HERE / 'run_full_hand_pipeline.py'), '--number', str(args.number),
               '--hand', args.hand, '--author-root', str(args.author_root.resolve()), '--input-path', str(source),
               '--output-dir', str(args.output_dir.resolve()), '--start', 'thumb']
    log = queue / 'pipeline.log'
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=dict(os.environ, OPENBLAS_NUM_THREADS='1',
                                   VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1'), stdout=stream, stderr=subprocess.STDOUT)
        state.update(status='Measured CMC and fresh full scan running', command=command, childPid=process.pid, log=str(log)); save()
        state['returncode'] = process.wait()
    if state['returncode']: raise ValueError('Preserved incomplete physical/native-preparation stage: ' + str(log))
    state['status'] = 'Fresh hand pipeline completed; paired native/visual review remains required'
    save(); print(json.dumps(state, indent=2), flush=True)
except Exception as error:
    state.update(status='Incomplete physical source preparation; do not export', error=str(error)); save(); raise
