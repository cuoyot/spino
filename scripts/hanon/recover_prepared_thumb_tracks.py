"""Conditionally repair a proven pinned-thumb failure after a source stage exits.

Successful CMC tracks are retained unchanged. A recovery starts only for an
actual prepared-thumb failure and then repeats support/free/native preparation.
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

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--left-pipeline', type=Path, required=True)
parser.add_argument('--right-pipeline', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--pipeline-root', type=Path, required=True)
args = parser.parse_args()
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'recovery-state.json').exists(), 'Preserve previous recovery evidence'
state = {'pid': os.getpid(), 'number': args.number, 'productionReady': False,
         'status': 'Waiting for finished CMC stages; no additional heavy work is started', 'hands': {}}
lock = threading.Lock(); start = time.monotonic()
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')


def save():
    state['elapsedSeconds'] = time.monotonic() - start
    target = out / 'recovery-state.json'; temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(target)


def execute(command, log, hand, stage):
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        with lock:
            hand.update(status=stage, childPid=process.pid, command=command, log=str(log)); save()
        code = process.wait()
    with lock: hand['lastReturncode'] = code; save()
    if code: raise ValueError('Preserved incomplete recovery stage: ' + str(log))


def recover(side):
    pipeline = getattr(args, side + '_pipeline').resolve()
    folder = out / side; folder.mkdir(exist_ok=True)
    hand = {'status': 'Waiting for original CMC result', 'originalPipeline': str(pipeline), 'productionReady': False}
    with lock: state['hands'][side] = hand; save()
    plan_path = pipeline / 'thumb-01' / f'{side}-thumb-plan.json'
    while True:
        try:
            plan = json.loads(plan_path.read_text())
            parent = json.loads((pipeline / 'hand-pipeline-state.json').read_text())
        except (FileNotFoundError, json.JSONDecodeError):
            time.sleep(3); continue
        if not plan.get('failures'):
            with lock: hand['status'] = 'Original CMC route passed; retained unchanged, no recovery needed'; save()
            return
        if not parent['status'].startswith(('Physical', 'Actual')):
            time.sleep(2); continue
        if not any(row.get('prepared_thumb_pinned') is True for row in plan['failures']):
            with lock:
                hand.update(status='Different physical context remains open; no automatic thumb repair', failures=plan['failures']); save()
            return
        break
    source = Path(plan['source_input']); assert hashlib.sha256(source.read_bytes()).hexdigest() == plan['source_input_sha256']
    with lock:
        hand.update(trigger={'plan': str(plan_path), 'sha256': hashlib.sha256(plan_path.read_bytes()).hexdigest(),
                             'preparedThumbFailures': [f for f in plan['failures'] if f.get('prepared_thumb_pinned')]},
                    sourceInput=str(source), sourceInputSha256=plan['source_input_sha256'])
        save()
    context = folder / 'context-01'
    command = [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1', '--python',
               str(HERE / 'prepare_full_thumb_wrist_context.py'), '--', '--number', str(args.number), '--hand', side,
               '--author-root', str(args.author_root.resolve()), '--input-path', str(source), '--output-dir', str(context)]
    execute(command, folder / 'context.log', hand, 'Measured fore/aft context for a proven prepared-thumb boundary failure')
    new_pipeline = args.pipeline_root.resolve() / f'hanon-{args.number:02d}' / side
    command = [sys.executable, '-u', str(HERE / 'run_full_hand_pipeline.py'), '--number', str(args.number), '--hand', side,
               '--author-root', str(args.author_root.resolve()), '--input-path', str(context / f'input-{side}.json'),
               '--output-dir', str(new_pipeline), '--start', 'support']
    execute(command, folder / 'pipeline.log', hand, 'Context selected; complete support/free/CMC/fresh validation running')
    with lock:
        hand.update(status='Recovered full hand scan passed; paired native/visual review pending', pipelineDirectory=str(new_pipeline)); save()


save()
with ThreadPoolExecutor(max_workers=2) as pool:
    futures = {side: pool.submit(recover, side) for side in ('left', 'right')}
    for side, future in futures.items():
        try: future.result()
        except Exception as error:
            with lock: state['hands'][side].update(status='Incomplete physical recovery; do not export', error=str(error)); save()
state['status'] = 'Conditional recovery queue finished; final native/visual and export gates remain separate'
save()
