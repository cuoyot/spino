"""Use later idle source slots for unchanged disjoint gap-window searches.

When source capacity is available, retain the next complete original window
and replace this hand's owned serial gap helper. The optional spare-slot mode
uses only newly available source slots without increasing the global cap. The already
validated v2 helper runs with the identical single primary and16mm controls,
an exact calibrated base and filtered original whole windows. No solver or
anatomy changes. A lossless field merge and all full/native gates follow.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
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

HERE = Path(__file__).resolve().parent; REPO = HERE.parents[1]
BLENDER = '/Applications/Blender.app/Contents/MacOS/Blender'
parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, required=True)
parser.add_argument('--hand', choices=('left', 'right'), required=True)
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--old-gap-dir', type=Path, required=True)
parser.add_argument('--diagnostic', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
parser.add_argument('--pipeline-dir', type=Path, required=True)
parser.add_argument('--workers', type=int, required=True)
parser.add_argument('--reuse-spare-source-slot', action='store_true')
args = parser.parse_args()
assert 1 <= args.workers <= 3
root = args.root.resolve(); old = args.old_gap_dir.resolve(); out = args.output_dir.resolve()
out.mkdir(parents=True, exist_ok=True); assert not (out / 'hand-state.json').exists()
lock = threading.Lock(); started = time.monotonic()
env = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')
state = {'pid': os.getpid(), 'number': args.number, 'hand': args.hand, 'productionReady': False,
         'status': 'Standby only; original source keeps running until measured source capacity and a new completed window are available',
         'reuseSpareSourceSlot': args.reuse_spare_source_slot,
         'workers': args.workers, 'oldGapDirectory': str(old), 'activeWindows': {}, 'completedWindows': [], 'failures': []}


def entry(path):
    path = Path(path).resolve()
    return {'path': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def read(path):
    try: return json.loads(Path(path).read_text())
    except (FileNotFoundError, json.JSONDecodeError): return None


def save():
    state['elapsedSeconds'] = time.monotonic() - started
    temporary = out / 'hand-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(out / 'hand-state.json')


def groups(rows):
    windows = []
    for i in sorted(row['frame'] - 1 for row in rows if any(int(k) != 1 for k in row['crossings'])):
        low, high = max(0, i - 12), min(2879, i + 12)
        if windows and low <= windows[-1][1] + 1: windows[-1][1] = max(windows[-1][1], high)
        else: windows.append([low, high])
    return [[a + 1, b + 1] for a, b in windows]


def native(script, flags):
    return [BLENDER, '--background', '--threads', '1', '--python-exit-code', '1', '--python', str(HERE / script), '--'] + flags


save()
initial_count = None
try:
    while True:
        if (old / f'input-{args.hand}.json').exists():
            state['status'] = 'Original complete gap source finished; no process or field was changed'
            save(); sys.exit(0)
        final = read(old / f'{args.hand}-plan.json')
        if final and final['failures']:
            state.update(status='Original physical context failed; no automatic computation handoff', failures=final['failures'])
            save(); sys.exit(1)
        schedule = read(root / 'source-resource-scheduler-v3-state.json')
        if not schedule: time.sleep(2); continue
        processes = schedule['active'] + schedule.get('suspended', [])
        others = [p for p in processes if p.get('handTrack') != f'{args.number}:left' and p.get('handTrack') != f'{args.number}:right']
        maximum = int((read(root / 'source-resource-limit.json') or {}).get('maxActiveNumericProducers', 5))
        capacity_busy = (len(processes) + args.workers - 1 > maximum) if args.reuse_spare_source_slot else bool(others)
        if capacity_busy:
            initial_count = None
            time.sleep(2); continue
        process = next((p for p in processes if Path(p.get('output', '')).resolve() == old
                        and p['script'] in ('plan_full_gaps.py', 'plan_full_gaps_v2.py')), None)
        checkpoint_path = old / f'{args.hand}-checkpoint.json'
        checkpoint = read(checkpoint_path)
        if not process or not checkpoint: time.sleep(2); continue
        assert not checkpoint['failures']
        if initial_count is None:
            initial_count = len(checkpoint['windows'])
            state.update(status='Source capacity available; waiting for the next complete owned window',
                         initialRetainedWindowCount=initial_count)
            save()
            if time.time() - checkpoint_path.stat().st_mtime > 2: time.sleep(2); continue
        elif len(checkpoint['windows']) <= initial_count:
            time.sleep(2); continue
        diagnostic = read(args.diagnostic)
        assert diagnostic and not diagnostic['physics_failures']
        expected = groups(diagnostic['self_crossings'])
        completed = [[w['first_frame'], w['last_frame']] for w in checkpoint['windows']]
        assert completed == expected[:len(completed)]
        if len(completed) == len(expected): time.sleep(1); continue
        command = subprocess.check_output(['ps', '-p', str(process['pid']), '-o', 'command='], text=True).strip()
        values = shlex.split(command)
        assert '--output-dir' in values and Path(values[values.index('--output-dir') + 1]).resolve() == old
        assert '--primary' in values
        primary = values[values.index('--primary') + 1]
        assert primary in ('23', '34', '23+34') and ',' not in primary
        assert values[values.index('--max-gap-mm') + 1] == '16'
        source = Path(checkpoint['source']).resolve()
        assert Path(values[values.index('--input-path') + 1]).resolve() == source
        seed = out / 'seed'; seed.mkdir()
        prefix = out / f'{args.hand}-original-completed-prefix.json'
        prefix.write_bytes(checkpoint_path.read_bytes())
        preserved = read(prefix); assert len(preserved['windows']) == len(completed)
        calibrated = seed / f'calibrated-search-input-{args.hand}.json'
        calibrated.write_bytes((old / f'calibrated-search-input-{args.hand}.json').read_bytes())
        stub = {'exercise': args.number, 'hand': args.hand, 'source': str(source), 'windows': [], 'failures': [],
                'goal_equivalence': checkpoint['goal_equivalence'], 'world_corrections_m': [[[0., 0., 0.] for _ in range(4)] for _ in range(2880)]}
        (seed / f'{args.hand}-checkpoint.json').write_text(json.dumps(stub, separators=(',', ':')) + '\n')
        state.update(status='Complete prefix retained; replacing only the owned serial tail',
                     retainedPrefix=entry(prefix), calibratedInput=entry(calibrated), sourceInput=entry(source),
                     originalDiagnostic=entry(args.diagnostic), primary=primary, originalWindows=expected,
                     retainedWindows=completed, replacedProcess={'pid': process['pid'], 'command': command, 'signal': 'SIGTERM',
                     'reason': 'Controlled independent-window computation handoff; original fields remain intact'})
        save()
        os.kill(process['pid'], signal.SIGTERM)
        for _ in range(60):
            if subprocess.run(['ps', '-p', str(process['pid']), '-o', 'command='], stdout=subprocess.DEVNULL).returncode: break
            time.sleep(.5)
        else: raise ValueError('Serial source did not exit; do not start duplicate window workers')
        break

    manual_path = root / 'manual-computation-handoffs.json'
    with (root / 'manual-computation-handoffs.lock').open('a') as guard:
        fcntl.flock(guard, fcntl.LOCK_EX)
        manual = read(manual_path) or {}; key = f'{args.number}:{args.hand}'
        previous = manual.get(key)
        manual[key] = {'handoff': str((out / 'hand-state.json').relative_to(root)),
                       'state': str((out / 'hand-state.json').relative_to(root)),
                       'pipeline': str((args.pipeline_dir.resolve() / 'hand-pipeline-state.json').relative_to(root)),
                       'stage': 'Original completed fields retained; independent unchanged-search tail windows running; full clearance pending',
                       'ownership': 'The old automatic/serial stop is a controlled computation handoff, not a new physical failure.',
                       'previousContinuation': previous}
        temporary = manual_path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(manual, indent=2) + '\n'); temporary.replace(manual_path)
        fcntl.flock(guard, fcntl.LOCK_UN)
    worker_script = HERE / 'plan_full_gaps_v2.py'; worker_source = entry(worker_script)
    tasks = []
    for low, high in expected[len(completed):]:
        folder = out / 'windows' / f'{low:04d}-{high:04d}'; folder.mkdir(parents=True)
        rows = [row for row in diagnostic['self_crossings'] if low <= row['frame'] <= high and any(int(k) != 1 for k in row['crossings'])]
        assert groups(rows) == [[low, high]]
        filtered = folder / 'original-window-diagnostic.json'
        filtered.write_text(json.dumps(diagnostic | {'self_crossings': rows, 'partialOriginalWindow': [low, high],
                            'scope': 'Filtered original nong-thumb failure window only; not full-track clearance'}, separators=(',', ':')) + '\n')
        tasks.append({'bounds': [low, high], 'directory': str(folder), 'diagnostic': entry(filtered)})
    state['remainingWindowTasks'] = tasks; state['status'] = 'Disjoint original windows running with the unchanged validated helper'; save()

    def work(task):
        folder = Path(task['directory']); bounds = task['bounds']; key = f'{bounds[0]}-{bounds[1]}'
        assert entry(worker_script) == worker_source
        command = native('plan_full_gaps_v2.py', ['--number', str(args.number), '--hand', args.hand,
            '--input-path', str(source), '--source-sha256', state['sourceInput']['sha256'],
            '--failure-path', task['diagnostic']['path'], '--primary', primary, '--max-gap-mm', '16',
            '--resume-dir', str(seed), '--output-dir', str(folder)])
        log = folder / 'run.log'
        with log.open('w') as stream:
            child = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
            with lock:
                state['activeWindows'][key] = {'pid': child.pid, 'command': command, 'log': str(log), 'bounds': bounds}; save()
            code = child.wait()
        assert entry(worker_script) == worker_source
        report_path = folder / f'{args.hand}-plan.json'; report = read(report_path)
        result = {'bounds': bounds, 'returncode': code, 'log': str(log)}
        if not code:
            assert report and not report['failures']
            assert [[w['first_frame'], w['last_frame']] for w in report['windows']] == [bounds]
            assert report['source_input_sha256'] == state['sourceInput']['sha256']
            result['report'] = entry(report_path)
        else: result['failureReport'] = entry(report_path) if report_path.exists() else None
        with lock:
            state['activeWindows'].pop(key)
            state['completedWindows'].append(result); save()
        return result

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = list(pool.map(work, tasks))
    failed = [result for result in results if result['returncode']]
    if failed:
        state['failures'] = failed; raise ValueError('A measured window remains physically unresolved; preserve all results')
    manifest = {'number': args.number, 'hand': args.hand, 'productionReady': False,
                'sourceInput': state['sourceInput'], 'calibratedInput': state['calibratedInput'],
                'expectedWindows': expected, 'goalEquivalence': checkpoint['goal_equivalence'],
                'fieldReports': [entry(prefix)] + [result['report'] for result in results],
                'workerGenerator': worker_source}
    merge_manifest = out / 'complete-gap-field-manifest.json'
    merge_manifest.write_text(json.dumps(manifest, indent=2) + '\n')
    merged = out / 'merged'; common = ['--number', str(args.number), '--hand', args.hand, '--author-root', str(args.author_root.resolve())]
    merge_command = native('merge_full_gap_tail.py', common + ['--manifest', str(merge_manifest), '--output-dir', str(merged)])
    with (out / 'merge.log').open('w') as stream:
        child = subprocess.Popen(merge_command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        state.update(status='Assembling exact disjoint fields; full source gates remain pending',
                     active={'name': 'merge', 'pid': child.pid, 'command': merge_command}); save()
        assert child.wait() == 0, 'Gap merge failed; do not run CMC'
    command = [sys.executable, '-u', str(HERE / 'run_full_hand_pipeline.py')] + common + [
        '--input-path', str(merged / f'input-{args.hand}.json'), '--output-dir', str(args.pipeline_dir.resolve()), '--start', 'thumb']
    with (out / 'full-pipeline.log').open('w') as stream:
        child = subprocess.Popen(command, cwd=REPO, env=env, stdout=stream, stderr=subprocess.STDOUT)
        state.update(status='Complete disjoint field assembled; continuousCMC and fresh all-five-finger scan running',
                     active={'name': 'full-pipeline', 'pid': child.pid, 'command': command}); save()
        code = child.wait()
    state.pop('active', None)
    state['status'] = ('Fresh complete numerical hand passed; paired/native/visual review pending' if code == 0
                       else 'Incomplete physical context after exact field merge; do not export')
    state['returncode'] = code; save()
except Exception as error:
    state.update(status='Incomplete independent-window continuation; do not export', error=str(error)); save(); raise
