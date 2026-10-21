"""Validate complete static No.1 assets and native full-image codec fidelity."""
import argparse
from collections import OrderedDict
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

MODES = ('left', 'right', 'both')


def metrics(error, mask=None):
    values = error[mask] if mask is not None else error.reshape(-1, 3)
    if not len(values):
        return {'pixels': 0}
    maximum = values.max(axis=1)
    mse = float(np.mean(values.astype(float) ** 2))
    return {'pixels': len(values), 'meanAbsoluteChannelError': float(values.mean()),
            'maximumChannelError': int(values.max()), 'p99MaximumChannelError': float(np.percentile(maximum, 99)),
            'pixelsAbove10': int(np.count_nonzero(maximum > 10)),
            'psnrDb': 99 if mse == 0 else float(10 * math.log10(255 * 255 / mse))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--reference', type=Path, required=True)
    parser.add_argument('--timeline', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    index = json.loads((args.assets / 'index.json').read_text())
    data = json.loads((args.assets / 'exercises/hanon-1.json').read_text())
    timeline = json.loads(args.timeline.read_text())['timeline']
    assert (index['width'], index['height'], index['fps']) == (1080, 600, 24)
    assert data['composition'] == 'single-mode-sprite' and index['bakedKeys']
    assert len(data['frames']) == len(data['both']) == len(timeline) == 1440 and len(data['events']) == 113
    assert not data['frames'][-1][1] and data['nativeFrames'][-1] == 2880
    for i, (frame, state) in enumerate(zip(data['frames'], timeline)):
        assert len(frame) == 8 and frame[3:5] == [0, 0] and frame[6:8] == [0, 0]
        assert frame[0] == state['eventIndex'] and frame[1] == int(bool(state['hands']['left']['pressed']))
        assert data['nativeFrames'][i] == state['nativeFrame']
    for pack in index['packs']:
        assert max(pack['width'], pack['height']) <= 2048 and pack['width'] * pack['height'] * 4 < 7 * 1024 * 1024
        assert (args.assets / pack['file']).stat().st_size == pack['bytes']
    for row in index['sprites']:
        assert len(row) == 9
        pack, sx, sy, sw, sh, x, y, width, height = row
        assert sw == width and sh == height and min(sx, sy, x, y) >= 0
        assert sx + sw <= index['packs'][pack]['width'] and sy + sh <= index['packs'][pack]['height']
        assert x + width <= 1080 and y + height <= 600
    args.output.mkdir(parents=True, exist_ok=True)
    base = Image.open(args.assets / index['keyboard']).convert('RGBA')
    base_array = np.array(base.convert('RGB'))
    cache = OrderedDict()
    def reconstruct(frame_index, mode):
        frame = data['frames'][frame_index]
        sprite = data['both'][frame_index] if mode == 'both' else frame[2 if mode == 'left' else 5]
        pack, sx, sy, sw, sh, x, y, _, _ = index['sprites'][sprite]
        if pack not in cache:
            cache[pack] = Image.open(args.assets / index['packs'][pack]['file']).convert('RGBA')
            while len(cache) > 8:
                cache.popitem(last=False)[1].close()
        patch = cache[pack].crop((sx, sy, sx + sw, sy + sh))
        image = base.copy()
        image.alpha_composite(patch, (x, y))
        return image.convert('RGB')
    samples = []
    board = index['board']
    yy = np.indices(base_array.shape[:2])[0]
    black_roi = (np.max(base_array, axis=2) < 90) & (yy >= board['top'] - 20) & (yy <= board['blackBottom'] + 30)
    felt_roi = (base_array[:, :, 0].astype(float) > base_array[:, :, 1] * 1.5) & (base_array[:, :, 0].astype(float) > base_array[:, :, 2] * 1.5) & (yy < 350)
    for native in (5, 177, 1489, 1557, 2873, 2880):
        frame_index = 1439 if native == 2880 else (native - 1) // 2
        assert data['nativeFrames'][frame_index] == native
        for mode in MODES:
            reference = np.array(Image.open(args.reference / f'{native:04d}-{mode}.png').convert('RGB'))
            result = reconstruct(frame_index, mode)
            decoded = np.array(result)
            error = np.abs(reference.astype(np.int16) - decoded.astype(np.int16))
            changed = np.any(reference != base_array, axis=2)
            interior = changed.copy()
            for dx, dy in ((0, -1), (0, 1), (-1, 0), (1, 0)):
                interior &= np.roll(np.roll(changed, dx, axis=1), dy, axis=0)
            edge = changed & ~interior
            row = {'nativeFrame': native, 'frameIndex': frame_index, 'mode': mode,
                   'fullImage': metrics(error), 'maskEdge': metrics(error, edge),
                   'blackKeyOutlineRegion': metrics(error, black_roi), 'redFeltRegion': metrics(error, felt_roi)}
            samples.append(row)
            result.save(args.output / f'{native:04d}-{mode}-decoded.png')
            if mode == 'both':
                comparison = Image.new('RGB', (1080, 1200))
                comparison.paste(Image.fromarray(reference), (0, 0))
                comparison.paste(result, (0, 600))
                comparison.save(args.output / f'{native:04d}-both-native-vs-decoded.png')
            if row['fullImage']['meanAbsoluteChannelError'] > 2.5 or row['fullImage']['psnrDb'] < 35:
                raise ValueError(('Native full-view codec error exceeds the fixed Q90 review threshold', row))
    manifest = {'status': 'Asset structure, actual native sampling and native full-view codec checks passed; visual/app acceptance remains separate',
                'method': 'Reconstruct one actual selected mode from lossless neutral keyboard plus DECODED atlas sprite, then compare every full-image RGB pixel against the original native render. Includes mask-edge, dark-key and red-felt regions; no sprite-RGB-only acceptance.',
                'frames': 1440, 'events': 113, 'samples': samples,
                'maximumPackRgbaBytes': max(p['width'] * p['height'] * 4 for p in index['packs']),
                'indexSha256': hashlib.sha256((args.assets / 'index.json').read_bytes()).hexdigest(),
                'exerciseSha256': hashlib.sha256((args.assets / 'exercises/hanon-1.json').read_bytes()).hexdigest()}
    (args.output / 'validation.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'samples': len(samples), 'worstMeanAbsoluteChannelError': max(r['fullImage']['meanAbsoluteChannelError'] for r in samples),
                      'minimumPsnrDb': min(r['fullImage']['psnrDb'] for r in samples)}, indent=2))


if __name__ == '__main__':
    main()
