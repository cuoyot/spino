"""Retain a completed context before changing only CMC witness test order.

Wait for a fully written successful event checkpoint. Preserve that checkpoint,
the actual generator and process command, then replace only the owned numeric
helper. An already finished helper is left alone. Failed physics never triggers
an automatic restart. All retained contexts are freshly rechecked by the next
helper, and its full/fresh/native gates remain mandatory.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent; REPO = HERE.parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--failure-evidence', type=Path, required=True)
parser.add_argument('--old-run', type=Path, required=True)
parser.add_argument('--new-run', type=Path, required=True)
parser.add_argument('--pipeline-dir', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'queue-state.json').exists(), 'Preserve a prior handoff'
started = time.monotonic()
state = {'pid': os.getpid(), 'number': args.number, 'hand': args.hand, 'productionReady': False,
         'status': 'Waiting for an exact completed context; current numeric producer remains running',
         'oldRun': str(args.old_run.resolve()), 'newRun': str(args.new_run.resolve())}


def entry(path):
    path = Path(path).resolve()
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def save():
    state['elapsedSeconds'] = time.monotonic() - started
    temporary = out / 'queue-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(out / 'queue-state.json')


save()
try:
    old = args.old_run.resolve()
    checkpoint = old / 'context-01' / f'{args.hand}-context-checkpoint.json'
    generator = HERE / 'prepare_full_thumb_wrist_context_v3.py'
    while True:
        current = json.loads((old / 'thumb-window-pipeline-state.json').read_text())
        active = current.get('active')
        if not active or active.get('name') != 'whole-window-context':
            state['status'] = 'Original helper finished or stopped; no numeric producer was changed'
            state['originalStatus'] = current['status']; save(); sys.exit(0)
        try:
            data = checkpoint.read_bytes(); retained = json.loads(data)
        except (FileNotFoundError, json.JSONDecodeError):
            time.sleep(2); continue
        assert not retained['failures'], 'A physical failure must be resolved before any computation handoff'
        selected = [event for event in retained['events'] if event.get('samples')]
        if not selected:
            time.sleep(2); continue
        assert retained['source_input_sha256'] == hashlib.sha256(args.input_path.read_bytes()).hexdigest()
        assert retained['generator_sha256'] == hashlib.sha256(generator.read_bytes()).hexdigest()
        process_id = active['pid']
        command = subprocess.check_output(['ps', '-p', str(process_id), '-o', 'command='], text=True).strip()
        assert 'prepare_full_thumb_wrist_context_v3.py' in command and str(old / 'context-01') in command
        saved_checkpoint = out / 'retained-context-checkpoint.json'; saved_checkpoint.write_bytes(data)
        saved_generator = out / 'context-generator-v3-as-run.py'; saved_generator.write_bytes(generator.read_bytes())
        state.update(status='Exact event retained; replacing only the owned witness-search producer',
                     retainedCheckpoint=entry(saved_checkpoint), retainedGenerator=entry(saved_generator),
                     completedEvents=[{'first': e['first'] + 1, 'last': e['last'] + 1} for e in selected],
                     stoppedProcess={'pid': process_id, 'command': command, 'signal': 'SIGTERM',
                                     'reason': 'Controlled computation handoff after complete event evidence; no physical failure'})
        save()
        os.kill(process_id, signal.SIGTERM)
        for _ in range(60):
            result = subprocess.run(['ps', '-p', str(process_id), '-o', 'command='], text=True, stdout=subprocess.PIPE)
            if result.returncode: break
            time.sleep(.5)
        else: raise ValueError('Owned numeric producer did not exit; do not launch a duplicate')
        break
    script = HERE / 'run_full_thumb_context_pipeline_v3.py'
    command = [sys.executable, '-u', str(script), '--number', str(args.number), '--hand', args.hand,
               '--author-root', str(args.author_root.resolve()), '--input-path', str(args.input_path.resolve()),
               '--failure-evidence', str(args.failure_evidence.resolve()), '--output-dir', str(args.new_run.resolve()),
               '--pipeline-dir', str(args.pipeline_dir.resolve()), '--resume-checkpoint', str(saved_checkpoint),
               '--resume-script', str(saved_generator)]
    log = out / 'resumed-context-and-pipeline.log'
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, stdout=stream, stderr=subprocess.STDOUT)
        state.update(status='Retained contexts are freshly rechecked; unchanged-grid witness ordering and full source gates running',
                     active={'name': 'witness-ordered-context-and-full-pipeline', 'pid': process.pid,
                             'command': command, 'script': entry(script), 'log': str(log)})
        save(); code = process.wait()
    state.pop('active', None); state['returncode'] = code
    state['status'] = ('Fresh complete numerical hand passed; paired/native/visual review pending' if code == 0
                       else 'Incomplete physical source remains open after computation handoff; do not export')
    save()
except Exception as error:
    state.update(status='Incomplete computation handoff; do not export', error=str(error)); save(); raise
