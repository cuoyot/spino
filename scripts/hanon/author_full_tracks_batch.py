"""Durable, bounded authoring of complete remaining Hanon hand tracks.

Every stage is intermediate until the fresh final and native visual audits pass.
Failed attempts remain in place and are reported for contextual repair.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import subprocess
import threading
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('--numbers', default='3,4,5,6,7,8,9,10')
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--source-dir', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--workers', type=int, default=2)
parser.add_argument('--until', choices=('gaps', 'final'), default='gaps')
args = parser.parse_args()
out = args.output_dir.resolve(); out.mkdir(parents=True, exist_ok=True)
author = args.author_root.resolve(); source = args.source_dir.resolve()
lock = threading.Lock(); start = time.monotonic()
state = {'pid': os.getpid(), 'status': 'complete-track-authoring-running', 'productionReady': False,
         'until': args.until, 'workers': args.workers, 'active': {}, 'completed': [], 'openFailures': []}
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_state():
    state['elapsedSeconds'] = time.monotonic() - start
    temporary = out / 'authoring-batch-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(out / 'authoring-batch-state.json')


def run_step(key, directory, name, script, values):
    directory.mkdir(parents=True, exist_ok=True)
    ledger = directory / (name + '-command.json')
    assert not ledger.exists(), 'Existing stage is preserved; resume through an explicit new run: ' + str(ledger)
    script = HERE / script
    command = [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1', '--python', str(script), '--']
    for option, value in values.items(): command.extend(['--' + option, str(value)])
    log = directory / (name + '.log')
    sources = {str(script): sha(script), str(HERE / 'exact_solver_cache.py'): sha(HERE / 'exact_solver_cache.py')}
    metadata = {'command': command, 'generatorFingerprints': sources, 'log': str(log), 'startUtcEpoch': time.time()}
    ledger.write_text(json.dumps(metadata, indent=2) + '\n')
    with log.open('w') as stream:
        process = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        with lock:
            state['active'][key] = {'stage': name, 'pid': process.pid, 'command': command, 'log': str(log)}
            write_state()
        code = process.wait()
    for path, digest in sources.items(): assert sha(path) == digest, 'Generator changed during an active stage'
    metadata.update(returncode=code, endUtcEpoch=time.time()); ledger.write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps({'handTrack': key, 'stage': name, 'returncode': code, 'log': str(log)}), flush=True)
    return code


def hand_track(number, side):
    key = f'{number}:{side}'; folder = out / f'hanon-{number:02d}' / side
    folder.mkdir(parents=True, exist_ok=True)
    raw = source / f'hanon-{number:02d}'
    while True:
        try: rows = json.loads((source / 'support-batch-state.json').read_text())['completed']
        except (FileNotFoundError, json.JSONDecodeError): rows = []
        done = next((row for row in rows if row['number'] == number and row['hand'] == side), None)
        if done: break
        with lock:
            state['active'][key] = {'stage': 'waiting-for-original-support-stage', 'number': number, 'hand': side}
            write_state()
        time.sleep(3)
    current = raw / f'input-{side}.json'; plan_path = raw / f'{side}-event-depth-plan.json'
    if not current.exists() or not plan_path.exists():
        checkpoint = raw / f'input-{side}-checkpoint.json'
        current = checkpoint if checkpoint.exists() else source.parent / 'full-inputs-01' / f'hanon-{number:02d}' / f'input-{side}.json'
        reach = folder / 'free-reach-01'
        code = run_step(key, reach, 'free-reach-01', 'prepare_full_free_reach.py',
                        {'number': number, 'hand': side, 'author-root': author,
                         'input-path': current, 'output-dir': reach})
        if code: raise ValueError(f'Free reach needs contextual repair: {reach}')
        current = reach / f'input-{side}.json'; support = folder / 'support-recovery-01'
        run_step(key, support, 'support-recovery-01', 'plan_full_supports.py',
                 {'number': number, 'hand': side, 'author-root': author,
                  'input-path': current, 'output-dir': support})
        current = support / f'input-{side}.json'; plan_path = support / f'{side}-event-depth-plan.json'
        if not current.exists() or not plan_path.exists(): raise ValueError(f'Support recovery raised a physical exception: {support}')
    for repair in range(1, 3):
        plan = json.loads(plan_path.read_text())
        if not plan['failures']: break
        context = folder / f'wrist-context-{repair:02d}'
        # Reuse only the already measured exact No.3 input/context pair.
        reuse = source.parent / 'full-context-03/hanon-03'
        context_report = reuse / 'left-wrist-context.json'
        if number == 3 and side == 'left' and repair == 1 and context_report.exists():
            measured = json.loads(context_report.read_text())
            if measured['source_input_sha256'] == sha(current) and not measured['failures']:
                context = reuse
            else: raise ValueError('Existing No.3 context is not bound to this exact input')
        else:
            code = run_step(key, context, f'wrist-context-{repair:02d}', 'prepare_full_wrist_context.py',
                            {'number': number, 'hand': side, 'author-root': author, 'input-path': current,
                             'event-plan': plan_path, 'output-dir': context})
            if code: raise ValueError(f'Lane-limited support context remains open: {context}')
        current = context / f'input-{side}.json'; support = folder / f'support-after-context-{repair:02d}'
        run_step(key, support, f'support-after-context-{repair:02d}', 'plan_full_supports.py',
                 {'number': number, 'hand': side, 'author-root': author,
                  'input-path': current, 'output-dir': support})
        current = support / f'input-{side}.json'; plan_path = support / f'{side}-event-depth-plan.json'
        if not current.exists() or not plan_path.exists(): raise ValueError(f'New support-context physical exception: {support}')
    if json.loads(plan_path.read_text())['failures']: raise ValueError('Scored support still needs measured context')
    diagnosis = folder / 'clearance-diagnostic-01'
    code = run_step(key, diagnosis, 'clearance-diagnostic-01', 'diagnose_full_clearance.py',
                    {'number': number, 'hand': side, 'author-root': author,
                     'input-path': current, 'output-dir': diagnosis})
    if code: raise ValueError(f'Clearance diagnostic exception: {diagnosis}')
    failure_path = diagnosis / f'{side}-clearance-diagnostic.json'
    diagnosed = json.loads(failure_path.read_text())
    if diagnosed['physics_failures']: raise ValueError(f'Actual key/reach context needs repair: {failure_path}')
    if any(any(int(f) != 1 for f in row['crossings']) for row in diagnosed['self_crossings']):
        gaps = folder / 'free-gaps-01'
        code = run_step(key, gaps, 'free-gaps-01', 'plan_full_gaps.py',
                        {'number': number, 'hand': side, 'input-path': current,
                         'failure-path': failure_path, 'primary': '34' if side == 'left' else '23',
                         'output-dir': gaps, 'max-gap-mm': 16})
        if code: raise ValueError(f'Free-neighbour physical route needs repair: {gaps}')
        current = gaps / f'input-{side}.json'
    if args.until == 'final':
        thumb = folder / 'free-thumb-01'
        code = run_step(key, thumb, 'free-thumb-01', 'plan_full_thumb.py',
                        {'number': number, 'hand': side, 'author-root': author,
                         'input-path': current, 'output-dir': thumb})
        if code: raise ValueError(f'Free/held thumb context remains open: {thumb}')
        current = thumb / f'input-{side}.json'; final = folder / 'fresh-final-01'
        code = run_step(key, final, 'fresh-final-01', 'scan_full_track.py',
                        {'number': number, 'hand': side, 'author-root': author,
                         'input-path': current, 'output-dir': final})
        if code: raise ValueError(f'Fresh full numerical scan did not pass: {final}')
        current = final / f'input-{side}.json'
    result = {'number': number, 'hand': side, 'productionReady': False,
              'status': 'Fresh numerical placement passed; native and visual review pending' if args.until == 'final'
                        else 'Free-neighbour preparation selected; CMC/fresh full/native/visual review pending',
              'input': {'path': str(current), 'sha256': sha(current)}, 'supportPlan': str(plan_path)}
    (folder / 'intermediate-handoff.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


with lock: write_state()
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    jobs = {pool.submit(hand_track, number, side): (number, side)
            for number in map(int, args.numbers.split(',')) for side in ('left', 'right')}
    for job in as_completed(jobs):
        number, side = jobs[job]; key = f'{number}:{side}'
        try:
            result = job.result()
            with lock: state['completed'].append(result)
        except Exception as error:
            result = {'number': number, 'hand': side, 'status': 'Physical context remains open; not cleared', 'error': str(error)}
            with lock: state['openFailures'].append(result)
        with lock:
            state['active'].pop(key, None); write_state()
        print(json.dumps(result), flush=True)
state['status'] = 'authoring-stage-complete-with-open-contexts' if state['openFailures'] else 'authoring-stage-complete-native-review-pending'
with lock: write_state()
