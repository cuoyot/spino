"""Serially check completed approved banks in isolated browser overlays; never approve/publish."""
import argparse, json, os, signal, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts/hanon'))
from bank_contract import read_json, write_json, sha, verify_track
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--numbers',default='3,4,5,6,7,8,9,10');a=p.parse_args()
a.work=a.work.resolve();a.output=a.output.resolve();a.output.mkdir(parents=True,exist_ok=True)
numbers=[int(n) for n in a.numbers.split(',')];assert all(n in range(2,11) for n in numbers)
lock=a.output/'coordinator.lock';fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY);os.write(fd,str(os.getpid()).encode());os.close(fd)
state_path=a.output/'state.json'
state={'pid':os.getpid(),'kind':'Isolated actual browser checks of completed root-approved banks; no source approval, runtime index, integration, native acceptance or publication','numbers':numbers,'completed':[],'jobs':[],'status':'Waiting for complete registered exports'}
if state_path.exists():
 old=read_json(state_path)
 if old.get('jobs'):lock.unlink();raise ValueError('Preserve prior attempt; choose a new queue output directory')
stopping=False
def stop(*_):
 global stopping
 stopping=True
signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
def save():
 state['updatedAt']=time.time();write_json(state_path,state)
def run(command,log,kind,number):
 with log.open('w')as output:
  child=subprocess.Popen(command,cwd=ROOT,env=dict(os.environ,BROWSER_PATH=str(ROOT/'output/review/beta614/headless-chrome-no-extensions.sh'),SPINO_HANON_REVIEW=str(a.output/f'hanon-{number:02d}')),stdout=output,stderr=subprocess.STDOUT)
  job={'number':number,'kind':kind,'pid':child.pid,'command':command,'log':str(log),'startedAt':time.time(),'status':'running'};state['active']=job;state['jobs'].append(job);save();code=child.wait();job.update(status='complete' if code==0 else 'failed',returncode=code,finishedAt=time.time());state['active']=None;save()
 if code:raise RuntimeError('Browser bank check failed; no automatic retry: '+str(log))
try:
 save()
 while not stopping and set(state['completed'])!=set(numbers):
  registry=read_json(a.work/'registry.json');available=[n for n in numbers if n not in state['completed'] and str(n) in registry['exercises']]
  if not available:time.sleep(20);continue
  number=available[0];entry=registry['exercises'][str(number)];verify_track(entry['track'])
  if sha(entry['track'])!=entry['trackSha256']:raise ValueError('Registered source approval changed')
  state.update(status='Checking a complete registered bank in a disposable browser',number=number);save()
  run([sys.executable,str(ROOT/'scripts/review/prepare-hanon-bank-overlay.py'),'--number',str(number),'--output',str(a.output/f'hanon-{number:02d}')],a.output/f'prepare-{number:02d}.log','prepare-isolated-overlay',number)
  run(['/opt/homebrew/opt/node@22/bin/node','--test','--test-force-exit','--test-concurrency=1',str(ROOT/'scripts/review/verify-hanon-bank-browser.mjs')],a.output/f'browser-{number:02d}.log','actual-browser-playback',number)
  evidence=a.output/f'hanon-{number:02d}/verification.json';result=read_json(evidence)
  if result['overlay']['number']!=number or len(result['checks'])!=3:raise ValueError('Incomplete actual browser evidence')
  state['completed'].append(number);state.setdefault('evidence',{})[str(number)]={'path':str(evidence),'sha256':sha(evidence),'humanResponsiveVisualReviewPending':True};state['status']='Waiting for the next completed registered export';save()
 state['status']='All requested isolated browser checks passed; human visual/final integration/native/publication remain open' if set(state['completed'])==set(numbers) else 'Queue stopped after current job; no pending source was approved';save()
except BaseException as error:
 state.update(status='Stopped on failure; preserve evidence; no automatic retry',error=str(error));save();raise
finally:lock.unlink(missing_ok=True)
