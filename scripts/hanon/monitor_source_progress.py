"""Keep the source-only handoff dashboard current during long bounded jobs.

This reads source reports and existing hash-bound parent approvals. It neither
starts Blender nor creates source/export/visual approval flags.
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

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, required=True)
parser.add_argument('--interval', type=float, default=60)
args = parser.parse_args()
root = args.root.resolve(); here = Path(__file__).resolve().parent
state_path = root / 'source-progress-monitor-state.json'
assert not state_path.exists(), 'Preserve an existing monitor run'
running = True; iterations = 0


def stop_requested(signum, frame):
    global running
    running = False


signal.signal(signal.SIGTERM, stop_requested)
signal.signal(signal.SIGINT, stop_requested)


def write_state(status, code):
    value = {'pid': os.getpid(), 'status': status, 'updatedUtcEpoch': time.time(),
             'iterations': iterations, 'lastSummaryReturncode': code,
             'intervalSeconds': args.interval, 'output': 'source-progress.json',
             'generatorSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
             'scope': 'Only read existing reports and refresh the operational source dashboard; no Blender process, source pose or approval is created.'}
    temporary = state_path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n'); temporary.replace(state_path)


while running:
    process = subprocess.run([sys.executable, str(here / 'summarize_full_authoring.py'),
                              '--root', str(root), '--output', str(root / 'source-progress.json')],
                             stdout=subprocess.DEVNULL)
    iterations += 1; write_state('Operational source dashboard refresh active', process.returncode)
    if process.returncode == 0:
        progress = json.loads((root / 'source-progress.json').read_text())
        if all(row.get('sourceGate', {}).get('passed') is True for row in progress['exercises'].values()):
            write_state('All nine independent source gates are recorded; monitor completed', 0)
            break
    deadline = time.monotonic() + args.interval
    while running and time.monotonic() < deadline: time.sleep(max(0, min(1, deadline - time.monotonic())))
else:
    write_state('Monitor stopped; all source data and producer processes retained', None)
