"""Bounded independent support planning; failures remain explicit repair work."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

parser=argparse.ArgumentParser()
parser.add_argument('--numbers',default='3,4,5,6,7,8,9,10')
parser.add_argument('--author-root',type=Path,required=True)
parser.add_argument('--input-dir',type=Path,required=True)
parser.add_argument('--output-dir',type=Path,required=True)
parser.add_argument('--workers',type=int,choices=(1,2),default=2)
args=parser.parse_args()
out=args.output_dir.resolve();out.mkdir(parents=True,exist_ok=True)
script=Path(__file__).resolve().parent/'plan_full_supports.py'
cache_script=script.parent/'exact_solver_cache.py'
environment=dict(os.environ,OPENBLAS_NUM_THREADS='1',VECLIB_MAXIMUM_THREADS='1',OMP_NUM_THREADS='1')
configuration={'supportScriptSha256':hashlib.sha256(script.read_bytes()).hexdigest(),
               'cacheScriptSha256':hashlib.sha256(cache_script.read_bytes()).hexdigest(),
               'authorRoot':str(args.author_root.resolve()),'inputDir':str(args.input_dir.resolve()),
               'numbers':[int(n) for n in args.numbers.split(',')],'workers':args.workers}
config_path=out/'support-batch-configuration.json'
if config_path.exists():assert json.loads(config_path.read_text())==configuration
else:config_path.write_text(json.dumps(configuration,indent=2)+'\n')
generation=out/'generation-source';generation.mkdir(exist_ok=True)
for path in (script,cache_script):
    target=generation/path.name
    if target.exists():assert target.read_bytes()==path.read_bytes()
    else:target.write_bytes(path.read_bytes())
started=time.monotonic();results=[];active={}
def checkpoint():
    snapshot={'pid':os.getpid(),'status':'support-planning-running','elapsedSeconds':time.monotonic()-started,
              'active':dict(active),'completed':list(results),'configuration':configuration}
    temporary=out/'support-batch-state.json.tmp'
    temporary.write_text(json.dumps(snapshot,indent=2)+'\n');temporary.replace(out/'support-batch-state.json')

def process(task):
    number,hand=task;key=f'{number}:{hand}';folder=out/f'hanon-{number:02d}'
    source=args.input_dir.resolve()/f'hanon-{number:02d}/input-{hand}.json'
    source_report=source.parent/f'{hand}-input-preparation.json'
    deadline=time.monotonic()+3600
    while not source_report.exists():
        if time.monotonic()>deadline:raise TimeoutError(('Full source input was not prepared',source))
        time.sleep(5)
    prepared=json.loads(source_report.read_text())
    assert source.exists() and hashlib.sha256(source.read_bytes()).hexdigest()==prepared['inputSha256']
    report_path=folder/f'{hand}-event-depth-plan.json';destination=folder/f'input-{hand}.json'
    if report_path.exists() and destination.exists():
        report=json.loads(report_path.read_text());assert report['inputSha256']==prepared['inputSha256']
        return {'number':number,'hand':hand,'status':'existing-support-needs-context' if report['failures'] else 'existing-scored-supports-selected',
                'unresolvedSupports':len(report['failures']),'outputSha256':hashlib.sha256(destination.read_bytes()).hexdigest()}
    log=out/f'hanon-{number:02d}-{hand}-support.log'
    assert not log.exists() and not destination.exists(),('Preserve partial support attempt',log)
    command=['/Applications/Blender.app/Contents/MacOS/Blender','--background','--threads','1','--python-exit-code','1','--python',str(script),'--',
             '--number',str(number),'--hand',hand,'--author-root',str(args.author_root.resolve()),'--input-path',str(source),'--output-dir',str(folder)]
    with log.open('x') as stream:
        process=subprocess.Popen(command,env=environment,stdout=stream,stderr=subprocess.STDOUT)
        active[key]={'pid':process.pid,'command':command,'log':str(log)}
        code=process.wait()
    active.pop(key,None)
    row={'number':number,'hand':hand,'returncode':code,'log':str(log)}
    if report_path.exists() and destination.exists():
        report=json.loads(report_path.read_text())
        row.update({'status':'scored-support-needs-context' if report['failures'] else 'scored-supports-selected',
                    'events':len(report['events']),'correctedEvents':report['corrected_events'],
                    'unresolvedSupports':len(report['failures']),'seconds':report['elapsedSeconds'],
                    'outputSha256':hashlib.sha256(destination.read_bytes()).hexdigest()})
    else:row['status']='support-preparation-exception'
    return row

tasks=[(number,hand) for number in configuration['numbers'] for hand in ('left','right')]
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    futures={pool.submit(process,task):task for task in tasks}
    while futures:
        done=[future for future in futures if future.done()]
        for future in done:
            task=futures.pop(future)
            try:row=future.result()
            except Exception as error:row={'number':task[0],'hand':task[1],'status':'support-controller-exception','error':str(error)}
            results.append(row);print(json.dumps(row),flush=True)
        checkpoint()
        if futures:time.sleep(5)
snapshot=json.loads((out/'support-batch-state.json').read_text());snapshot['status']='support-selection-finished-context-and-full-skin-clearance-still-required'
(out/'support-batch-state.json').write_text(json.dumps(snapshot,indent=2)+'\n')
