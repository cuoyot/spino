"""Bound only this task's numeric Blender producers during long source batches.

The renderer and independent parent audits are excluded. Suspending a numeric
producer retains its process, caches and waiting controller; exact argv is
checked again before every signal. Limits are operational, never pose changes.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--config', type=Path, required=True)
args = parser.parse_args()
root = args.root.resolve(); config = args.config.resolve()
state_path = root / 'source-resource-scheduler-state.json'
assert not state_path.exists(), 'Preserve an existing scheduler state'
allowed = {'plan_full_supports.py', 'plan_full_gaps.py', 'plan_full_gaps_v2.py',
           'plan_full_thumb.py', 'diagnose_full_clearance.py', 'scan_full_track.py',
           'prepare_full_wrist_context.py', 'prepare_full_support_reach.py',
           'prepare_full_free_reach.py', 'prepare_full_thumb_wrist_context.py',
           'audit_full_pair_clearance.py', 'bake_full_pair_native.py'}
history = []; seen = {}; running = True; last_written = None; last_write = 0


def stop_requested(signum, frame):
    global running
    running = False


signal.signal(signal.SIGTERM, stop_requested)
signal.signal(signal.SIGINT, stop_requested)


def producers():
    result = []
    for line in subprocess.check_output(['ps', '-axo', 'pid,ppid,state,args'], text=True).splitlines()[1:]:
        parts = line.split(None, 3)
        if len(parts) != 4: continue
        pid, parent, status, argv = parts
        if '/Blender ' not in argv or 'app-hanon-2-10-2026-10-20' not in argv: continue
        try:
            values = shlex.split(argv); script = Path(values[values.index('--python') + 1]).name
        except (ValueError, IndexError): continue
        if script not in allowed: continue
        key = (int(pid), argv)
        if key not in seen: seen[key] = time.monotonic()
        number = values[values.index('--number') + 1] if '--number' in values else None
        side = values[values.index('--hand') + 1] if '--hand' in values else None
        track = f'{number}:{side}' if number and side else None
        priority = 10 if 'full-authoring-batch-01' in argv else 15
        if 'full-finishers-01' in argv: priority = 20
        if script in ('audit_full_pair_clearance.py', 'bake_full_pair_native.py'): priority = 5
        if script.startswith('prepare_'): priority = min(priority, 8)
        if track == '6:right' and 'full-authoring-batch-01' in argv: priority = 0
        if track == '7:left' and 'full-authoring-batch-01' in argv: priority = 1
        result.append({'pid': int(pid), 'parentPid': int(parent), 'state': status, 'argv': argv,
                       'script': script, 'handTrack': track, 'priority': priority,
                       'firstSeenMonotonic': seen[key], 'suspended': 'T' in status})
    return result


def change(process, sig, reason):
    try:
        current = subprocess.check_output(['ps', '-p', str(process['pid']), '-o', 'args='], text=True).strip()
        if current != process['argv']: return False
        os.kill(process['pid'], sig)
    except (subprocess.CalledProcessError, ProcessLookupError): return False
    event = {'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'pid': process['pid'],
             'argv': current, 'handTrack': process['handTrack'],
             'signal': 'SIGSTOP' if sig == signal.SIGSTOP else 'SIGCONT', 'reason': reason}
    history.append(event)
    with (root / 'source-resource-scheduler-events.jsonl').open('a') as stream: stream.write(json.dumps(event) + '\n')
    return True


while running:
    settings = json.loads(config.read_text())
    maximum = int(settings['maxActiveNumericProducers']); assert 1 <= maximum <= 8
    current = producers(); active = [p for p in current if not p['suspended']]
    if len(active) > maximum:
        for process in sorted(active, key=lambda p: (p['priority'], p['firstSeenMonotonic']), reverse=True)[:len(active) - maximum]:
            change(process, signal.SIGSTOP, 'Keep newly handed-off source work within the numeric producer limit')
    elif len(active) < maximum and settings.get('allowStagedResumption') is True:
        paused = sorted([p for p in current if p['suspended']], key=lambda p: (p['priority'], p['firstSeenMonotonic']))
        for process in paused[:maximum - len(active)]:
            change(process, signal.SIGCONT, 'Replace a finished numeric/audit slot; raw batch progress has priority')
    current = producers()
    state = {'pid': os.getpid(), 'status': 'Bounded source scheduling active; task and all saved data remain intact',
             'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'config': str(config),
             'maxActiveNumericProducers': maximum, 'allowStagedResumption': settings.get('allowStagedResumption') is True,
             'active': [p for p in current if not p['suspended']], 'suspended': [p for p in current if p['suspended']],
             'eventCount': len(history), 'events': 'source-resource-scheduler-events.jsonl',
             'generatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
             'scope': 'Only task-owned numeric source scripts in the allowlist. Renderer/independent root audits are excluded. This scheduler changes no file, geometry, pose, key, note or approval state.'}
    comparable = {k: v for k, v in state.items() if k != 'date'}
    if comparable != last_written or time.monotonic() - last_write >= 60:
        temporary = state_path.with_suffix('.json.tmp'); temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(state_path)
        last_written = comparable; last_write = time.monotonic()
    time.sleep(3)
state = json.loads(state_path.read_text()); state['status'] = 'Scheduler stopped; retained suspended processes require explicit staged resumption'
state['date'] = datetime.datetime.now(datetime.timezone.utc).isoformat(); state_path.write_text(json.dumps(state, indent=2) + '\n')
