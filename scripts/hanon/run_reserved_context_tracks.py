"""Own queued lane-context tracks with an atomic automatic-stage guard.

The existing raw controller refuses an existing stage command ledger before
launching Blender. Reserve that exact path while its task is still queued,
record why, and run complete side pipelines serially in new directories.
No intermediate raw handoff is created, so no second CMC finisher can race.
Final fresh scans still require the independent paired/native/visual gates.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent; REPO = HERE.parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--sides', default='left,right')
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--pipeline-dir', type=Path, required=True)
args = parser.parse_args()
root = args.root.resolve(); out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'reserved-context-state.json').exists(), 'Preserve an existing reserved run'
sides = args.sides.split(','); assert all(side in ('left', 'right') for side in sides)
started = time.monotonic()
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')
state = {'pid': os.getpid(), 'number': args.number, 'productionReady': False,
         'status': 'Queued automatic stages are reserved; serial measured context/full scans running',
         'claims': {}, 'active': None, 'steps': [], 'completed': [], 'openFailures': []}


def entry(path):
    path = Path(path).resolve()
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def save():
    state['elapsedSeconds'] = time.monotonic() - started
    temporary = out / 'reserved-context-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(out / 'reserved-context-state.json')


def execute(side, name, script, flags, native=True):
    folder = out / side; folder.mkdir(exist_ok=True)
    log = folder / (name + '.log'); assert not log.exists()
    command = ([BLENDER, '--background', '--threads', '1', '--python-exit-code', '1', '--python', str(HERE / script), '--']
               if native else [sys.executable, '-u', str(HERE / script)]) + flags
    step = {'side': side, 'name': name, 'command': command, 'script': entry(HERE / script), 'log': str(log)}
    state['steps'].append(step)
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        step['pid'] = process.pid; state['active'] = step; save()
        step['returncode'] = process.wait()
    state['active'] = None; save()
    if step['returncode']: raise ValueError('Incomplete reserved physical stage preserved: ' + str(log))


raw_state = json.loads((root / 'full-authoring-batch-01/authoring-batch-state.json').read_text())
for side in sides:
    key = f'{args.number}:{side}'
    assert key not in raw_state['active'], 'Do not race an active automatic track'
    assert not any(row['number'] == args.number and row['hand'] == side for row in raw_state['completed'])
    source = root / f'full-support-01/hanon-{args.number:02d}/input-{side}.json'
    plan = root / f'full-support-01/hanon-{args.number:02d}/{side}-event-depth-plan.json'
    measured = json.loads(plan.read_text()); assert measured['failures'], 'Reserve only the actual first lane-context stage'
    raw_folder = root / f'full-authoring-batch-01/hanon-{args.number:02d}/{side}'
    assert not (raw_folder / 'intermediate-handoff.json').exists(), 'Automatic full source is already available'
    guard = raw_folder / 'wrist-context-01/wrist-context-01-command.json'
    guard.parent.mkdir(parents=True, exist_ok=True)
    claim = {'status': 'Reserved serial ownership; no automatic physical process launched',
             'ownerState': str((out / 'reserved-context-state.json').resolve()), 'ownerPid': os.getpid(),
             'sourceInput': entry(source), 'measuredLanePlan': entry(plan),
             'automaticGuard': 'author_full_tracks_batch.run_step asserts that this ledger does not exist before launching Blender. Its expected ownership stop preserves this reservation and prevents duplicate contexts.',
             'finalPipeline': str((args.pipeline_dir.resolve() / side).resolve()),
             'noRawIntermediateHandoffWillBeCreated': True}
    with guard.open('x') as stream:
        stream.write(json.dumps(claim, indent=2) + '\n'); stream.flush(); os.fsync(stream.fileno())
    state['claims'][side] = {'guard': entry(guard), 'source': entry(source), 'plan': entry(plan)}
    save()

for side in sides:
    try:
        common = ['--number', str(args.number), '--hand', side, '--author-root', str(args.author_root.resolve())]
        source = Path(state['claims'][side]['source']['path'])
        plan = Path(state['claims'][side]['plan']['path'])
        context = out / side / 'context-01'
        execute(side, 'wrist-context', 'prepare_full_wrist_context.py', common + [
            '--input-path', str(source), '--event-plan', str(plan), '--output-dir', str(context)])
        pipeline = args.pipeline_dir.resolve() / side
        execute(side, 'full-pipeline', 'run_full_hand_pipeline.py', common + [
            '--input-path', str(context / f'input-{side}.json'), '--output-dir', str(pipeline), '--start', 'support'], native=False)
        state['completed'].append({'side': side, 'pipeline': str(pipeline),
                                   'status': 'Fresh complete numerical scan passed; paired/native/visual review pending'})
        save()
    except Exception as error:
        state['openFailures'].append({'side': side, 'error': str(error)})
        save()
state['status'] = ('Reserved preparation has physical contexts still open; do not export' if state['openFailures']
                   else 'Both reserved fresh numerical hand scans passed; paired/native/visual review pending')
save()
