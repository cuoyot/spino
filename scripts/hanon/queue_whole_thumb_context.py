"""Recover only a completed, proven thumb-stage failure with full-window context.

The original source producer owns its work until it exits. A successful original
route is kept unchanged. This queue does not approve placement or production;
the existing wrapper repeats support, continuous CMC and fresh full-hand gates.
"""
import argparse
import fcntl
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
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--original-pipeline', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--pipeline-dir', type=Path, required=True)
args = parser.parse_args()
root = args.root.resolve()
out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True)
target = out / 'queue-state.json'
assert not target.exists(), 'Preserve an existing whole-window recovery queue'
original = args.original_pipeline.resolve()
plan_path = original / 'thumb-01' / f'{args.hand}-thumb-plan.json'
parent_path = original / 'hand-pipeline-state.json'
state = {'pid': os.getpid(), 'number': args.number, 'hand': args.hand,
         'productionReady': False, 'originalPipeline': str(original),
         'status': 'Standby only; the original source owns its numerical work'}
started = time.monotonic()


def save():
    state['elapsedSeconds'] = time.monotonic() - started
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(target)


def read(path):
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


save()
try:
    while True:
        parent, plan = read(parent_path), read(plan_path)
        if parent and parent.get('finalDirectory'):
            state['status'] = 'Original fresh full scan passed; retained unchanged'
            save()
            sys.exit(0)
        if plan and not plan.get('failures'):
            state['status'] = 'Original CMC route passed; retained unchanged'
            save()
            sys.exit(0)
        if parent and parent.get('status', '').startswith('Physical'):
            if not plan or not plan.get('failures'):
                raise ValueError('A different original physical stage remains open; no thumb recovery launched')
            if not all(row.get('reason') == 'No actual-skin clear state in the measured CMC family'
                       for row in plan['failures']):
                raise ValueError('Original thumb failure requires separate interpretation; preserved without retry')
            break
        time.sleep(3)

    source = Path(plan['source_input'])
    assert hashlib.sha256(source.read_bytes()).hexdigest() == plan['source_input_sha256']
    trigger = {'path': str(plan_path), 'sha256': hashlib.sha256(plan_path.read_bytes()).hexdigest(),
               'failures': plan['failures']}
    state.update(status='A completed original thumb failure triggers measured whole-window preparation',
                 trigger=trigger, sourceInput=str(source), sourceInputSha256=plan['source_input_sha256'])
    save()
    new_context = out / 'whole-window-context-01'
    new_pipeline = args.pipeline_dir.resolve()
    lock_path = root / 'manual-computation-handoffs.lock'
    with lock_path.open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        map_path = root / 'manual-computation-handoffs.json'
        mapping = read(map_path) or {}
        key = f'{args.number}:{args.hand}'
        previous = mapping.get(key)
        mapping[key] = {'handoff': str(target.relative_to(root)),
                        'log': str((out / 'whole-window-context.log').relative_to(root)),
                        'state': str((new_context / 'thumb-window-pipeline-state.json').relative_to(root)),
                        'pipeline': str((new_pipeline / 'hand-pipeline-state.json').relative_to(root)),
                        'stage': 'Proven original thumb-stage failure; measured complete held/free-window context and fresh gates pending',
                        'previousOriginalPipeline': str(parent_path.relative_to(root)),
                        'trigger': trigger}
        if previous:
            mapping[key]['previousContinuation'] = previous
        temporary = map_path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(mapping, indent=2) + '\n')
        temporary.replace(map_path)
    script = HERE / 'run_full_thumb_context_pipeline_v3.py'
    command = [sys.executable, '-u', str(script), '--number', str(args.number), '--hand', args.hand,
               '--author-root', str(args.author_root.resolve()), '--input-path', str(source),
               '--failure-evidence', str(plan_path), '--output-dir', str(new_context),
               '--pipeline-dir', str(new_pipeline)]
    log = out / 'whole-window-context.log'
    assert not log.exists(), 'Preserve existing context log'
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, stdout=stream, stderr=subprocess.STDOUT,
                                   env=dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1',
                                            VECLIB_MAXIMUM_THREADS='1'))
        state.update(command=command, childPid=process.pid, log=str(log),
                     generatorSha256=hashlib.sha256(script.read_bytes()).hexdigest())
        save()
        state['returncode'] = process.wait()
    if state['returncode']:
        raise ValueError('Whole-window preparation remains open; preserve all diagnostics and do not export')
    state.update(status='Fresh complete source scan passed; paired native/motion/visual review pending',
                 pipelineDirectory=str(new_pipeline))
except Exception as error:
    state.update(status='Incomplete physical source; no production clearance', error=str(error))
    save()
    raise
save()
