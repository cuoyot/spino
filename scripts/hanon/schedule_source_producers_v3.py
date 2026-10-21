"""Bound task-owned numerical source producers using their actual output stage.

Only operational process scheduling changes here. Source poses, caches, render
settings and approval data remain untouched. The original scheduler is retained
as evidence; renderer and independent parent audits are excluded.
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
state_path = root / 'source-resource-scheduler-v3-state.json'
events_path = root / 'source-resource-scheduler-v3-events.jsonl'
assert not state_path.exists(), 'Preserve an existing scheduler state'
allowed = {'plan_full_supports.py', 'plan_full_gaps.py', 'plan_full_gaps_v2.py',
           'plan_full_thumb.py', 'diagnose_full_clearance.py', 'scan_full_track.py',
           'prepare_full_wrist_context.py', 'prepare_full_support_reach.py',
           'prepare_full_free_reach.py', 'prepare_full_thumb_wrist_context.py',
           'audit_full_pair_clearance.py', 'bake_full_pair_native.py'}
seen = {}; checkpoint_cache = {}; history = []; running = True
last_written = None; last_write = 0


def read(path):
    try: return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError): return None


def stop_requested(signum, frame):
    global running
    running = False


signal.signal(signal.SIGTERM, stop_requested)
signal.signal(signal.SIGINT, stop_requested)


def argument(values, name):
    try: return values[values.index(name) + 1]
    except (ValueError, IndexError): return None


def completed_thumb_frame(output, side):
    if not output or not side: return 0
    path = Path(output) / f'{side}-thumb-checkpoint.json'
    key = str(path)
    if key not in checkpoint_cache or time.monotonic() - checkpoint_cache[key][0] > 30:
        data = read(path) or {}
        checkpoint_cache[key] = (time.monotonic(), max(
            [int(window.get('last_frame', 0)) for window in data.get('windows', [])] or [0]))
    return checkpoint_cache[key][1]


def producers():
    result = []
    for line in subprocess.check_output(['ps', '-axo', 'pid,ppid,state,args'], text=True).splitlines()[1:]:
        parts = line.split(None, 3)
        if len(parts) != 4: continue
        pid, parent, status, argv = parts
        if '/Blender ' not in argv or str(root.name) not in argv or status.startswith('Z'): continue
        try:
            values = shlex.split(argv); script = Path(values[values.index('--python') + 1]).name
        except (ValueError, IndexError): continue
        if script not in allowed: continue
        output = argument(values, '--output-dir') or argument(values, '--output')
        if not output: continue
        output = Path(output).resolve()
        try: output.relative_to(root)
        except ValueError: continue
        key = (int(pid), argv)
        if key not in seen: seen[key] = time.monotonic()
        number = argument(values, '--number'); side = argument(values, '--hand')
        track = f'{number}:{side}' if number and side else None
        # Inputs may name old raw directories. Only the actual output stage
        # determines whether this process belongs to the raw batch.
        priority = 10 if 'full-authoring-batch-01' in output.parts else 15
        reason = 'Raw source progression' if priority == 10 else 'Remaining numerical source work'
        completed_frame = 0
        if script == 'scan_full_track.py':
            priority = 3; reason = 'Finish the fresh full five-finger scan'
        elif script in ('audit_full_pair_clearance.py', 'bake_full_pair_native.py'):
            priority = 4; reason = 'Finish a numerically cleared native pair handoff'
        elif script.startswith('prepare_'):
            priority = 7; reason = 'Finish bounded measured preparation'
        elif script == 'plan_full_thumb.py':
            completed_frame = completed_thumb_frame(output, side)
            if completed_frame >= 2304:
                priority = 9; reason = 'Finish an already advanced CMC route before another long search'
        result.append({'pid': int(pid), 'parentPid': int(parent), 'state': status, 'argv': argv,
                       'script': script, 'handTrack': track, 'output': str(output),
                       'priority': priority, 'priorityReason': reason,
                       'lastCompletedThumbFrame': completed_frame,
                       'firstSeenMonotonic': seen[key], 'suspended': 'T' in status})
    return result


def change(process, sig, reason):
    try:
        current = subprocess.check_output(['ps', '-p', str(process['pid']), '-o', 'args='], text=True).strip()
        if current != process['argv']: return False
        os.kill(process['pid'], sig)
    except (subprocess.CalledProcessError, ProcessLookupError): return False
    event = {'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'pid': process['pid'],
             'argv': current, 'handTrack': process['handTrack'], 'output': process['output'],
             'priority': process['priority'],
             'signal': 'SIGSTOP' if sig == signal.SIGSTOP else 'SIGCONT', 'reason': reason}
    history.append(event)
    with events_path.open('a') as stream: stream.write(json.dumps(event) + '\n')
    return True


while running:
    settings = read(config)
    if settings is None:
        time.sleep(1); continue
    extras = settings.get('additionalNumericScripts', [])
    assert all(Path(name).name == name and name.endswith('.py') and (Path(__file__).parent / name).is_file() for name in extras), 'Only existing maintained source helpers may extend the allowlist'
    allowed.update(extras)
    maximum = int(settings['maxActiveNumericProducers']); assert 1 <= maximum <= 8
    current = producers(); active = [p for p in current if not p['suspended']]
    if len(active) > maximum:
        for process in sorted(active, key=lambda p: (p['priority'], p['firstSeenMonotonic']), reverse=True)[:len(active) - maximum]:
            change(process, signal.SIGSTOP, 'Keep a queued stage handoff within the unchanged producer limit')
    elif settings.get('allowStagedResumption') is True:
        paused = sorted([p for p in current if p['suspended']], key=lambda p: (p['priority'], p['firstSeenMonotonic']))
        if len(active) < maximum:
            for process in paused[:maximum - len(active)]:
                change(process, signal.SIGCONT, 'Replace a finished slot using the actual output-stage priority')
        elif active and paused:
            worst = max(active, key=lambda p: (p['priority'], p['firstSeenMonotonic']))
            best = paused[0]
            if best['priority'] < worst['priority']:
                if change(worst, signal.SIGSTOP, 'Preserve the same producer count while finishing a higher-priority output stage'):
                    change(best, signal.SIGCONT, 'Resume the higher-priority output stage in the retained slot')
    current = producers()
    state = {'pid': os.getpid(), 'status': 'Bounded source scheduling active; task and all saved data remain intact',
             'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'config': str(config),
             'maxActiveNumericProducers': maximum, 'allowStagedResumption': settings.get('allowStagedResumption') is True,
             'active': [p for p in current if not p['suspended']], 'suspended': [p for p in current if p['suspended']],
             'eventCount': len(history), 'events': events_path.name,
             'generatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
             'scope': 'Only allowlisted task-owned numerical producer processes. Renderer and independent parent audits excluded. Only operational logs/state are written; source files, geometry, poses, notes and approvals are unchanged.'}
    comparable = {k: v for k, v in state.items() if k != 'date'}
    if comparable != last_written or time.monotonic() - last_write >= 60:
        temporary = state_path.with_suffix('.json.tmp'); temporary.write_text(json.dumps(state, indent=2) + '\n'); temporary.replace(state_path)
        last_written = comparable; last_write = time.monotonic()
    time.sleep(3)
state = read(state_path) or {}
state['status'] = 'Scheduler stopped; retained suspended processes require explicit staged resumption'
state['date'] = datetime.datetime.now(datetime.timezone.utc).isoformat(); state_path.write_text(json.dumps(state, indent=2) + '\n')
