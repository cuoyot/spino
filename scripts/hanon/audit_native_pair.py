"""Collect independent read-only full native measurements; never auto-approve motion."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import os
from pathlib import Path
import subprocess
import time
from bank_contract import sha,read_json,write_json,APPROVED_SHA256

ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser()
parser.add_argument('--number',type=int,choices=range(2,11),required=True)
parser.add_argument('--blend',type=Path,required=True)
parser.add_argument('--canonical',type=Path,required=True)
parser.add_argument('--reference',type=Path,default=ROOT/'output/blender/hanon-hands-2026-10-20/keyboard-standard-v2/orientation-repair-02/candidate-08/hanon-piano-candidate-08.blend')
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--workers',type=int,choices=(1,2),default=2)
args=parser.parse_args()
args.blend=args.blend.resolve();args.reference=args.reference.resolve();args.output=args.output.resolve()
args.output.mkdir(parents=True,exist_ok=False)
if sha(args.reference)!=APPROVED_SHA256:raise ValueError('Accepted identity reference changed')
before=sha(args.blend);review=ROOT/'output/review';blender='/Applications/Blender.app/Contents/MacOS/Blender'
sources={'exercises':{'1':{'blend':str(args.reference),'sha256':APPROVED_SHA256},str(args.number):{'blend':str(args.blend),'sha256':before}}}
write_json(args.output/'sources.json',sources)
common=[blender,'--background','--threads','1','--python-exit-code','1','--python']
jobs={name:common+[str(review/script),'--','--input',str(args.blend),'--output',str(args.output/(name+'.json'))]
      for name,script in [('motion','hanon-native-motion-audit.py'),('pad','hanon-five-finger-pad-audit.py'),('keys','hanon-native-key-timeline-audit.py')]}
jobs['identity']=common+[str(review/'hanon-hand-identity-audit.py'),'--','--sources',str(args.output/'sources.json'),'--output',str(args.output/'identity.json')]
jobs['score']=common+[str(Path(__file__).with_name('audit_native_score.py')),'--','--input',str(args.blend),'--canonical',str(args.canonical.resolve()),'--output',str(args.output/'score.json')]
state={'number':args.number,'sourceBlend':str(args.blend),'sourceSha256':before,'status':'Independent native measurements running; no production approval','jobs':{}}
write_json(args.output/'state.json',state)
def run(item):
    name,command=item
    env=dict(os.environ,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1',VECLIB_MAXIMUM_THREADS='1')
    with (args.output/(name+'.log')).open('w') as log:
        process=subprocess.Popen(command,env=env,stdout=log,stderr=subprocess.STDOUT)
        job={'pid':process.pid,'command':command,'auditScriptSha256':sha(command[command.index('--python')+1]),'startedAt':time.time(),'status':'running'}
        write_json(args.output/(name+'-process.json'),job);returncode=process.wait();job.update(status='complete' if returncode==0 else 'failed',returncode=returncode,finishedAt=time.time());write_json(args.output/(name+'-process.json'),job)
    if returncode:raise RuntimeError('Native audit failed: '+str(args.output/(name+'.log')))
    return name,{'report':name+'.json','sha256':sha(args.output/(name+'.json'))}
with ThreadPoolExecutor(max_workers=args.workers) as pool:
    futures=[pool.submit(run,item) for item in jobs.items()]
    try:
        for future in as_completed(futures):
            name,result=future.result();state['jobs'][name]=result;write_json(args.output/'state.json',state);print(name+' native measurements complete',flush=True)
    except BaseException:
        for future in futures:future.cancel()
        raise
if before!=sha(args.blend) or sha(args.reference)!=APPROVED_SHA256:raise ValueError('Native source changed during read-only audits')
state['status']='Independent full native measurements collected; interpret motion/pad diagnostics and inspect representative poses before production approval'
state['productionReady']=False;write_json(args.output/'state.json',state)
