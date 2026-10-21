"""Apply validated numerical poses to the accepted rig without saving a project.

Blender --background --threads 2 --python-exit-code 1 --python this.py -- --job job.json
Production jobs require the full, hash-bound numerical/native/visual handoff.
"""
import argparse
from array import array
import hashlib
import json
import math
from pathlib import Path
import sys
import time

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from bank_contract import APPROVED_SHA256, sha, read_json, write_json, verify_track

parser = argparse.ArgumentParser()
parser.add_argument('--job', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
job = read_json(args.job)
started = time.monotonic()
track = verify_track(job['track'], probe=bool(job.get('probe')))
author = Path(track['authorRoot']).resolve()
sys.path.insert(0, str(author)); sys.path.insert(0, str(author.parent))
from input_record_io import load
from orientation_math import pose_channels, deformed_vertices
from rig_math import chain_names
from keyboard_math import MAX_ANGLE
import create_environment as base
import orientation_math, input_record_io, rig_math, keyboard_math
fingerprint_paths = {module.__name__: Path(module.__file__) for module in (orientation_math,input_record_io,rig_math,keyboard_math,base)}
fingerprint_paths.update({side+'HandAsset':author.parent/'assets'/(side+'.glb') for side in ('left','right')})
author_fingerprint = {name:sha(path) for name,path in fingerprint_paths.items()}
if job.get('expectedAuthorFingerprint') and job['expectedAuthorFingerprint'] != author_fingerprint:
    raise ValueError('Frozen authoring helpers or hand identities changed since planning')

records = {side: load(track['hands'][side]['input']['path'], author, side) for side in ('left', 'right')}
# NPZ indexing decompresses an entire array on each access; materialize it once.
solutions = {}
for side in records:
    with np.load(track['hands'][side]['solutions']['path'], allow_pickle=False) as archive:
        solutions[side] = {name: archive[name] for name in ('points','targets','thumb_rotations','residuals')}
for side, cache in solutions.items():
    for name, shape in {'points': (2880,5,4,3), 'targets': (2880,5,3), 'thumb_rotations': (2880,4,3,3), 'residuals': (2880,5)}.items():
        if cache[name].shape != shape or not np.isfinite(cache[name]).all():
            raise ValueError(('Invalid numerical pose cache', side, name))
bpy.ops.wm.open_mainfile(filepath=track['sourceBlend']['path'])
scene = bpy.context.scene
scene.frame_set(1)
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 720, 400
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
scene.render.threads_mode, scene.render.threads = 'FIXED', 2
scene.render.use_border = scene.render.use_crop_to_border = False
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode, scene.render.image_settings.color_depth = 'RGB', '8'
scene.render.image_settings.compression = 15
scene.eevee.taa_render_samples = 32
output = Path(job['outputDirectory']); output.mkdir(parents=True, exist_ok=True)
roots = {side: bpy.data.objects[side.upper()+'_Wrist_CTRL'] for side in records}
rigs = {side: bpy.data.objects[side.upper()+'_Hand_RIG'] for side in records}
hands = {side: [bpy.data.objects[side.upper()+'_'+name] for name in ('ContinuousHand','WrappingSleeve')] for side in records}
whites = {int(obj.name.split('_')[1]): obj for obj in scene.objects if obj.name.startswith('WHITE_')}
color_sockets = {note: key.active_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'] for note,key in whites.items()}
for side in records:
    for obj in [roots[side], rigs[side]] + [bpy.data.objects[f'{side.upper()}_{f}_TIP_CTRL'] for f in range(1,6)]:
        if obj.animation_data: obj.animation_data.action = None
for key in whites.values():
    key.animation_data.action = None
    key.active_material.node_tree.animation_data.action = None
palette = [(*base.srgb(color),1) for color in (0xF0E9DF,0x75ADF0,0xF6AB68)]
rotation = Matrix.Rotation(math.radians(16),3,'X')
hand_configs = {side: {'rig':rig,'geometry':records[side]['geometry'],'ordered':[b.name for b in rig.data.bones],
                      'parents':{b.name:b.parent.name if b.parent else None for b in rig.data.bones}}
                for side,rig in rigs.items()}
camera_state = ([list(row) for row in scene.camera.matrix_world],scene.camera.data.type,scene.camera.data.ortho_scale,scene.camera.data.lens)
geometry = {}
for obj in scene.objects:
    if obj.type == 'MESH':
        vertices = array('f',[0])*(3*len(obj.data.vertices));obj.data.vertices.foreach_get('co',vertices)
        geometry[obj.name] = (hashlib.sha256(vertices.tobytes()).hexdigest(),tuple(obj.scale))
canonical = read_json(track['canonical']['path'])
report = {'number':track['number'],'sourceSha256':APPROVED_SHA256,'trackSha256':sha(job['track']),
          'width':720,'height':400,'fingerprintVersion':3,'authorFingerprint':author_fingerprint,'timeline':[],'frames':[],
          'endpointChecks':0,'maximumEndpointErrorM':0,'maximumSkinErrorM':0,'whiteKeyChecks':0}


def apply_pose(native, check_skin=False):
    scene.frame_set(native)
    metadata = {}
    expected_vertices = {}
    for side,record in records.items():
        i = native-1; cache=solutions[side]; rig=rigs[side];root=roots[side]
        solution = {f:{'points':[Vector(p) for p in cache['points'][i,f-1]],'residual':float(cache['residuals'][i,f-1])} for f in range(1,6)}
        solution[1]['rotations']={name:Matrix(cache['thumb_rotations'][i,j]) for j,name in enumerate(chain_names(1))}
        root.location=record['wrists'][i];root.rotation_euler=(math.radians(16),0,0)
        for name,value in pose_channels(hand_configs[side],solution).items():
            rig.pose.bones[name].rotation_mode='QUATERNION';rig.pose.bones[name].rotation_quaternion=value
        row={name:float(record['metadata'][name][i]) for name in ('active_finger','note_d','pressure','pressed')}
        if int(row['note_d']) not in whites or not 1<=int(row['active_finger'])<=5 or not 0<=row['pressure']<=1:
            raise ValueError(('Scored finger/key/pressure outside the fixed scene',side,native,row))
        for name,value in row.items():root[name]=value
        for f in range(1,6):bpy.data.objects[f'{side.upper()}_{f}_TIP_CTRL'].location=rotation.transposed()@(Vector(cache['targets'][i,f-1])-root.location)
        metadata[side]=row
        if check_skin:expected_vertices[side]=deformed_vertices(record['geometry'],solution)@np.array(rotation).T+np.array(root.location)
    bpy.context.view_layer.update()
    for side in records:
        for finger in range(1,6):
            actual=rigs[side].matrix_world@rigs[side].pose.bones[chain_names(finger)[-1]].head
            error=(actual-Vector(solutions[side]['targets'][native-1,finger-1])).length
            report['endpointChecks']+=1;report['maximumEndpointErrorM']=max(report['maximumEndpointErrorM'],error)
            if error>1e-6:raise ValueError(('Native endpoint/cache mismatch',side,native,finger,error))
        if check_skin:
            evaluated=hands[side][0].evaluated_get(bpy.context.evaluated_depsgraph_get());mesh=evaluated.to_mesh()
            values=np.empty(len(mesh.vertices)*3);mesh.vertices.foreach_get('co',values)
            world=np.column_stack((values.reshape(-1,3),np.ones(len(mesh.vertices))))@np.array(evaluated.matrix_world).T
            error=float(np.max(np.linalg.norm(world[:,:3]-expected_vertices[side],axis=1)));evaluated.to_mesh_clear()
            report['maximumSkinErrorM']=max(report['maximumSkinErrorM'],error)
            if error>1e-6:raise ValueError(('Native skin/cache mismatch',side,native,error))
    signatures={}
    for side in records:
        digest=hashlib.sha256()
        for obj in hands[side]+[rigs[side]]:digest.update(array('f',(v for row in obj.matrix_world for v in row)).tobytes())
        for bone in rigs[side].pose.bones:digest.update(array('f',(v for row in bone.matrix for v in row)).tobytes())
        row=metadata[side]
        visible_key={'note':int(row['note_d']),'pressure':row['pressure']} if row['pressure']>.001 else {'pressure':0}
        digest.update(json.dumps(visible_key,sort_keys=True).encode());signatures[side]=digest.hexdigest()
    signatures['both']=hashlib.sha256((signatures['left']+signatures['right']).encode()).hexdigest()
    return {'nativeFrame':native,'hands':metadata,'signatures':signatures}


def render_mode(state,mode,filename):
    shown=set(records) if mode=='both' else set() if mode=='neutral' else {mode}
    for side,objects in hands.items():
        for obj in objects:obj.hide_render=side not in shown
    expected={}
    for side in shown:
        row=state['hands'][side]
        if row['pressure']>.001:
            note=int(row['note_d'])
            if note in expected:raise ValueError('Simultaneous opposite-hand highlights overlap')
            expected[note]=(row['pressure'],1 if side=='left' else 2)
    for note,key in whites.items():
        pressure,color=expected.get(note,(0,0));key['depression']=pressure;key.update_tag();color_sockets[note].default_value=palette[color]
    bpy.context.view_layer.update()
    checks=[]
    for note,key in whites.items():
        pressure,color=expected.get(note,(0,0));angle_error=abs(float(key.rotation_euler.x)-MAX_ANGLE*pressure)
        color_error=max(abs(a-b) for a,b in zip(color_sockets[note].default_value,palette[color]))
        if angle_error>1e-7 or abs(float(key['depression'])-pressure)>1e-7 or color_error>1e-7:raise ValueError(('Actual native key mismatch',note,mode,state['nativeFrame'],pressure,float(key.rotation_euler.x),MAX_ANGLE,angle_error,color_error))
        checks.append([note,float(key['depression']),float(key.rotation_euler.x),color]);report['whiteKeyChecks']+=1
    scene.render.filepath=str(filename);start=time.monotonic();bpy.ops.render.render(write_still=True)
    return {'nativeFrame':state['nativeFrame'],'mode':mode,'file':str(filename),'seconds':time.monotonic()-start,'keyChecks':checks}


if job.get('scanTimeline'):
    for i in range(1440):
        native=1+2*i if i<1439 else 2880
        state=apply_pose(native,check_skin=i%48==0 or i==1439)
        event_index=canonical['frames'][i][0];event=canonical['events'][event_index]
        for side,k in (('left',0),('right',2)):
            row=state['hands'][side]
            if [int(row['note_d']),int(row['active_finger'])]!=event[k:k+2]:raise ValueError(('Canonical score mismatch',native,side))
            if bool(row['pressed'])!=(row['pressure']>.001):raise ValueError('Invalid native pressed metadata')
        if bool(state['hands']['left']['pressed'])!=bool(state['hands']['right']['pressed']):raise ValueError('Hand press timings differ')
        state.update(frameIndex=i,eventIndex=event_index);report['timeline'].append(state)
    if any(report['timeline'][-1]['hands'][side]['pressed'] for side in records):raise ValueError('Terminal sample is held')
if job.get('renderNeutral'):
    state=apply_pose(1,check_skin=True);report['frames'].append(render_mode(state,'neutral',output/'keyboard-neutral.png'))
for item in job.get('renders',[]):
    state=apply_pose(int(item['nativeFrame']),check_skin=True)
    mode=item['mode']
    if item.get('signature') and state['signatures'][mode]!=item['signature']:raise ValueError('Planned exact pose fingerprint changed')
    report['frames'].append(render_mode(state,mode,output/item['filename']))
    print(json.dumps({'number':track['number'],'nativeFrame':state['nativeFrame'],'mode':mode,'seconds':report['frames'][-1]['seconds']}),flush=True)
for obj in scene.objects:
    if obj.type=='MESH':
        values=array('f',[0])*(3*len(obj.data.vertices));obj.data.vertices.foreach_get('co',values)
        if geometry[obj.name]!=(hashlib.sha256(values.tobytes()).hexdigest(),tuple(obj.scale)):raise ValueError('Rest geometry or scale changed')
if camera_state!=([list(row) for row in scene.camera.matrix_world],scene.camera.data.type,scene.camera.data.ortho_scale,scene.camera.data.lens):raise ValueError('Teaching camera changed')
if author_fingerprint != {name:sha(path) for name,path in fingerprint_paths.items()}:raise ValueError('Authoring source changed during rendering')
verify_track(job['track'],probe=bool(job.get('probe')))
report.update(sourceProjectUnchanged=True,restGeometryAndScaleUnchanged=True,teachingCameraUnchanged=True,elapsedSeconds=time.monotonic()-started)
write_json(output/'native-export-report.json',report)
