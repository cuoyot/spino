"""Independently compare every saved native note/finger/pressure to the full score."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import bpy

parser=argparse.ArgumentParser()
parser.add_argument('--input',type=Path,required=True)
parser.add_argument('--canonical',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
if args.output.exists():raise ValueError('Preserve existing native score evidence')
canonical=json.loads(args.canonical.read_text())
if len(canonical['frames'])!=1440 or len(canonical['events'])!=113:raise ValueError('Incomplete canonical score')
before=hashlib.sha256(args.input.read_bytes()).hexdigest();bpy.ops.wm.open_mainfile(filepath=str(args.input.resolve()))
scene=bpy.context.scene
if (scene.frame_start,scene.frame_end,scene.render.fps)!=(1,2880,48):raise ValueError('Only a complete native track may pass')
report={'input':str(args.input.resolve()),'inputSha256':before,'canonicalSha256':hashlib.sha256(args.canonical.read_bytes()).hexdigest(),
        'nativeFrames':2880,'noteAndFingerChecks':0,'midiPitchChecks':0,'pressureChecks':0,'errors':[],'visitedEvents':[]}
visited=set()
for frame in range(1,2881):
    scene.frame_set(frame);event_index=canonical['frames'][(frame-1)//2][0];event=canonical['events'][event_index];visited.add(event_index)
    for side,k in (('LEFT',0),('RIGHT',2)):
        root=bpy.data.objects[side+'_Wrist_CTRL'];note=int(root['note_d']);finger=int(root['active_finger']);pressure=float(root['pressure'])
        if (note,finger)!=(event[k],event[k+1]):raise ValueError(('Saved native note/finger does not match score',frame,side,note,finger,event))
        actual_midi=12+(note//7)*12+[0,2,4,5,7,9,11][note%7];expected=12+(event[k]//7)*12+[0,2,4,5,7,9,11][event[k]%7]
        if actual_midi!=expected:raise ValueError('Native MIDI pitch changed')
        if not 0<=pressure<=1 or bool(root['pressed'])!=(pressure>.001):raise ValueError(('Invalid native press metadata',frame,side,pressure))
        if frame==2880 and pressure!=0:raise ValueError('Terminal native sample is held')
        report['noteAndFingerChecks']+=1;report['midiPitchChecks']+=1;report['pressureChecks']+=1
if len(visited)!=113 or before!=hashlib.sha256(args.input.read_bytes()).hexdigest():raise ValueError('Score coverage/source integrity failed')
report.update(visitedEvents=sorted(visited),status='All complete saved native score/finger/pressure and MIDI pitches agree')
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)
