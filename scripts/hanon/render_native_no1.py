"""Render immutable approved No.1 poses for the offline static-frame exporter.

Run in Blender with --background --threads 2 --python-exit-code 1 and --job.
The input project is opened read-only. Hidden hands never retain key actions.
"""
import argparse
from array import array
import hashlib
import json
from pathlib import Path
import sys
import time

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

APPROVED_SHA256 = 'e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b'
parser = argparse.ArgumentParser()
parser.add_argument('--job', type=Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
job = json.loads(args.job.read_text())
source = Path(job['sourceBlend'])
if hashlib.sha256(source.read_bytes()).hexdigest() != APPROVED_SHA256:
    raise ValueError('Static No.1 export requires the immutable owner-approved candidate08')
bpy.ops.wm.open_mainfile(filepath=str(source))
scene = bpy.context.scene
if (scene.frame_start, scene.frame_end, scene.render.fps) != (1, 2880, 48):
    raise ValueError('Unexpected approved source timeline')
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 1080, 600
scene.render.resolution_percentage = 100
scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
scene.render.threads_mode, scene.render.threads = 'FIXED', 2
scene.render.use_border = scene.render.use_crop_to_border = False
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'
scene.render.image_settings.compression = 15
scene.eevee.taa_render_samples = 32
output = Path(job['outputDirectory'])
output.mkdir(parents=True, exist_ok=True)
camera = scene.camera
camera_state = ([list(row) for row in camera.matrix_world], camera.data.type, camera.data.ortho_scale, camera.data.lens)
whites = {int(obj.name.split('_')[1]): obj for obj in scene.objects if obj.name.startswith('WHITE_')}
hands = {side: [bpy.data.objects[side.upper() + '_' + name] for name in ('ContinuousHand', 'WrappingSleeve')] for side in ('left', 'right')}
roots = {side: bpy.data.objects[side.upper() + '_Wrist_CTRL'] for side in hands}
rigs = {side: bpy.data.objects[side.upper() + '_Hand_RIG'] for side in hands}
key_actions = {note: key.animation_data.action for note, key in whites.items()}
material_actions = {note: key.active_material.node_tree.animation_data.action for note, key in whites.items()}
color_sockets = {note: key.active_material.node_tree.nodes['Principled BSDF'].inputs['Base Color'] for note, key in whites.items()}


def restore_key_tracks():
    for note, key in whites.items():
        key.animation_data.action = key_actions[note]
        key.active_material.node_tree.animation_data.action = material_actions[note]


def detach_key_tracks():
    for key in whites.values():
        key.animation_data.action = None
        key.active_material.node_tree.animation_data.action = None


def source_state(native):
    restore_key_tracks()
    scene.frame_set(native)
    bpy.context.view_layer.update()
    metadata = {side: {name: float(root[name]) for name in ('active_finger', 'note_d', 'pressure', 'pressed')} for side, root in roots.items()}
    keys = {note: {'depression': float(key['depression']), 'angle': float(key.rotation_euler.x), 'color': list(color_sockets[note].default_value)} for note, key in whites.items()}
    signatures = {}
    for side in hands:
        digest = hashlib.sha256()
        for obj in hands[side] + [rigs[side]]:
            digest.update(array('f', (value for row in obj.matrix_world for value in row)).tobytes())
        for bone in rigs[side].pose.bones:
            digest.update(array('f', (value for row in bone.matrix for value in row)).tobytes())
        note = int(metadata[side]['note_d'])
        digest.update(json.dumps({'note': note, **keys[note]} if metadata[side]['pressure'] > .001 else {'depression': 0}, sort_keys=True).encode())
        signatures[side] = digest.hexdigest()
    signatures['both'] = hashlib.sha256((signatures['left'] + signatures['right']).encode()).hexdigest()
    return {'nativeFrame': native, 'hands': metadata, 'keys': keys, 'signatures': signatures}


scene.frame_set(1)
neutral_colors = {note: list(socket.default_value) for note, socket in color_sockets.items()}


def projected_board():
    tops = {}
    for note, key in whites.items():
        points = [key.matrix_world @ vertex.co for vertex in key.data.vertices]
        height = max(point.z for point in points)
        tops[note] = [point for point in points if abs(point.z - height) < 1e-6]
    def pixel(point):
        value = world_to_camera_view(scene, camera, point)
        return [1080 * value.x, 600 * (1 - value.y)]
    def centre(note):
        points = tops[note]
        return pixel(Vector(((min(p.x for p in points) + max(p.x for p in points)) / 2, min(p.y for p in points), max(p.z for p in points))))
    whites_px = [pixel(point) for points in tops.values() for point in points]
    black_px = []
    for key in scene.objects:
        if key.name.startswith('BLACK_'):
            points = [key.matrix_world @ vertex.co for vertex in key.data.vertices]
            height = max(p.z for p in points)
            black_px += [pixel(p) for p in points if abs(p.z - height) < 1e-6]
    return {'width': 1080, 'height': 600, 'left': min(pixel(p)[0] for p in tops[19]),
            'keyWidth': centre(20)[0] - centre(19)[0], 'firstDiatonic': 19, 'count': len(whites),
            'top': min(p[1] for p in whites_px), 'bottom': max(p[1] for p in whites_px),
            'blackBottom': max(p[1] for p in black_px),
            'source': 'Projected unchanged native rest keyboard; runtime key drawing is disabled'}
geometry = {}
for obj in scene.objects:
    if obj.type != 'MESH':
        continue
    vertices = array('f', [0]) * (3 * len(obj.data.vertices))
    obj.data.vertices.foreach_get('co', vertices)
    geometry[obj.name] = (hashlib.sha256(vertices.tobytes()).hexdigest(), tuple(obj.scale))


def render_mode(state, mode, filename):
    shown = {'left', 'right'} if mode == 'both' else set() if mode == 'neutral' else {mode}
    for side, objects in hands.items():
        for obj in objects:
            obj.hide_render = side not in shown
    detach_key_tracks()
    expected = {}
    for side in shown:
        row = state['hands'][side]
        if row['pressure'] > .001:
            expected[int(row['note_d'])] = state['keys'][int(row['note_d'])]
    for note, key in whites.items():
        key['depression'] = expected[note]['depression'] if note in expected else 0.0
        color_sockets[note].default_value = expected[note]['color'] if note in expected else neutral_colors[note]
    bpy.context.view_layer.update()
    checks = []
    for note, key in whites.items():
        angle = expected[note]['angle'] if note in expected else 0.0
        error = abs(float(key.rotation_euler.x) - angle)
        if error > 1e-7 or abs(float(key['depression']) - (expected[note]['depression'] if note in expected else 0)) > 1e-7:
            raise ValueError(('Single-hand actual key state mismatch', mode, state['nativeFrame'], note, error))
        target_color = expected[note]['color'] if note in expected else neutral_colors[note]
        if max(abs(a - b) for a, b in zip(color_sockets[note].default_value, target_color)) > 1e-7:
            raise ValueError(('Single-hand key colour mismatch', mode, state['nativeFrame'], note))
        checks.append({'note': note, 'depression': float(key['depression']), 'angle': float(key.rotation_euler.x), 'color': list(color_sockets[note].default_value), 'maximumAngleError': error})
    scene.render.filepath = str(filename)
    start = time.monotonic()
    bpy.ops.render.render(write_still=True)
    return {'nativeFrame': state['nativeFrame'], 'mode': mode, 'file': str(filename), 'seconds': time.monotonic() - start, 'keyChecks': checks}


report = {'sourceBlend': str(source), 'sourceSha256': APPROVED_SHA256, 'fingerprintVersion': 2, 'fixedCamera': camera.name, 'samples': 32, 'board': projected_board(), 'frames': [], 'timeline': []}
if job.get('scanTimeline'):
    canonical = json.loads(Path(job['canonicalExercise']).read_text())
    if len(canonical['events']) != 113 or len(canonical['frames']) != 1440:
        raise ValueError('Canonical No.1 event/frame count changed')
    firsts = {}
    for i in range(1440):
        native = 1 + 2 * i if i < 1439 else 2880
        state = source_state(native)
        event_index = int(canonical['frames'][i][0])
        event = canonical['events'][event_index]
        for side, offset in (('left', 0), ('right', 2)):
            row = state['hands'][side]
            if (int(row['note_d']), int(row['active_finger'])) != (event[offset], event[offset + 1]):
                raise ValueError(('Source score/finger mismatch', i, native, side, row, event))
            if bool(row['pressed']) != (row['pressure'] > .001):
                raise ValueError(('Native pressed metadata mismatch', native, side))
            firsts.setdefault((side, state['signatures'][side]), native)
        if bool(state['hands']['left']['pressed']) != bool(state['hands']['right']['pressed']):
            raise ValueError(('No.1 hands unexpectedly have different pressed timing', native))
        state['frameIndex'], state['eventIndex'] = i, event_index
        report['timeline'].append(state)
    report['uniqueNativePoses'] = {side: len({state['signatures'][side] for state in report['timeline']}) for side in ('left', 'right', 'both')}
    print(json.dumps({'timelineFrames': 1440, 'events': 113, 'uniquePoses': report['uniqueNativePoses']}), flush=True)

if job.get('renderNeutral'):
    state = source_state(1)
    report['frames'].append(render_mode(state, 'neutral', output / 'keyboard-neutral.png'))
for item in job.get('renders', []):
    state = source_state(int(item['nativeFrame']))
    for mode in item.get('modes', ['left', 'right', 'both']):
        if item.get('signature') and item['signature'] != state['signatures'][mode]:
            raise ValueError(('Native pose fingerprint changed after export planning', mode, state['nativeFrame']))
        report['frames'].append(render_mode(state, mode, output / item.get('filename', f'{state["nativeFrame"]:04d}-{mode}.png')))
        print(json.dumps({'nativeFrame': state['nativeFrame'], 'mode': mode, 'renderSeconds': report['frames'][-1]['seconds']}), flush=True)

for obj in scene.objects:
    if obj.type != 'MESH':
        continue
    vertices = array('f', [0]) * (3 * len(obj.data.vertices))
    obj.data.vertices.foreach_get('co', vertices)
    if geometry[obj.name] != (hashlib.sha256(vertices.tobytes()).hexdigest(), tuple(obj.scale)):
        raise ValueError(('Rest mesh or scale changed during export', obj.name))
if camera_state != ([list(row) for row in camera.matrix_world], camera.data.type, camera.data.ortho_scale, camera.data.lens):
    raise ValueError('The approved teaching camera changed')
if hashlib.sha256(source.read_bytes()).hexdigest() != APPROVED_SHA256:
    raise ValueError('The immutable source project changed')
report.update(restGeometryAndScaleUnchanged=True, teachingCameraUnchanged=True, sourceProjectUnchanged=True)
(output / job.get('reportFile', 'native-export-report.json')).write_text(json.dumps(report, separators=(',', ':')) + '\n')
