"""Resume bounded full-source input preparation without native rendering."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument('--numbers', default='3,4,5,6,7,8,9,10')
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--source-index', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args()
out = args.output_dir.resolve();out.mkdir(parents=True, exist_ok=True)
environment = dict(os.environ, OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')
script = Path(__file__).resolve().parent/'prepare_full_inputs.py'
started = time.monotonic()
results = []
state = {'pid':os.getpid(),'status':'running','tasks':results}
def checkpoint():
    state['elapsedSeconds'] = time.monotonic()-started
    temporary = out/'batch-state.json.tmp'
    temporary.write_text(json.dumps(state, indent=2)+'\n');temporary.replace(out/'batch-state.json')

for number in map(int, args.numbers.split(',')):
    assert number in range(2, 11)
    for hand in ('left', 'right'):
        folder = out/f'hanon-{number:02d}'
        destination = folder/f'input-{hand}.json';report = folder/f'{hand}-input-preparation.json'
        if destination.exists() and report.exists():
            saved = json.loads(report.read_text())
            assert saved['inputSha256'] == hashlib.sha256(destination.read_bytes()).hexdigest()
            results.append({'number':number,'hand':hand,'status':'verified-existing-complete-input'});checkpoint();continue
        assert not destination.exists(), ('Preserve incomplete input and use a new run', destination)
        log = out/f'hanon-{number:02d}-{hand}.log'
        assert not log.exists(), ('Preserve prior attempt and use a new run', log)
        command = ['/Applications/Blender.app/Contents/MacOS/Blender','--background','--threads','1','--python-exit-code','1','--python',str(script),'--',
                   '--number',str(number),'--hand',hand,'--author-root',str(args.author_root.resolve()),'--source-index',str(args.source_index.resolve()),'--output-dir',str(folder)]
        state['active'] = {'number':number,'hand':hand,'command':command,'log':str(log)};checkpoint()
        with log.open('x') as stream:
            process = subprocess.Popen(command, env=environment, stdout=stream, stderr=subprocess.STDOUT)
            state['active']['childPid'] = process.pid;checkpoint()
            code = process.wait()
        row = {'number':number,'hand':hand,'status':'complete-input' if code == 0 else 'preparation-failed','returncode':code,'log':str(log)}
        if code == 0:
            assert destination.exists() and report.exists()
            saved = json.loads(report.read_text());row.update({'seconds':saved['elapsedSeconds'],'inputSha256':saved['inputSha256']})
        results.append(row);print(json.dumps(row),flush=True);checkpoint()
state.pop('active', None)
state['status'] = 'complete-inputs' if all(r.get('returncode',0) == 0 for r in results) else 'completed-with-input-failures'
checkpoint()
sys.exit(0 if state['status'] == 'complete-inputs' else 1)
