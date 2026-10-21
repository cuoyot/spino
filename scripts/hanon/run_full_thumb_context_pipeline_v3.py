"""Check measured lateral/depth thumb preparation and repeat all full gates."""
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
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--failure-evidence', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--pipeline-dir', type=Path, required=True)
parser.add_argument('--resume-checkpoint', type=Path)
parser.add_argument('--resume-script', type=Path)
args = parser.parse_args()
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'thumb-window-pipeline-state.json').exists(), 'Preserve an existing context run'
source = args.input_path.resolve(); evidence = args.failure_evidence.resolve()
state = {'pid': os.getpid(), 'number': args.number, 'hand': args.hand, 'productionReady': False,
         'sourceInput': str(source), 'sourceInputSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
         'actualFailureEvidence': str(evidence), 'failureEvidenceSha256': hashlib.sha256(evidence.read_bytes()).hexdigest(),
         'status': 'Complete held/free thumb-window context running; full placement remains pending', 'steps': []}
started = time.monotonic(); env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')


def save():
    state['elapsedSeconds'] = time.monotonic() - started
    temporary = out / 'thumb-window-pipeline-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(out / 'thumb-window-pipeline-state.json')


def execute(name, command, script):
    log = out / (name + '.log')
    step = {'name': name, 'command': command, 'log': str(log),
            'generatorSha256': hashlib.sha256(script.read_bytes()).hexdigest()}
    state['steps'].append(step)
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        step['pid'] = process.pid; state['active'] = step; save()
        step['returncode'] = process.wait()
    state.pop('active', None); save()
    if step['returncode']: raise ValueError('Preserved incomplete physical context: ' + str(log))


save()
try:
    common = ['--number', str(args.number), '--hand', args.hand, '--author-root', str(args.author_root.resolve())]
    script = HERE / 'prepare_full_thumb_wrist_context_v4.py'
    context = out / 'context-01'
    resume = (['--resume-checkpoint', str(args.resume_checkpoint.resolve()),
               '--resume-script', str(args.resume_script.resolve())] if args.resume_checkpoint else [])
    if resume:
        state['retainedContextCheckpoint'] = str(args.resume_checkpoint.resolve())
        state['retainedGeneratorSource'] = str(args.resume_script.resolve())
    execute('whole-window-context', [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1',
        '--python', str(script), '--'] + common + ['--input-path', str(source), '--output-dir', str(context)] + resume, script)
    script = HERE / 'run_full_hand_pipeline.py'
    execute('full-support-cmc-fresh', [sys.executable, '-u', str(script)] + common + [
        '--input-path', str(context / f'input-{args.hand}.json'), '--output-dir', str(args.pipeline_dir.resolve()),
        '--start', 'support'], script)
    state.update(status='Fresh complete hand scan passed; paired native/motion/visual review pending',
                 pipelineDirectory=str(args.pipeline_dir.resolve()))
except Exception as error:
    state.update(status='Incomplete whole-window physical preparation; do not export', error=str(error)); save(); raise
save()
