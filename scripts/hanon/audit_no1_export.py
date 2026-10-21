"""Audit a completed No.1 export against its immutable native evidence."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--timeline', type=Path, required=True)
    parser.add_argument('--preserved-v1', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    configuration = read(args.work / 'configuration.json')
    manifest = read(args.work / 'assets-manifest.json')
    timeline = read(args.timeline)['timeline']
    plan = read(args.work / 'sprite-plan.json')
    index = read(args.assets / 'index.json')
    data = read(args.assets / 'exercises/hanon-1.json')
    root = Path(__file__).resolve().parents[2]
    assert sha(configuration['source']) == configuration['sourceSha256']
    assert sha(args.timeline) == configuration['timelineSha256']
    for key, name in (('rendererSha256', 'render_native_no1.py'), ('generatorSha256', 'export_no1_frames.py')):
        assert sha(Path(__file__).parent / name) == configuration[key]
    assert manifest['configuration'] == configuration
    expected_files = set(manifest['files'])
    for folder in (args.work / 'assets', args.assets):
        assert {str(path.relative_to(folder)) for path in folder.rglob('*') if path.is_file()} == expected_files
        for name, row in manifest['files'].items():
            path = folder / name
            assert path.stat().st_size == row['bytes'] and sha(path) == row['sha256']
            assert path.suffix in ('.webp', '.json', '.txt')
    assert set(path.name for path in (args.assets / 'exercises').iterdir()) == {'hanon-1.json'}
    neutral = Image.open(args.assets / index['keyboard']).convert('RGB')
    original = Image.open(args.reference / 'keyboard-neutral.png').convert('RGB')
    assert neutral.size == (1080, 600) and ImageChops.difference(neutral, original).getbbox() is None
    preserved = read(args.preserved_v1)
    preserved_root = root / preserved['root']
    assert {str(path.relative_to(preserved_root)) for path in preserved_root.rglob('*') if path.is_file()} == set(preserved['files'])
    for name, row in preserved['files'].items():
        path = preserved_root / name
        assert path.stat().st_size == row['bytes'] and sha(path) == row['sha256']

    native_by_frame = {row['nativeFrame']: row for row in timeline}
    native_by_signature = {}
    for state in timeline:
        for mode in ('left', 'right', 'both'):
            native_by_signature.setdefault((mode, state['signatures'][mode]), state['nativeFrame'])
    assert len(plan) == len(native_by_signature) == len(index['sprites']) == 2420
    for item in plan:
        assert native_by_signature[item['mode'], item['signature']] == item['nativeFrame']
    neutral_keys = timeline[0]['keys']
    maximum_angle_error = maximum_depression_error = maximum_color_error = 0.0
    native_image_count = native_key_count = hidden_key_count = 0
    seen = set()
    reports = []
    pack_ids = {pack['file']: i for i, pack in enumerate(index['packs'])}
    for path in sorted((args.work / 'chunks').glob('*/manifest.json')):
        chunk = read(path)
        native_path = path.parent / 'native-export-report.json'
        assert sha(native_path) == chunk['nativeReportSha256']
        native = read(native_path)
        assert native['sourceSha256'] == configuration['sourceSha256'] and native['fingerprintVersion'] == 2
        assert all(native[name] for name in ('sourceProjectUnchanged', 'restGeometryAndScaleUnchanged', 'teachingCameraUnchanged'))
        assert native['fixedCamera'] == 'Camera_ApprovedComposition'
        assert len(native['frames']) == chunk['nativeFrames'] == len(chunk['sprites'])
        for image, sprite in zip(native['frames'], chunk['sprites']):
            item = plan[sprite['id']]
            assert (item['mode'], item['nativeFrame']) == (image['mode'], image['nativeFrame'])
            final_tuple = sprite['tuple'][:]
            final_tuple[0] = pack_ids[sprite['file']]
            assert index['sprites'][sprite['id']] == final_tuple
            assert sprite['id'] not in seen
            seen.add(sprite['id'])
            state = native_by_frame[image['nativeFrame']]
            sides = ('left', 'right') if image['mode'] == 'both' else (image['mode'],)
            active_notes = {int(state['hands'][side]['note_d']) for side in sides if state['hands'][side]['pressure'] > .001}
            assert len(image['keyChecks']) == 23
            for key in image['keyChecks']:
                name = str(key['note'])
                expected = state['keys'][name] if key['note'] in active_notes else neutral_keys[name]
                expected_depression = expected['depression'] if key['note'] in active_notes else 0
                expected_angle = expected['angle'] if key['note'] in active_notes else 0
                angle_error = abs(key['angle'] - expected_angle)
                depression_error = abs(key['depression'] - expected_depression)
                color_error = max(abs(a - b) for a, b in zip(key['color'], expected['color']))
                maximum_angle_error = max(maximum_angle_error, angle_error)
                maximum_depression_error = max(maximum_depression_error, depression_error)
                maximum_color_error = max(maximum_color_error, color_error)
                assert max(angle_error, depression_error, color_error, key['maximumAngleError']) < 1e-7
                native_key_count += 1
                hidden_key_count += key['note'] not in active_notes
            native_image_count += 1
        reports.append({'file': str(native_path.relative_to(args.work)), 'sha256': sha(native_path), 'images': len(native['frames'])})
    assert len(seen) == native_image_count == len(plan)
    assert len(data['frames']) == len(data['both']) == len(data['nativeFrames']) == len(timeline) == 1440
    for i, state in enumerate(timeline):
        frame = data['frames'][i]
        assert data['nativeFrames'][i] == state['nativeFrame'] == (1 + 2 * i if i < 1439 else 2880)
        assert frame[0] == state['eventIndex'] and frame[1] == int(bool(state['hands']['left']['pressed']))
        assert frame[3:5] == frame[6:8] == [0, 0]
        for mode, sprite_id in (('left', frame[2]), ('right', frame[5]), ('both', data['both'][i])):
            assert (plan[sprite_id]['mode'], plan[sprite_id]['signature']) == (mode, state['signatures'][mode])
        for side, offset in (('left', 0), ('right', 2)):
            hand = state['hands'][side]
            assert [int(hand['note_d']), int(hand['active_finger'])] == data['events'][frame[0]][offset:offset + 2]
    assert not any(timeline[-1]['hands'][side]['pressed'] for side in ('left', 'right'))
    assert len(data['events']) == len({frame[0] for frame in data['frames']}) == 113
    largest = sorted((p['width'] * p['height'] * 4 for p in index['packs']), reverse=True)
    assert largest[0] < 5 * 1024 * 1024 and all(max(p['width'], p['height']) <= 2048 for p in index['packs'])
    result = {
        'status': 'Passed export provenance, actual native key states, immutable geometry/camera, complete timeline and preserved v1 assets; app acceptance remains separate',
        'sourceSha256': configuration['sourceSha256'], 'sourceProjectUnchanged': True,
        'preservedV1Files': len(preserved['files']), 'preservedV1Bytes': sum(row['bytes'] for row in preserved['files'].values()),
        'frames': 1440, 'fps': 24, 'seconds': 60, 'canonicalEvents': 113,
        'nativeRenderedImages': native_image_count, 'nativeWhiteKeyChecks': native_key_count,
        'neutralOrHiddenKeyChecks': hidden_key_count,
        'maximumNativeKeyAngleErrorRad': maximum_angle_error,
        'maximumNativeDepressionError': maximum_depression_error,
        'maximumNativeColorError': maximum_color_error,
        'modeCounts': configuration['uniqueModes'], 'packs': len(index['packs']),
        'totalAssetBytes': manifest['totalBytes'], 'largestDecodedPackBytes': largest[0],
        'cache8DecodedUpperBoundBytes': sum(largest[:8]),
        'neutralKeyboardLossless': True, 'stageMatchesPublicCopy': True,
        'indexSha256': sha(args.assets / 'index.json'),
        'exerciseSha256': sha(args.assets / 'exercises/hanon-1.json'),
        'assetsManifestSha256': sha(args.work / 'assets-manifest.json'),
        'nativeReports': reports,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: value for key, value in result.items() if key != 'nativeReports'}, indent=2))


if __name__ == '__main__':
    main()
