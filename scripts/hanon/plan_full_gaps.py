"""Full-track free-neighbour preparation with measured route bottlenecks.

Candidate authoring controls are not clinical limits. The actual selected
geometry is checked during smoothing; fresh full scans/native review follow.
"""
import argparse,json,math,sys,time
from pathlib import Path
import numpy as np
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]/'output/blender/hanon-hands-2026-10-20/keyboard-standard-v2'
sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.path.insert(0,str(ROOT));sys.path.insert(0,str(ROOT.parent))
from input_record_io import load,save
from excerpt_input_solver import solve_index
from excerpt_free_preparation import contact_distances
from excerpt_gap_family import MODES,offsets
from excerpt_goal_cache import precalibrate
from self_clearance import prepare_partitions,crossings
from thumb_clearance_path import windows

parser=argparse.ArgumentParser();parser.add_argument('--number',type=int,required=True);parser.add_argument('--hand',required=True);parser.add_argument('--input-path',type=Path,required=True);parser.add_argument('--failure-path',type=Path,required=True);parser.add_argument('--primary',default='23+34');parser.add_argument('--output-dir',type=Path,required=True);parser.add_argument('--max-gap-mm',type=int,default=16)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);start=time.monotonic();out=args.output_dir;out.mkdir(parents=True,exist_ok=True);assert not(out/f'input-{args.hand}.json').exists()
record=load(args.input_path,ROOT,args.hand);source=json.loads(args.failure_path.read_text());source_rows=source.get('self_crossings',source.get('non_thumb_failures',[]))
from exact_solver_cache import install
cache=install(record)
solve_index=cache.solve;crossings=cache.cross
import excerpt_goal_cache
excerpt_goal_cache.solve_index=cache.solve
rotation=Matrix.Rotation(math.radians(16),3,'X');partitions=prepare_partitions(record['geometry']);distances=contact_distances(record);count=len(record['wrists'])
report={'exercise':args.number,'hand':args.hand,'source':str(args.input_path),'method':'Independent adjacent gaps are numerical preparation controls, not held notes. Weighted least-norm free endpoint offsets pin real supports; a free goal may follow its fixed-length reach sphere. Actual full five-finger skin/key checks select states, with bounded world-space correction steps and geometric smoothing. Contact timing, joint distribution, hand identity, wrist and keyboard stay fixed.','modes':[name for name,_ in MODES],'windows':[],'failures':[]}
report['goal_equivalence']=precalibrate(record,rotation,progress=lambda r:print(json.dumps({'stage':'goal-equivalence','hand':args.hand,**r,'seconds':round(time.monotonic()-start,1)}),flush=True))
save(record,out/f'calibrated-search-input-{args.hand}.json')
primary=[name for name,_ in MODES].index(args.primary)
states=[(-1,0)]+[(mode,gap) for mode in range(len(MODES)) for gap in range(1,args.max_gap_mm+1)]
state_ids={(mode,gap):sid for sid,(mode,gap) in enumerate(states)};sid_count=len(states);maximum_step=.00301
route_deltas=np.zeros((count,4,3));route_states=np.zeros(count,dtype=int)
indices=[row['frame']-1 for row in source_rows if any(int(f)!=1 for f in row['crossings'])]
for low,high in windows(indices,count,padding=12):
    length=high-low+1;costs=np.full((length,sid_count),np.inf);deltas=np.zeros((length,sid_count,4,3));tested=[set() for _ in range(length)];evaluated=0;exceptions=[]
    def valid_delta(i,delta):
        original={f:record['world'][f][i].copy() for f in range(2,6)}
        try:
            for f,point in original.items():record['world'][f][i]=point+Vector(delta[f-2])
            solution,vertices,targets,check=solve_index(record,i,rotation,thumb_clearance=(0,0));cross=crossings(vertices,partitions)
            return not any(int(f)!=1 for f in cross) and not check['white_collisions'] and not check['black_collisions'] and all(row['finger']==int(record['metadata']['active_finger'][i]) or row['minimum_actual_key_clearance_m'] is None or row['minimum_actual_key_clearance_m']>.00045 for row in check['fingers'])
        except Exception as error:
            if len(exceptions)<8:exceptions.append({'frame':i+1,'error':str(error)})
            return False
        finally:
            for f,point in original.items():record['world'][f][i]=point
    def evaluate(i,sid):
        row=i-low
        if sid in tested[row]:return 0
        tested[row].add(sid)
        if i in (low,high) and i not in (0,count-1) and sid:return 0
        mode,gap=states[sid];delta=np.zeros((4,3)) if sid==0 else offsets(record,args.hand,i,mode,gap*.001,distances,rotation)
        if delta is not None and valid_delta(i,delta):
            deltas[row,sid]=delta;costs[row,sid]=.1*float(np.sum((delta/.001)**2))
        return 1
    def evaluate_mode(i,mode,extra=3,full=False):
        number=0;found=None
        for gap in range(1,args.max_gap_mm+1):
            sid=state_ids[(mode,gap)];number+=evaluate(i,sid)
            if math.isfinite(costs[i-low,sid]):found=gap;break
        if found is not None:
            stop=args.max_gap_mm+1 if full else min(args.max_gap_mm+1,found+extra+1)
            for gap in range(found+1,stop):number+=evaluate(i,state_ids[(mode,gap)])
        return number
    primary_bad=[]
    for i in range(low,high+1):
        evaluated+=evaluate(i,0);evaluated+=evaluate_mode(i,primary)
        if (i-low)%24==0:print(json.dumps({'stage':'full-gap-candidates','exercise':args.number,'hand':args.hand,'window':[low+1,high+1],'frame':i+1,'evaluated':evaluated,'cache':cache.stats,'seconds':time.monotonic()-start}),flush=True)
        if not np.isfinite(costs[i-low]).any():primary_bad.append(i)
    fallback_rows=sorted({j for i in primary_bad for j in range(max(low,i-12),min(high,i+12)+1)})
    for i in fallback_rows:
        for mode in range(len(MODES)):
            if mode!=primary:evaluated+=evaluate_mode(i,mode)
    possible=np.isfinite(costs).any(axis=1)
    if not possible.all():
        np.savez_compressed(out/f'{args.hand}-window-{low+1}-{high+1}-infeasible.npz',costs=costs,deltas=deltas,states=np.array(states),first=low,last=high)
        report['failures'].append({'first_frame':low+1,'last_frame':high+1,'infeasible_frames':(np.where(~possible)[0]+low+1).tolist(),'reason':'No physically clear gap-family state','exceptions':exceptions});break
    np.savez_compressed(out/f'{args.hand}-window-{low+1}-{high+1}-feasible.npz',costs=costs,deltas=deltas,states=np.array(states),first=low,last=high)
    def measured_bottleneck(raw):
        values=np.where(np.isfinite(raw[0]),0.0,np.inf)
        for row in range(1,length):
            difference=(deltas[row-1,:,None]-deltas[row,None,:])/.001
            step=np.max(np.linalg.norm(difference,axis=-1),axis=-1)
            values=np.min(np.maximum(values[:,None],step),axis=0)
            values[~np.isfinite(raw[row])]=np.inf
        return float(np.min(values))*.001
    maximum_step=max(.00301,measured_bottleneck(costs)+1e-9)
    def route_costs(raw):
        cumulative=raw.copy();previous=np.zeros(raw.shape,dtype=np.int16)
        for row in range(1,length):
            difference=(deltas[row-1,:,None]-deltas[row,None,:])/.001
            step=np.max(np.linalg.norm(difference,axis=-1),axis=-1)
            transitions=8*np.sum(difference**2,axis=(-2,-1));transitions[step>maximum_step/.001]=np.inf
            values=cumulative[row-1,:,None]+transitions;previous[row]=np.argmin(values,axis=0);cumulative[row]+=np.min(values,axis=0)
        return cumulative,previous
    cumulative,previous=route_costs(costs);last=int(np.argmin(cumulative[-1]));refined=False
    if not math.isfinite(cumulative[-1,last]):
        refined=True
        for i in (fallback_rows or list(range(low,high+1))):
            for mode in range(len(MODES)):evaluated+=evaluate_mode(i,mode,full=True)
        np.savez_compressed(out/f'{args.hand}-window-{low+1}-{high+1}-refined.npz',costs=costs,deltas=deltas,states=np.array(states),first=low,last=high)
        cumulative,previous=route_costs(costs);last=int(np.argmin(cumulative[-1]))
    if not math.isfinite(cumulative[-1,last]):
        report['failures'].append({'first_frame':low+1,'last_frame':high+1,'reason':'Feasible family states do not form a continuous bounded correction route','maximum_correction_step_m':maximum_step});break
    path=np.zeros(length,dtype=int)
    for row in range(length-1,-1,-1):path[row]=last;last=int(previous[row,last])
    values=deltas[np.arange(length),path].copy()
    for _ in range(2):
        proposed=values.copy()
        for row in range(1,length-1):
            i=low+row;delta=(values[row-1]+2*values[row]+values[row+1])/4
            for f in range(2,6):
                if distances[f][i]==0:delta[f-2]=0
            if max(np.linalg.norm(delta-values[row-1],axis=1).max(),np.linalg.norm(values[row+1]-delta,axis=1).max())>maximum_step:continue
            if np.max(np.abs(delta-values[row]))>1e-10 and valid_delta(i,delta):proposed[row]=delta
        values=proposed
    route_deltas[low:high+1]=values;route_states[low:high+1]=path
    window={'first_frame':low+1,'last_frame':high+1,'evaluated_states':evaluated,'primary_infeasible_frames':[i+1 for i in primary_bad],'fallback_frames':len(fallback_rows),'full_grid_bridge_refinement':refined,'measured_authoring_route_bound_m':maximum_step,'authoring_bound_is_not_anatomical_acceptance':True,'maximum_world_correction_m':float(np.linalg.norm(values,axis=-1).max()),'maximum_world_correction_step_m':float(np.linalg.norm(np.diff(values,axis=0),axis=-1).max()) if length>1 else 0,'geometry_checked_relaxation_passes':2}
    report['windows'].append(window)
    (out/f'{args.hand}-checkpoint.json').write_text(json.dumps(report|{'world_corrections_m':route_deltas.tolist()},indent=2)+'\n')
    print(json.dumps({'exercise':args.number,'hand':args.hand,'stage':'independent-gap-family','window':window,'seconds':round(time.monotonic()-start,1)}),flush=True)
report['exact_search_cache']=cache.stats
report['source_input_sha256']=__import__('hashlib').sha256(args.input_path.read_bytes()).hexdigest()
report['generator_sha256']=__import__('hashlib').sha256(Path(__file__).read_bytes()).hexdigest()
report['fresh_full_skin_and_native_audit_required']=True
report['seconds']=time.monotonic()-start;report['world_corrections_m']=route_deltas.tolist();report['selected_states']=[{'mode':'zero' if sid==0 else MODES[states[sid][0]][0],'nominal_gap_mm':states[sid][1]} for sid in route_states]
(out/f'{args.hand}-plan.json').write_text(json.dumps(report,indent=2)+'\n')
if report['failures']:raise ValueError(report['failures'])
for i,delta in enumerate(route_deltas):
    for f in range(2,6):record['world'][f][i]+=Vector(delta[f-2])
save(record,out/f'input-{args.hand}.json');print(json.dumps({'status':'Own-score free preparation only; CMC and full native scan pending','exercise':args.number,'hand':args.hand,'seconds':report['seconds']}),flush=True)
