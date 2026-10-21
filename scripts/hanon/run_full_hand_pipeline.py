"""Continue a measured hand input through strict full numerical authoring.

Successful output still requires paired native and visual review before export.
The command and child PID remain on disk across long-running work.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, choices=range(2, 11), required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--start', choices=('support', 'thumb', 'scan'), default='support')
args = parser.parse_args()
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
assert not (out / 'hand-pipeline-state.json').exists(), 'Preserve earlier runs and use a new output directory'
start = time.monotonic(); current = args.input_path.resolve(); side = args.hand; author = args.author_root.resolve()
state = {'pid': os.getpid(), 'number': args.number, 'hand': side, 'productionReady': False,
         'status': 'Full hand authoring running', 'sourceInput': str(current), 'steps': []}
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save_state():
    state['elapsedSeconds'] = time.monotonic() - start
    temporary = out / 'hand-pipeline-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(out / 'hand-pipeline-state.json')


def run(name, script, options):
    directory = out / name; directory.mkdir()
    code = HERE / script
    command = ['/Applications/Blender.app/Contents/MacOS/Blender', '--background', '--threads', '1',
               '--python-exit-code', '1', '--python', str(code), '--', '--number', str(args.number), '--hand', side]
    for key, value in options.items(): command.extend(['--' + key, str(value)])
    command.extend(['--output-dir', str(directory)])
    log = directory / 'run.log'; source_sha = sha(code)
    step = {'name': name, 'command': command, 'scriptSha256': source_sha,
            'inputSha256': sha(current), 'input': str(current), 'log': str(log)}
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        step['pid'] = process.pid; state['steps'].append(step); state['active'] = step; save_state()
        result = process.wait()
    assert source_sha == sha(code), 'An active authoring script changed'
    step.update(returncode=result, finishedUtcEpoch=time.time()); state.pop('active'); save_state()
    print(json.dumps({'number': args.number, 'hand': side, 'step': name, 'returncode': result,
                      'seconds': time.monotonic() - start, 'log': str(log)}), flush=True)
    if result:
        state['status'] = 'Physical context remains open; do not export'; save_state()
        raise ValueError('Full hand authoring stopped at ' + str(directory))
    return directory


save_state()
if args.start == 'support':
    support = run('support-01', 'plan_full_supports.py', {'author-root': author, 'input-path': current})
    current = support / f'input-{side}.json'
    diagnosis = run('diagnostic-01', 'diagnose_full_clearance.py', {'author-root': author, 'input-path': current})
    failures = diagnosis / f'{side}-clearance-diagnostic.json'; diagnosed = json.loads(failures.read_text())
    if diagnosed['physics_failures']:
        state['status'] = 'Actual key/reach context remains open; do not export'; save_state()
        raise ValueError(str(failures))
    if any(any(int(f) != 1 for f in row['crossings']) for row in diagnosed['self_crossings']):
        gaps = run('gaps-01', 'plan_full_gaps.py', {'input-path': current, 'failure-path': failures,
                   'primary': '34' if side == 'left' else '23', 'max-gap-mm': 16})
        current = gaps / f'input-{side}.json'
if args.start != 'scan':
    thumb = run('thumb-01', 'plan_full_thumb.py', {'author-root': author, 'input-path': current})
    current = thumb / f'input-{side}.json'
final = run('fresh-final-01', 'scan_full_track.py', {'author-root': author, 'input-path': current})
record = json.loads((final / f'input-{side}.json').read_text())
scan = json.loads((final / f'{side}-full-scan.json').read_text())
assert scan['finger_checks'] == 14400 and not any(scan[key] for key in ('self_crossings', 'physics_failures', 'support_failures'))
assert scan['fresh_scan_without_search_cache'] is True and record['metadata']['pressure'][-1] == 0
state['status'] = 'Fresh full numerical scan passed; paired native and visual review pending'
state['finalDirectory'] = str(final); save_state()
print(json.dumps(state), flush=True)
