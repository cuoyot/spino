"""Plan real full-exercise pulp supports before free-finger clearance search."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time

from mathutils import Matrix

parser = argparse.ArgumentParser()
parser.add_argument('--number', type=int, choices=range(2,11), required=True)
parser.add_argument('--hand', choices=('left','right'), required=True)
parser.add_argument('--author-root', type=Path, required=True)
parser.add_argument('--input-path', type=Path, required=True)
parser.add_argument('--output-dir', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
root = args.author_root.resolve()
sys.path.insert(0,str(root));sys.path.insert(0,str(root.parent));sys.path.insert(0,str(Path(__file__).resolve().parent))
from input_record_io import load,save
from exact_solver_cache import install
from film_support_first import plan

out = args.output_dir.resolve();out.mkdir(parents=True,exist_ok=True)
assert not (out/f'input-{args.hand}.json').exists(), 'Preserve an existing support attempt'
started = time.monotonic();record = load(args.input_path.resolve(),root,args.hand)
cache = install(record)
progress_rows = []
def progress(row):
    progress_rows.append(row)
    checkpoint = out/f'input-{args.hand}-checkpoint.json'
    temporary = checkpoint.with_suffix('.json.tmp');save(record,temporary);temporary.replace(checkpoint)
    state = {'status':'Scored support selection in progress; no final clearance','exercise':args.number,'hand':args.hand,
             'elapsedSeconds':time.monotonic()-started,'selectedEvents':progress_rows,'exactSearchCache':cache.stats}
    (out/f'{args.hand}-support-progress.json').write_text(json.dumps(state,indent=2)+'\n')
    print(json.dumps({'stage':'full-scored-support','exercise':args.number,'hand':args.hand,
                      'event':{k:v for k,v in row.items() if k in ('first','last','finger','note','advance_m','status')},
                      'seconds':time.monotonic()-started,'cache':cache.stats}),flush=True)
report = plan(record,args.hand,root,Matrix.Rotation(math.radians(16),3,'X'),progress=progress)
report.update({'exercise':args.number,'hand':args.hand,'elapsedSeconds':time.monotonic()-started,
               'inputSha256':hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
               'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               'cacheGeneratorSha256':hashlib.sha256((Path(__file__).parent/'exact_solver_cache.py').read_bytes()).hexdigest(),
               'exactSearchCache':cache.stats,'freshFinalSkinAndNativeScanRequired':True})
save(record,out/f'input-{args.hand}.json')
(out/f'{args.hand}-event-depth-plan.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'exercise':args.number,'hand':args.hand,'scoredEvents':len(report['events']),
                  'correctedEvents':report['corrected_events'],'retainedEvents':report['retained_events'],
                  'unresolvedSupports':len(report['failures']),'seconds':report['elapsedSeconds'],'cache':cache.stats}),flush=True)
assert not report['failures'], ('Scored supports need contextual preparation; preserved report', out/f'{args.hand}-event-depth-plan.json')
