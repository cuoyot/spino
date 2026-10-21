"""Export the approved No.1 as bounded native-rendered static WebP atlases.

Requires Blender, Pillow and NumPy. No GLB, render engine or audio is shipped.
The native timeline scan is produced by render_native_no1.py with scanTimeline.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time

import numpy as np
from PIL import Image

APPROVED_SHA256 = 'e624a12b1f0da93b30f047d4e54b7746a4285d4d3d930a0dffa43d18c5d4fd4b'
MAX_DIMENSION = 2048
MAX_RGBA_BYTES = 5 * 1024 * 1024
QUALITY = 90
MODES = ('left', 'right', 'both')
HERE = Path(__file__).resolve().parent
RENDERER = HERE / 'render_native_no1.py'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, separators=(',', ':')) + '\n')
    temporary.replace(path)


def render(job, directory):
    directory.mkdir(parents=True, exist_ok=True)
    job_path = directory / 'job.json'
    write_json(job_path, job)
    env = os.environ.copy()
    env.update(OPENBLAS_NUM_THREADS='1', VECLIB_MAXIMUM_THREADS='1', OMP_NUM_THREADS='1')
    with (directory / 'render.log').open('w') as log:
        result = subprocess.run(['/Applications/Blender.app/Contents/MacOS/Blender', '--background', '--threads', '2',
                                 '--python-exit-code', '1', '--python', str(RENDERER), '--', '--job', str(job_path)],
                                env=env, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError('Native renderer failed; inspect ' + str(directory / 'render.log'))
    return json.loads((Path(job['outputDirectory']) / 'native-export-report.json').read_text())


def crop_native(path, neutral):
    image = np.array(Image.open(path).convert('RGB'))
    changed = np.any(image != neutral, axis=2)
    y, x = np.where(changed)
    if not len(x):
        raise ValueError('A hand-mode image unexpectedly equals the neutral keyboard')
    box = [max(0, int(x.min()) - 2), max(0, int(y.min()) - 2),
           min(1080, int(x.max()) + 3), min(600, int(y.max()) + 3)]
    rgba = Image.fromarray(np.dstack((image, changed.astype(np.uint8) * 255)), 'RGBA').crop(box)
    # Unary mode composition over this exact neutral base is pixel-identical.
    check = Image.fromarray(neutral, 'RGB').convert('RGBA')
    check.alpha_composite(rgba, (box[0], box[1]))
    if not np.array_equal(np.array(check.convert('RGB')), image):
        raise ValueError('Native mode crop omitted changed pixels')
    return rgba, box


def layout(images):
    choices = []
    for columns in range(1, len(images) + 1):
        placed = []
        y = 1
        width = 0
        for start in range(0, len(images), columns):
            x, row_height = 1, 0
            for image in images[start:start + columns]:
                placed.append((x, y))
                x += image.width + 1
                row_height = max(row_height, image.height)
            width = max(width, x)
            y += row_height + 1
        height = y
        if max(width, height) <= MAX_DIMENSION and width * height * 4 < MAX_RGBA_BYTES:
            choices.append((width * height, width, height, placed))
    return min(choices, default=None, key=lambda row: (row[0], max(row[1:3]), row[1]))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--timeline', type=Path, required=True)
    parser.add_argument('--canonical', type=Path, required=True)
    parser.add_argument('--work', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2, choices=(1, 2))
    parser.add_argument('--chunk-size', type=int, default=32)
    parser.add_argument('--license', type=Path, required=True)
    args = parser.parse_args()
    start = time.monotonic()
    if sha(args.source) != APPROVED_SHA256:
        raise ValueError('The approved immutable source changed')
    timeline_report = json.loads(args.timeline.read_text())
    if timeline_report['sourceSha256'] != APPROVED_SHA256 or timeline_report['fingerprintVersion'] != 2:
        raise ValueError('Timeline fingerprints must come from the current native scanner')
    timeline = timeline_report['timeline']
    canonical = json.loads(args.canonical.read_text())
    if len(timeline) != 1440 or len(canonical['events']) != 113:
        raise ValueError('No.1 timeline/event count mismatch')
    for i, state in enumerate(timeline):
        if state['nativeFrame'] != (1 + 2 * i if i < 1439 else 2880):
            raise ValueError('The terminal sampling convention changed')
        event = canonical['events'][state['eventIndex']]
        for side, offset in (('left', 0), ('right', 2)):
            hand = state['hands'][side]
            if [int(hand['note_d']), int(hand['active_finger'])] != event[offset:offset + 2]:
                raise ValueError(('Native score mismatch', i, side))
    if any(timeline[-1]['hands'][side]['pressed'] for side in ('left', 'right')):
        raise ValueError('The terminal native sample is not fully released')
    args.work.mkdir(parents=True, exist_ok=True)
    stage = args.work / 'assets'
    for child in ('packs', 'posters', 'exercises'):
        (stage / child).mkdir(parents=True, exist_ok=True)
    renderer_sha = sha(RENDERER)
    generator_sha = sha(__file__)
    records, lookup, by_mode = [], {}, {}
    for mode in MODES:
        by_mode[mode] = []
        for state in timeline:
            key = mode, state['signatures'][mode]
            if key in lookup:
                continue
            item = {'id': len(records), 'mode': mode, 'nativeFrame': state['nativeFrame'], 'signature': state['signatures'][mode]}
            lookup[key] = item['id']
            records.append(item)
            by_mode[mode].append(item)
    configuration = {'source': str(args.source.resolve()), 'sourceSha256': APPROVED_SHA256,
                     'timelineSha256': sha(args.timeline), 'canonicalSha256': sha(args.canonical),
                     'rendererSha256': renderer_sha, 'generatorSha256': generator_sha,
                     'quality': QUALITY, 'maxDecodedPackBytes': MAX_RGBA_BYTES,
                     'uniqueModes': {mode: len(by_mode[mode]) for mode in MODES},
                     'composition': 'single-mode-sprite', 'chunkSize': args.chunk_size}
    config_path = args.work / 'configuration.json'
    if config_path.exists() and json.loads(config_path.read_text()) != configuration:
        raise ValueError('Use a new export directory after changing source or generator settings')
    write_json(config_path, configuration)
    write_json(args.work / 'sprite-plan.json', records)
    neutral_dir = args.work / 'neutral-and-posters'
    if not (neutral_dir / 'native-export-report.json').exists():
        poster_state = timeline[3]
        render({'sourceBlend': str(args.source.resolve()), 'outputDirectory': str(neutral_dir.resolve()), 'renderNeutral': True,
                'renders': [{'nativeFrame': poster_state['nativeFrame'], 'modes': [mode], 'signature': poster_state['signatures'][mode],
                             'filename': f'poster-{mode}.png'} for mode in MODES]}, neutral_dir)
    neutral_report = json.loads((neutral_dir / 'native-export-report.json').read_text())
    neutral_image = Image.open(neutral_dir / 'keyboard-neutral.png').convert('RGB')
    neutral = np.array(neutral_image)
    neutral_image.save(stage / 'keyboard.webp', 'WEBP', lossless=True, method=4)
    if not np.array_equal(np.array(Image.open(stage / 'keyboard.webp').convert('RGB')), neutral):
        raise ValueError('Neutral keyboard must remain lossless')
    for mode in MODES:
        Image.open(neutral_dir / f'poster-{mode}.png').save(stage / f'posters/hanon-1-{mode}.webp', 'WEBP', quality=QUALITY, method=4)
    tasks = []
    for mode in MODES:
        for number, offset in enumerate(range(0, len(by_mode[mode]), args.chunk_size)):
            tasks.append((mode, number, by_mode[mode][offset:offset + args.chunk_size]))

    def process(task):
        mode, number, items = task
        directory = args.work / 'chunks' / f'{mode}-{number:03d}'
        manifest_path = directory / 'manifest.json'
        signature = hashlib.sha256(json.dumps({'configuration': configuration, 'items': items}, sort_keys=True).encode()).hexdigest()
        if manifest_path.exists():
            saved = json.loads(manifest_path.read_text())
            if saved['signature'] != signature or any(sha(stage / pack['file']) != pack['sha256'] for pack in saved['packs']):
                raise ValueError('Existing chunk output changed; preserve it and use a new run')
            return saved
        directory.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='native-spool-', dir=directory) as temporary:
            spool = Path(temporary)
            job = {'sourceBlend': str(args.source.resolve()), 'outputDirectory': str(spool.resolve()),
                   'renders': [{'nativeFrame': item['nativeFrame'], 'modes': [mode], 'filename': f'{item["id"]:04d}.png',
                                'signature': item['signature']} for item in items]}
            native = render(job, directory)
            shutil.copyfile(spool / 'native-export-report.json', directory / 'native-export-report.json')
            native_seconds = sum(row['seconds'] for row in native['frames'])
            result = {'signature': signature, 'mode': mode, 'chunk': number, 'sprites': [], 'packs': [],
                      'nativeFrames': len(items), 'nativeRenderSeconds': native_seconds,
                      'nativeReportSha256': sha(directory / 'native-export-report.json')}
            group, images, boxes = [], [], []

            def flush():
                if not images:
                    return
                _, width, height, placed = layout(images)
                sheet = Image.new('RGBA', (width, height))
                file = f'packs/{mode}-{number:03d}-{len(result["packs"]):02d}.webp'
                destination = stage / file
                if destination.exists():
                    raise ValueError('Unrecorded atlas exists; preserve the failed attempt: ' + str(destination))
                for image, position in zip(images, placed):
                    sheet.paste(image, position)
                sheet.save(destination, 'WEBP', quality=QUALITY, method=4)
                decoded = Image.open(destination).convert('RGBA')
                if decoded.size != sheet.size or not np.array_equal(np.array(decoded)[:, :, 3], np.array(sheet)[:, :, 3]):
                    raise ValueError('Atlas dimensions or lossless alpha changed')
                pack = {'file': file, 'mode': mode, 'width': width, 'height': height, 'bytes': destination.stat().st_size,
                        'decodedBytes': width * height * 4, 'sha256': sha(destination)}
                result['packs'].append(pack)
                for item, image, box, position in zip(group, images, boxes, placed):
                    result['sprites'].append({'id': item['id'], 'file': file,
                                              'tuple': [None, position[0], position[1], image.width, image.height,
                                                        box[0], box[1], image.width, image.height]})
                group.clear(); images.clear(); boxes.clear()

            for item in items:
                image, box = crop_native(spool / f'{item["id"]:04d}.png', neutral)
                if images and layout(images + [image]) is None:
                    flush()
                group.append(item); images.append(image); boxes.append(box)
            flush()
            if len(result['sprites']) != len(items):
                raise ValueError('A rendered sprite was omitted from its atlas')
            # Raw spool is reproducible and removed only after durable atlases verify.
            write_json(manifest_path, result)
        return result

    completed = []
    rendered = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(process, task) for task in tasks]
        for future in as_completed(futures):
            result = future.result()
            completed.append(result)
            rendered += result['nativeFrames']
            print(json.dumps({'completedChunks': len(completed), 'totalChunks': len(tasks), 'nativeImages': rendered,
                              'totalNativeImages': len(records), 'mode': result['mode'], 'chunk': result['chunk'],
                              'compressedBytes': sum(p['bytes'] for row in completed for p in row['packs']),
                              'elapsedSeconds': time.monotonic() - start}), flush=True)
    packs = sorted((pack for row in completed for pack in row['packs']), key=lambda row: row['file'])
    pack_ids = {pack['file']: i for i, pack in enumerate(packs)}
    sprites = [None] * len(records)
    for result in completed:
        for row in result['sprites']:
            entry = row['tuple'][:]
            entry[0] = pack_ids[row['file']]
            sprites[row['id']] = entry
    if any(row is None for row in sprites):
        raise ValueError('Incomplete final sprite index')
    frames, both = [], []
    for state in timeline:
        left, right, pair = [lookup[(mode, state['signatures'][mode])] for mode in MODES]
        frames.append([state['eventIndex'], int(bool(state['hands']['left']['pressed'])), left, 0, 0, right, 0, 0])
        both.append(pair)
    data = {'version': 1, 'id': 'hanon-1', 'number': 1, 'fps': 24, 'composition': 'single-mode-sprite',
            'events': canonical['events'], 'frames': frames, 'both': both,
            'nativeFrames': [state['nativeFrame'] for state in timeline]}
    write_json(stage / 'exercises/hanon-1.json', data)
    canonical_index = json.loads((args.canonical.parent.parent / 'index.json').read_text())
    index = {'version': 2, 'revision': '2026-10-20-approved-blender-no1-static', 'width': 1080, 'height': 600,
             'fps': 24, 'bakedKeys': True, 'composition': 'single-mode-sprite', 'maxPacks': 8,
             'board': neutral_report['board'], 'keyboard': 'keyboard.webp', 'scoreSha256': canonical_index['scoreSha256'],
             'sourceSha256': APPROVED_SHA256, 'sprites': sprites,
             'packs': [{key: pack[key] for key in ('file', 'width', 'height', 'bytes')} for pack in packs],
             'exercises': [{'id': 'hanon-1', 'number': 1, 'file': 'exercises/hanon-1.json'}]}
    shutil.copyfile(args.license, stage / 'LICENSE.txt')
    write_json(stage / 'index.json', index)
    files = {str(path.relative_to(stage)): {'bytes': path.stat().st_size, 'sha256': sha(path)}
             for path in stage.rglob('*') if path.is_file()}
    largest = sorted((pack['decodedBytes'] for pack in packs), reverse=True)
    manifest = {'status': 'Complete native static asset export; app/browser/native release review remains separate',
                'configuration': configuration, 'frames': 1440, 'fps': 24, 'durationSeconds': 60, 'events': 113,
                'sampling': 'native1+2*i for i0..1438; terminal i1439 uses native2880 rather than2879 to be fully released',
                'composition': 'One independently rendered native mode per displayed frame. No hand-layer shadow compositing.',
                'canonicalNotesAndFingeringVerified': True, 'nativePressedMetadataUsed': True, 'terminalFullyReleased': True,
                'uniqueSprites': len(records), 'modeCounts': configuration['uniqueModes'], 'packCount': len(packs),
                'maxPackDecodedBytes': max(largest), 'cache8DecodedUpperBoundBytes': sum(largest[:8]),
                'keyboardCanvasPosterAdditionalBytes': 1080 * 600 * 4 * 3,
                'scope': 'Offline WebP/JSON assets only; no GLB, runtime render engine, audio bank or private reference photos.',
                'sourceProjectSha256After': sha(args.source), 'totalBytes': sum(row['bytes'] for row in files.values()),
                'elapsedSeconds': time.monotonic() - start, 'files': files}
    write_json(args.work / 'assets-manifest.json', manifest)
    if args.destination.exists() and any(args.destination.iterdir()):
        raise ValueError('Destination contains existing assets; preserve them and choose a new destination')
    shutil.copytree(stage, args.destination, dirs_exist_ok=True)
    if any(sha(args.destination / name) != row['sha256'] for name, row in files.items()):
        raise ValueError('Published asset copy differs from the verified staging package')
    print(json.dumps({'finished': True, 'destination': str(args.destination), 'bytes': manifest['totalBytes'],
                      'packs': len(packs), 'sprites': len(sprites), 'elapsedSeconds': manifest['elapsedSeconds']}), flush=True)


if __name__ == '__main__':
    main()
