"""Use later free source cores for exact independent original CMC windows.

The original serial producer keeps running until other tracks have complete
numerical/native handoffs and its next whole window is checkpointed. Completed
fields remain immutable. No search grid, candidate test, DP cost or pose math
changes; a merged full fresh scan and independent native review still follow.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import threading
import time

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--old-thumb-dir', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--pipeline-dir', type=Path, required=True)
parser.add_argument('--workers', type=int, required=True)
parser.add_argument('--wait-pairs', default='9,10')
args = parser.parse_args()
assert 1 <= args.workers <= 3
root = args.root.resolve()
old = args.old_thumb_dir.resolve()
out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True)
assert not (out / 'hand-state.json').exists(), 'Preserve a previous continuation'
started = time.monotonic()
lock = threading.Lock()
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')
state = {'pid': os.getpid(), 'number': args.number, 'hand': args.hand, 'productionReady': False,
         'status': 'Standby only; original CMC producer owns all work until other full pairs and source slots are ready',
         'workers': args.workers, 'oldThumbDirectory': str(old), 'activeWindows': {},
         'completedWindows': [], 'failures': [], 'waitPairs': list(map(int, args.wait_pairs.split(',')))}


def read(path):
    try:
        return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def entry(path):
    path = Path(path).resolve()
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def save():
    state['elapsedSeconds'] = time.monotonic() - started
    target = out / 'hand-state.json'
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(state, indent=2) + '\n')
    temporary.replace(target)


def windows(frames):
    result = []
    for native in sorted(frames):
        low, high = max(1, native - 8), min(2880, native + 8)
        if result and low <= result[-1][1] + 1:
            result[-1][1] = max(result[-1][1], high)
        else:
            result.append([low, high])
    return result


def native(script, flags):
    return [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1', '--python',
            str(HERE / script), '--'] + flags


equivalence_path = root / 'no7-cmc-window-equivalence-01.json'
equivalence = read(equivalence_path)
assert equivalence and all(equivalence['functionAstExact'].values())
assert entry(HERE / 'plan_full_thumb_window.py') == equivalence['windowWorker']
checks = [root / 'cmc-window-worker-probe-01' / name
          for name in ('comparison.json', 'merge-comparison.json')]
assert all((read(path) or {}).get('passed') for path in checks), 'Require real original-window/merge equivalence'
state['technicalEquivalenceEvidence'] = [entry(equivalence_path)] + [entry(path) for path in checks]
save()
initial_count = None
try:
    while True:
        if (old / f'input-{args.hand}.json').exists():
            state['status'] = 'Original whole CMC route completed; retained unchanged without a handoff'
            save()
            sys.exit(0)
        final = read(old / f'{args.hand}-thumb-plan.json')
        if final and final['failures']:
            state.update(status='Original physical CMC context failed; preserved without automatic retry',
                         failures=final['failures'])
            save()
            sys.exit(1)
        # Explicit finished-pair gates prevent a transient gap between the other
        # tracks' stages from being mistaken for their numerical completion.
        if not all((root / f'full-native-pairs-03/hanon-{n:02d}/native-review-handoff.json').exists()
                   for n in state['waitPairs']):
            time.sleep(2)
            continue
        schedule = read(root / 'source-resource-scheduler-v3-state.json')
        if not schedule:
            time.sleep(2)
            continue
        processes = schedule['active'] + schedule.get('suspended', [])
        others = [p for p in processes if p.get('handTrack') not in
                  (f'{args.number}:left', f'{args.number}:right')]
        if others:
            initial_count = None
            time.sleep(2)
            continue
        process = next((p for p in processes if Path(p.get('output', '')).resolve() == old
                        and p['script'] == 'plan_full_thumb.py'), None)
        checkpoint_path = old / f'{args.hand}-thumb-checkpoint.json'
        checkpoint = read(checkpoint_path)
        if not process or not checkpoint:
            time.sleep(2)
            continue
        assert not checkpoint['failures'] and not checkpoint['precheck']['non_thumb_failures']
        assert not checkpoint['precheck']['physics_failures'] and checkpoint['precheck']['frames'] == 2880
        if initial_count is None:
            initial_count = len(checkpoint['windows'])
            state.update(status='Other numerical pairs complete; waiting for the next entire owned CMC window',
                         initialRetainedWindowCount=initial_count)
            save()
            if time.time() - checkpoint_path.stat().st_mtime > 2:
                time.sleep(2)
                continue
        elif len(checkpoint['windows']) <= initial_count:
            time.sleep(2)
            continue
        expected = windows(checkpoint['precheck']['thumb_crossing_frames'])
        completed = [[w['first_frame'], w['last_frame']] for w in checkpoint['windows']]
        assert completed == expected[:len(completed)]
        if len(completed) == len(expected):
            time.sleep(1)
            continue
        command = subprocess.check_output(['ps', '-p', str(process['pid']), '-o', 'command='], text=True).strip()
        values = shlex.split(command)
        assert Path(values[values.index('--output-dir') + 1]).resolve() == old
        source = Path(checkpoint['source_input']).resolve()
        assert Path(values[values.index('--input-path') + 1]).resolve() == source
        assert entry(source)['sha256'] == checkpoint['source_input_sha256']
        generator = HERE / 'plan_full_thumb.py'
        assert entry(generator)['sha256'] == checkpoint['generator_sha256']
        prefix = out / f'{args.hand}-original-completed-prefix.json'
        prefix.write_bytes(checkpoint_path.read_bytes())
        assert len(read(prefix)['windows']) == len(completed), 'Preserve only a complete stable prefix'
        original_generator = out / 'original-plan-generator.py'
        original_generator.write_bytes(generator.read_bytes())
        state.update(status='Completed original fields sealed; replacing only the owned serial CMC tail',
                     retainedPrefix=entry(prefix), originalGenerator=entry(original_generator),
                     sourceInput=entry(source), originalWindows=expected, retainedWindows=completed,
                     replacedProcess={'pid': process['pid'], 'command': command, 'signal': 'SIGTERM',
                                      'reason': 'Controlled exact independent-window scheduling handoff'})
        save()
        os.kill(process['pid'], signal.SIGTERM)
        for _ in range(60):
            if subprocess.run(['ps', '-p', str(process['pid']), '-o', 'command='],
                              stdout=subprocess.DEVNULL).returncode:
                break
            time.sleep(.5)
        else:
            raise ValueError('Original source producer did not exit; no duplicate workers may start')
        break

    with (root / 'manual-computation-handoffs.lock').open('a') as guard:
        fcntl.flock(guard, fcntl.LOCK_EX)
        manual_path = root / 'manual-computation-handoffs.json'
        manual = read(manual_path) or {}
        key = f'{args.number}:{args.hand}'
        manual[key] = {'handoff': str((out / 'hand-state.json').relative_to(root)),
                       'state': str((out / 'hand-state.json').relative_to(root)),
                       'pipeline': str((args.pipeline_dir.resolve() / 'hand-pipeline-state.json').relative_to(root)),
                       'stage': 'Original CMC fields retained exactly; unchanged disjoint original-window search running; fresh/native gates pending',
                       'ownership': 'Controlled computation handoff; the older stopped wrapper is historical evidence.',
                       'previousContinuation': manual.get(key)}
        temporary = manual_path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(manual, indent=2) + '\n')
        temporary.replace(manual_path)
    worker = HERE / 'plan_full_thumb_window.py'
    worker_entry = entry(worker)
    tasks = []
    for first, last in expected[len(completed):]:
        folder = out / 'windows' / f'{first:04d}-{last:04d}'
        folder.mkdir(parents=True)
        tasks.append({'bounds': [first, last], 'directory': str(folder)})
    state.update(status='Exact original CMC windows running independently with the unchanged numerical family',
                 remainingWindowTasks=tasks, workerGenerator=worker_entry)
    save()

    def work(task):
        folder = Path(task['directory'])
        first, last = task['bounds']
        key = f'{first}-{last}'
        assert entry(worker) == worker_entry
        command = native('plan_full_thumb_window.py', ['--number', str(args.number), '--hand', args.hand,
            '--author-root', str(args.author_root.resolve()), '--input-path', str(source),
            '--original-precheck', str(prefix), '--original-generator', str(original_generator),
            '--only-window', f'{first}:{last}', '--output-dir', str(folder)])
        log = folder / 'run.log'
        with log.open('w') as stream:
            child = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
            with lock:
                state['activeWindows'][key] = {'pid': child.pid, 'command': command, 'log': str(log)}
                save()
            code = child.wait()
        result = {'bounds': [first, last], 'returncode': code, 'log': str(log)}
        report_path = folder / f'{args.hand}-thumb-plan.json'
        report = read(report_path)
        assert entry(worker) == worker_entry
        if not code:
            assert report and not report['failures'] and report['partial_original_window_only']
            assert [[w['first_frame'], w['last_frame']] for w in report['windows']] == [[first, last]]
            assert report['source_input_sha256'] == state['sourceInput']['sha256']
            result['report'] = entry(report_path)
        else:
            result['failureReport'] = entry(report_path) if report_path.exists() else None
        with lock:
            state['activeWindows'].pop(key)
            state['completedWindows'].append(result)
            save()
        return result

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = list(pool.map(work, tasks))
    failed = [result for result in results if result['returncode']]
    if failed:
        state['failures'] = failed
        raise ValueError('An actual physical CMC window remains unresolved; preserve all outputs')
    manifest = {'number': args.number, 'hand': args.hand, 'productionReady': False,
                'sourceInput': state['sourceInput'], 'expectedWindows': expected,
                'fieldReports': [entry(prefix)] + [r['report'] for r in results],
                'workerGenerator': worker_entry}
    manifest_path = out / 'complete-cmc-field-manifest.json'
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    merged = out / 'merged'
    common = ['--number', str(args.number), '--hand', args.hand,
              '--author-root', str(args.author_root.resolve())]
    command = native('merge_full_cmc_windows.py', common + ['--manifest', str(manifest_path),
                                                         '--output-dir', str(merged)])
    with (out / 'merge.log').open('w') as stream:
        child = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        state.update(status='Merging exact original CMC fields before the fresh full-hand gate',
                     active={'pid': child.pid, 'command': command})
        save()
        assert child.wait() == 0, 'Do not scan an incomplete field merge'
    command = [sys.executable, '-u', str(HERE / 'run_full_hand_pipeline.py')] + common + [
        '--input-path', str(merged / f'input-{args.hand}.json'),
        '--output-dir', str(args.pipeline_dir.resolve()), '--start', 'scan']
    with (out / 'fresh-pipeline.log').open('w') as stream:
        child = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        state.update(status='All original windows assembled; fresh complete five-finger scan running',
                     active={'pid': child.pid, 'command': command})
        save()
        code = child.wait()
    state.pop('active', None)
    state['returncode'] = code
    state['status'] = ('Fresh complete numerical hand passed; paired/native/visual review pending' if code == 0
                       else 'Incomplete fresh full-hand gate; no production clearance')
    save()
except Exception as error:
    state.update(status='Incomplete exact-window continuation; no production clearance', error=str(error))
    save()
    raise
