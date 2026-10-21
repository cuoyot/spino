"""Port the validated coordinated-neighbour/support/free-pinky dependency.

Every route is measured from the complete actual score. No excerpt vectors are
copied. Existing full-track completed vectors can seed their own unchanged
prefix; fresh geometry and native review remain mandatory.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import sys
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--failure-path', type=Path, required=True)
parser.add_argument('--prefix-gap-dir', type=Path)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--pipeline-dir', type=Path, required=True)
args = parser.parse_args()
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'staged-neighbour-state.json').exists(), 'Preserve an existing run'
state = {'pid': os.getpid(), 'number': args.number, 'hand': args.hand, 'productionReady': False,
         'status': 'Full-score staged preparation running; whole-hand clearance pending', 'steps': []}
started = time.monotonic()
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')


def entry(path):
    path = Path(path).resolve()
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def save():
    state['elapsedSeconds'] = time.monotonic() - started
    temporary = out / 'staged-neighbour-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(out / 'staged-neighbour-state.json')


def execute(name, script, flags, native=True):
    command = ([BLENDER, '--background', '--threads', '1', '--python-exit-code', '1', '--python',
                str(HERE / script), '--'] if native else [sys.executable, '-u', str(HERE / script)]) + flags
    log = out / (name + '.log')
    step = {'name': name, 'command': command, 'script': entry(HERE / script), 'log': str(log)}
    state['steps'].append(step)
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        step['pid'] = process.pid; state['active'] = step; save()
        step['returncode'] = process.wait()
    state.pop('active', None); save()
    if step['returncode']: raise ValueError('Preserved incomplete staged geometry: ' + str(log))


try:
    source = args.input_path.resolve()
    state['originalInput'] = entry(source); save()
    if args.prefix_gap_dir:
        prefix = args.prefix_gap_dir.resolve()
        checkpoint_path = prefix / f'{args.hand}-checkpoint.json'
        checkpoint = json.loads(checkpoint_path.read_text())
        assert Path(checkpoint['source']).resolve() == source and not checkpoint['failures']
        record = json.loads((prefix / f'calibrated-search-input-{args.hand}.json').read_text())
        original = json.loads(source.read_text())
        assert all(original[k] == record[k] for k in ['metadata', 'notes', 'wrists', 'prepare', 'couplings', 'pairs', 'gathers'])
        assert len(record['wrists']) == 2880
        f32 = lambda value: struct.unpack('f', struct.pack('f', value))[0]
        retained = []
        for window in checkpoint['windows']:
            for i in range(window['first_frame'] - 1, window['last_frame']):
                retained.append(i + 1)
                for finger in range(2, 6):
                    delta = checkpoint['world_corrections_m'][i][finger - 2]
                    record['world'][str(finger)][i] = [f32(f32(a) + f32(b))
                        for a, b in zip(record['world'][str(finger)][i], delta)]
        source = out / f'prefix-seed-input-{args.hand}.json'
        source.write_text(json.dumps(record, separators=(',', ':')) + '\n')
        state['retainedOwnFullTrackPrefix'] = {'checkpoint': entry(checkpoint_path),
                                              'frames': retained, 'input': entry(source),
                                              'meaning': 'Completed full-track vectors only; fresh coordinate/key checks follow. No excerpt vectors copied.'}
        save()
    common = ['--number', str(args.number), '--hand', args.hand]
    coordinated = out / 'coordinated-01'
    execute('coordinated-01', 'plan_full_coordinated_gaps.py', common + [
        '--pairs', '2-3,3-4', '--input-path', str(source), '--failure-path', str(args.failure_path.resolve()),
        '--max-gap-mm', '16', '--output-dir', str(coordinated)])
    source = coordinated / f'input-{args.hand}.json'
    supports = out / 'support-01'
    execute('support-01', 'plan_full_supports.py', common + ['--author-root', str(args.author_root.resolve()),
        '--input-path', str(source), '--output-dir', str(supports)])
    support_report = supports / f'{args.hand}-event-depth-plan.json'
    plan = json.loads(support_report.read_text())
    if plan['failures']:
        context = out / 'wrist-context-01'
        execute('wrist-context-01', 'prepare_full_wrist_context.py', common + [
            '--author-root', str(args.author_root.resolve()), '--input-path', str(source),
            '--event-plan', str(support_report), '--output-dir', str(context)])
        supports = out / 'support-02'
        execute('support-02', 'plan_full_supports.py', common + ['--author-root', str(args.author_root.resolve()),
            '--input-path', str(context / f'input-{args.hand}.json'), '--output-dir', str(supports)])
        plan = json.loads((supports / f'{args.hand}-event-depth-plan.json').read_text())
    assert not plan['failures'], 'Lane-limited supports remain open after measured context'
    source = supports / f'input-{args.hand}.json'
    diagnostic = out / 'diagnostic-01'
    execute('diagnostic-01', 'diagnose_full_clearance.py', common + ['--author-root', str(args.author_root.resolve()),
        '--input-path', str(source), '--output-dir', str(diagnostic)])
    pinky = out / 'independent-pinky-01'
    execute('independent-pinky-01', 'prepare_full_pinky_lateral.py', common + [
        '--input-path', str(source), '--failure-path', str(diagnostic / f'{args.hand}-clearance-diagnostic.json'),
        '--primary', 'pinky-lateral-only', '--max-gap-mm', '24', '--output-dir', str(pinky)])
    source = pinky / f'input-{args.hand}.json'
    state['stagedInput'] = entry(source); save()
    execute('full-cmc-fresh-pipeline', 'run_full_hand_pipeline.py', common + [
        '--author-root', str(args.author_root.resolve()), '--input-path', str(source),
        '--output-dir', str(args.pipeline_dir.resolve()), '--start', 'thumb'], native=False)
    state.update(status='Fresh complete hand scan passed; paired native/motion/visual review pending',
                 pipelineDirectory=str(args.pipeline_dir.resolve()))
except Exception as error:
    state.update(status='Incomplete staged physical context; do not export', error=str(error))
    save(); raise
save()
