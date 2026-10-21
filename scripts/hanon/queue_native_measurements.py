"""Collect read-only native diagnostics from completed paired handoffs, without approval."""
import argparse,json,os,signal,subprocess,sys,time
from pathlib import Path
from bank_contract import read_json,write_json,sha
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--numbers',default='6,7,8,9,10');a=p.parse_args();a.root=a.root.resolve();a.output=a.output.resolve();a.output.mkdir(parents=True,exist_ok=True);numbers=[int(n) for n in a.numbers.split(',')];assert all(n in range(2,11) for n in numbers)
lock=a.output/'coordinator.lock';fd=os.open(lock,os.O_WRONLY|os.O_CREAT|os.O_EXCL);os.write(fd,str(os.getpid()).encode());os.close(fd)
state={'pid':os.getpid(),'kind':'Independent read-only native measurements and representative images only; root interpretation/visual approval remain required','status':'Waiting for completed fresh paired native handoffs','completed':[],'jobs':[],'productionReady':False};stopping=False
if (a.output/'state.json').exists():lock.unlink();raise ValueError('Preserve existing attempt; use a fresh collection output')
def stop(*_):
 global stopping
 stopping=True
signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
def save():state['updatedAt']=time.time();write_json(a.output/'state.json',state)
def run(command,number,kind):
 log=a.output/f'{number:02d}-{kind}.log'
 with log.open('w') as stream:
  child=subprocess.Popen(command,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT,env=dict(os.environ,OPENBLAS_NUM_THREADS='1',OMP_NUM_THREADS='1',VECLIB_MAXIMUM_THREADS='1'))
  job={'number':number,'kind':kind,'pid':child.pid,'command':command,'log':str(log),'startedAt':time.time(),'status':'running'};state['active']=job;state['jobs'].append(job);save();code=child.wait();job.update(status='complete' if code==0 else 'failed',returncode=code,finishedAt=time.time());state['active']=None;save()
 if code:raise RuntimeError('Native collection failed; no automatic retry: '+str(log))
try:
 save()
 while not stopping and set(state['completed'])!=set(numbers):
  ready=[n for n in numbers if n not in state['completed'] and (a.root/f'full-native-pairs-03/hanon-{n:02d}/native-review-handoff.json').exists()]
  if not ready:time.sleep(20);continue
  number=ready[0];handoff_path=a.root/f'full-native-pairs-03/hanon-{number:02d}/native-review-handoff.json';handoff=read_json(handoff_path)
  if handoff['number']!=number or handoff.get('status')!='Paired numerical/native agreement passed; independent native/motion/visual review pending':raise ValueError('Paired native agreement is not complete')
  blend=Path(handoff['nativeBlend']);before=sha(blend)
  if before!=handoff['nativeBlendSha256']:raise ValueError('Saved paired native source changed')
  review=a.root/f'native-review-{number:02d}-01';assert not review.exists(),'Native review already exists; do not duplicate or overwrite'
  state.update(status='Collecting completed paired native source; human interpretation pending',number=number);state.setdefault('handoffs',{})[str(number)]={'path':str(handoff_path),'sha256':sha(handoff_path),'nativeSha256':before};save()
  run([sys.executable,str(ROOT/'scripts/hanon/audit_native_pair.py'),'--number',str(number),'--blend',str(blend),'--canonical',str(ROOT/f'public/warmups/hanon-frames-v1/exercises/hanon-{number}.json'),'--output',str(review),'--workers','1'],number,'audits')
  run([sys.executable,str(ROOT/'scripts/hanon/summarize_native_diagnostics.py'),'--motion',str(review/'motion.json'),'--pad',str(review/'pad.json'),'--output',str(review/'diagnostics.json')],number,'diagnostics')
  run(['/Applications/Blender.app/Contents/MacOS/Blender','--background','--threads','1','--python-exit-code','1','--python',str(ROOT/'output/review/hanon-motion-inspection.py'),'--','--input',str(blend),'--output',str(review/'inspection-01'),'--frames','5,23,25,49,191,745,1343,1345,1441,1535,2113,2691,2880','--oblique-frames','25,191,1345,1535,2113,2880'],number,'representative-images')
  if sha(blend)!=before:raise ValueError('Read-only native source changed')
  state['completed'].append(number);state.setdefault('reviews',{})[str(number)]={'path':str(review),'productionReady':False,'rootInterpretationAndVisualApprovalPending':True};state['status']='Waiting for next handoff; collected diagnostics are not approval';save()
 state['status']='Requested diagnostic collection complete; root approval remains open' if set(state['completed'])==set(numbers) else 'Stopped after current collection';save()
except BaseException as error:state.update(status='Stopped on failure; preserve evidence; no automatic retry',error=str(error));save();raise
finally:lock.unlink(missing_ok=True)
