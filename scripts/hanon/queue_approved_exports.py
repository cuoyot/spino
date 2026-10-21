"""Serialize only root-reviewed source handoffs; never approve or publish a bank."""
import argparse
import fcntl
import os
from pathlib import Path
import subprocess
import sys
import time

from bank_contract import read_json, sha, verify_track, write_json


def bank_busy(path):
    if not path.exists():
        return False
    with path.open('r') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return True
        fcntl.flock(lock, fcntl.LOCK_UN)
    return False


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--external-running', type=int, choices=range(2, 11))
    parser.add_argument('--workers', type=int, choices=(1, 2), default=1)
    args = parser.parse_args()
    root, work, destination = [p.resolve() for p in (args.root, args.work, args.destination)]
    work.mkdir(parents=True, exist_ok=True)
    with (root / 'approved-export-queue.lock').open('a') as queue_lock:
        fcntl.flock(queue_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        state = {'pid': os.getpid(), 'kind': 'Only approved source exports; no runtime finalization or publication',
                 'productionApprovalOwner': 'root', 'status': 'waiting', 'jobs': [], 'active': None}
        state_path = root / 'approved-export-queue.json'
        external = args.external_running
        while True:
            registry_path = work / 'registry.json'
            registry = read_json(registry_path) if registry_path.exists() else {'exercises': {}}
            complete = sorted(map(int, registry['exercises']))
            state.update(completed=complete, updatedAt=time.time())
            if bank_busy(work / 'export.lock'):
                state['status'] = 'Waiting for the existing bank controller; no duplicate export started'
                write_json(state_path, state)
                time.sleep(15)
                continue
            if external is not None:
                if external not in complete:
                    state['status'] = 'External export ended without registered completion; human inspection required'
                    write_json(state_path, state)
                    raise RuntimeError(state['status'])
                external = None
            if complete == list(range(2, 11)):
                state['status'] = 'All approved tracks exported; finalization and app/native/public checks remain open'
                write_json(state_path, state)
                return
            candidates = [n for n in range(2, 11) if n not in complete and (root / f'passed-hanon-{n:02d}.json').exists()]
            state['approvedPending'] = candidates
            if not candidates:
                state['status'] = 'Waiting for additional independently reviewed source handoffs'
                write_json(state_path, state)
                time.sleep(15)
                continue
            number = candidates[0]
            track = root / f'passed-hanon-{number:02d}.json'
            if verify_track(track)['number'] != number:
                raise ValueError('Source handoff number does not match its reviewed filename')
            command = [sys.executable, '-u', str(Path(__file__).with_name('export_frame_bank.py')), 'add',
                       '--track', str(track), '--work', str(work), '--destination', str(destination), '--workers', str(args.workers)]
            log_path = root / f'approved-export-{number:02d}-{int(time.time())}.log'
            with log_path.open('x') as log:
                process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
                job = {'number': number, 'pid': process.pid, 'command': command, 'trackSha256': sha(track),
                       'log': str(log_path), 'startedAt': time.time(), 'status': 'running'}
                state.update(status='Exporting a complete independently approved source', active=job)
                state['jobs'].append(job)
                write_json(state_path, state)
                returncode = process.wait()
            job.update(returncode=returncode, finishedAt=time.time(), status='complete' if returncode == 0 else 'failed')
            state['active'] = None
            if returncode:
                state['status'] = 'Export failed; evidence preserved, no automatic retry'
                write_json(state_path, state)
                raise RuntimeError('Inspect the preserved export log: ' + str(log_path))
            write_json(state_path, state)


if __name__ == '__main__':
    main()
