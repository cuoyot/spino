"""Plan a smooth simultaneous gap field from this score's actual intersections."""
import argparse, json, math, sys, time, hashlib
from pathlib import Path
import numpy as np
from mathutils import Matrix
ROOT=Path(__file__).resolve().parents[2]/'output/blender/hanon-hands-2026-10-20/keyboard-standard-v2'
sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT.parent))
from input_record_io import load,save
from excerpt_input_solver import solve_index
from excerpt_free_preparation import contact_distances
from excerpt_coordinated_gaps import apply
from excerpt_goal_cache import precalibrate
from self_clearance import prepare_partitions,crossings
from excerpt_collision_pairs import prepare as prepare_partners,collisions as collision_partners
from thumb_clearance_path import windows

parser=argparse.ArgumentParser();parser.add_argument('--number',type=int,required=True);parser.add_argument('--hand',choices=['left','right'],required=True);parser.add_argument('--pairs',required=True);parser.add_argument('--input-path',type=Path);parser.add_argument('--failure-path',type=Path);parser.add_argument('--output-dir',type=Path,required=True);parser.add_argument('--max-gap-mm',type=float,default=16)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);start=time.monotonic();out=args.output_dir;out.mkdir(parents=True,exist_ok=True)
assert not (out/f'input-{args.hand}.json').exists(),('Preserve prepared record',out)
baseline=ROOT/f'film-excerpts-08/hanon-{args.number:02d}/owned-baseline'
record=load(args.input_path or baseline/f'input-{args.hand}.json',ROOT,args.hand)
source=json.loads((args.failure_path or baseline/f'{args.hand}-scan.json').read_text())
if 'non_thumb_failures' in source:source={'self_crossings':source['non_thumb_failures']}
pairs=[tuple(map(int,p.split('-'))) for p in args.pairs.split(',')]
assert all(b==a+1 and 2<=a<b<=5 for a,b in pairs)
assert len(record['wrists'])==2880, 'A full native source is required'
from exact_solver_cache import install
cache=install(record);solve_index=cache.solve;crossings=cache.cross
import excerpt_goal_cache
excerpt_goal_cache.solve_index=cache.solve
rotation=Matrix.Rotation(math.radians(16),3,'X');partitions=prepare_partitions(record['geometry']);partner_parts=prepare_partners(record['geometry']);distances=contact_distances(record);count=len(record['wrists'])
report={'exercise':args.number,'hand':args.hand,'pairs':pairs,'method':'Small smooth simultaneous additional free-neighbour gaps. Weighted least-norm endpoint offsets pin prepared/playing fingers and avoid pushing a separated digit into its next neighbour. Test the first feasible gap and three larger neighbours; expand to the full grid only when those candidates do not provide a bounded path. Fixed bones, score, hand materials and keyboard retained.','windows':[],'failures':[]}
report['source_input_sha256']=hashlib.sha256(args.input_path.read_bytes()).hexdigest()
report['generator_sha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
report['full_five_finger_native_audit_required']=True
report['staging']='This stage clears only the explicitly selected adjacent-digit pairs. All actual keys and idle skin clearances still apply. Thumb and other self intersections are retained in a separate post-stage report and require correction plus a complete five-finger scan before native bake.'
report['goal_equivalence']=precalibrate(record,rotation,progress=lambda r:print(json.dumps({'stage':'goal-equivalence','hand':args.hand,**r,'seconds':round(time.monotonic()-start,1)}),flush=True))
indices=[row['frame']-1 for row in source['self_crossings'] if any(int(f)!=1 for f in row['crossings'])]
states=np.arange(0,args.max_gap_mm+.01,1);gaps=states*.001;route=np.zeros(count)
step=(states[:,None]-states[None,:])**2;transition=8*step;transition[step>1.51**2]=np.inf
for low,high in windows(indices,count,padding=10):
    costs=np.full((high-low+1,len(states)),np.inf);evaluated=0;exceptions=[];tested=[set() for _ in range(high-low+1)]
    def valid(i,gap):
        original,offsets,feasible=apply(record,args.hand,i,pairs,gap,distances)
        try:
            if not feasible:return False
            solution,vertices,targets,check=solve_index(record,i,rotation,thumb_clearance=(0,0))
            partners=collision_partners(vertices,partner_parts)
            selected_cross=any(partners.get(a,{}).get(b,0) or partners.get(b,{}).get(a,0) for a,b in pairs)
            return not selected_cross and not check['white_collisions'] and not check['black_collisions'] and all(r['finger']==int(record['metadata']['active_finger'][i]) or r['minimum_actual_key_clearance_m'] is None or r['minimum_actual_key_clearance_m']>.00045 for r in check['fingers'])
        except Exception as error:
            if len(exceptions)<10:exceptions.append({'frame':i+1,'gap_m':gap,'error':str(error)})
            return False
        finally:
            for f,point in original.items():record['world'][f][i]=point
    def evaluate(i,j):
        tested[i-low].add(j)
        if i in (low,high) and i not in (0,count-1) and gaps[j]:return 0
        if valid(i,float(gaps[j])):costs[i-low,j]=.1*states[j]**2
        return 1
    for i in range(low,high+1):
        found=None
        for j,gap in enumerate(gaps):
            evaluated+=evaluate(i,j)
            if math.isfinite(costs[i-low,j]):found=j;break
        if found is not None:
            for j in range(found+1,min(len(gaps),found+4)):evaluated+=evaluate(i,j)
    possible=np.isfinite(costs).any(axis=1)
    if not possible.all():
        report['failures'].append({'first_frame':low+1,'last_frame':high+1,'infeasible_frames':(np.where(~possible)[0]+low+1).tolist(),'reason':'No feasible simultaneous free gap state','exceptions':exceptions});break
    np.savez_compressed(out/f'{args.hand}-coordinated-window-{low+1}-{high+1}.npz',costs=costs,gaps=gaps,first=low,last=high)
    raw=costs.copy()
    values=np.where(np.isfinite(raw[0]),0.,np.inf)
    actual_step=np.abs(states[:,None]-states[None,:])
    for row in range(1,len(raw)):
        values=np.min(np.maximum(values[:,None],actual_step),axis=0);values[~np.isfinite(raw[row])]=np.inf
    bound=max(1.51,float(np.min(values))+1e-8)
    transition=8*actual_step**2;transition[actual_step>bound]=np.inf
    def route_costs(raw):
        costs=raw.copy();previous=np.zeros(costs.shape,dtype=int)
        for row in range(1,len(costs)):
            candidates=costs[row-1,:,None]+transition;previous[row]=np.argmin(candidates,axis=0);costs[row]+=np.min(candidates,axis=0)
        return costs,previous
    costs,previous=route_costs(raw);refined=False
    last=int(np.argmin(costs[-1]))
    if not math.isfinite(costs[-1,last]):
        refined=True;costs=raw.copy()
        for i in range(low,high+1):
            for j in range(len(gaps)):
                if j not in tested[i-low]:evaluated+=evaluate(i,j)
        costs,previous=route_costs(costs);last=int(np.argmin(costs[-1]))
    if not math.isfinite(costs[-1,last]):
        report['failures'].append({'first_frame':low+1,'last_frame':high+1,'reason':'No continuous bounded simultaneous gap route'});break
    path=np.zeros(high-low+1)
    for row in range(len(costs)-1,-1,-1):path[row]=gaps[last];last=previous[row,last]
    for iteration in range(2):
        proposal=path.copy()
        for row in range(1,len(path)-1):
            value=(path[row-1]+2*path[row]+path[row+1])/4
            if abs(value-path[row])>1e-10 and valid(low+row,float(value)):proposal[row]=value
        path=proposal
    route[low:high+1]=path
    window={'first_frame':low+1,'last_frame':high+1,'evaluated_states':evaluated,'expanded_to_full_gap_grid':refined,'measured_authoring_step_bound_mm':bound,'authoring_bound_is_not_anatomical_acceptance':True,'maximum_extra_gap_per_pair_m':float(path.max()),'maximum_gap_step_m':float(np.max(np.abs(np.diff(path)))) if len(path)>1 else 0,'geometry_checked_relaxation_passes':2}
    report['windows'].append(window)
    (out/f'{args.hand}-route-checkpoint.json').write_text(json.dumps(report|{'gap_track_m':route.tolist()},indent=2)+'\n')
    print(json.dumps({'exercise':args.number,'hand':args.hand,'stage':'simultaneous-gap','window':window,'seconds':round(time.monotonic()-start,1)}),flush=True)
report['gap_track_m']=route.tolist();report['actual_free_offsets_m']=[]
if not report['failures']:
    for i,gap in enumerate(route):
        if gap:
            _,offsets,feasible=apply(record,args.hand,i,pairs,float(gap),distances);assert feasible
            report['actual_free_offsets_m'].append({'frame':i+1,'offsets':offsets})
report['exact_search_cache']=cache.stats
report['seconds']=time.monotonic()-start
(out/f'{args.hand}-plan.json').write_text(json.dumps(report,indent=2)+'\n')
if report['failures']:raise ValueError(report['failures'])
save(record,out/f'input-{args.hand}.json')
remaining=[]
for i in range(count):
    solution,vertices,targets,check=solve_index(record,i,rotation,thumb_clearance=(0,0));cross=crossings(vertices,partitions)
    if any(f!=1 for f in cross):remaining.append({'frame':i+1,'crossings':cross})
(out/f'{args.hand}-remaining-crossings.json').write_text(json.dumps({'non_thumb_failures':remaining},indent=2)+'\n')
print(json.dumps({'status':'Selected simultaneous free-gap preparation only; remaining self/support/CMC/native review pending','exercise':args.number,'hand':args.hand,'remaining_non_thumb_frames':len(remaining),'seconds':time.monotonic()-start}),flush=True)
