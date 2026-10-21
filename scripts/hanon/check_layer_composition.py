"""Compare independent native hand/key/shadow layers to native both-hand views."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--directory', type=Path, required=True)
args = parser.parse_args()
directory = args.directory
neutral = np.array(Image.open(directory / 'keyboard-neutral.png').convert('RGB'))
rows = []
for path in sorted(directory.glob('*-both.png')):
    frame = int(path.stem.split('-')[0])
    images = {side: np.array(Image.open(directory / f'{frame:04d}-{side}.png').convert('RGB')) for side in ('left', 'right', 'both')}
    for threshold in (0, 1, 2, 3):
        masks = {side: np.max(np.abs(images[side].astype(np.int16) - neutral.astype(np.int16)), axis=2) > threshold for side in ('left', 'right')}
        composite = neutral.copy()
        bounds = {}
        for side in ('left', 'right'):
            mask = masks[side]
            y, x = np.where(mask)
            bounds[side] = [int(x.min()), int(y.min()), int(x.max()) + 1, int(y.max()) + 1]
            composite[mask] = images[side][mask]
            if threshold == 1:
                rgba = np.dstack((images[side], mask.astype(np.uint8) * 255))
                box = bounds[side]
                box = [max(0, box[0] - 2), max(0, box[1] - 2), min(1080, box[2] + 2), min(600, box[3] + 2)]
                Image.fromarray(rgba, 'RGBA').crop(box).save(directory / f'{frame:04d}-{side}-patch.png')
        error = np.abs(composite.astype(np.int16) - images['both'].astype(np.int16))
        maximum = error.max(axis=2)
        row = {'nativeFrame': frame, 'threshold': threshold, 'bbox': bounds,
               'maskOverlapPixels': int(np.count_nonzero(masks['left'] & masks['right'])),
               'meanAbsoluteChannelError': float(error.mean()), 'maximumChannelError': int(error.max()),
               'p99MaximumChannelError': float(np.percentile(maximum, 99)),
               'pixelsAbove3': int(np.count_nonzero(maximum > 3)),
               'pixelsAbove10': int(np.count_nonzero(maximum > 10)),
               'rmse': float(np.sqrt(np.mean(error.astype(float) ** 2)))}
        rows.append(row)
        if threshold == 1:
            Image.fromarray(composite, 'RGB').save(directory / f'{frame:04d}-composite.png')
            heat = np.minimum(maximum * 6, 255).astype(np.uint8)
            Image.fromarray(np.dstack((heat, np.zeros_like(heat), np.zeros_like(heat))), 'RGB').save(directory / f'{frame:04d}-difference-x6.png')
            comparison = Image.new('RGB', (2160, 600))
            comparison.paste(Image.fromarray(images['both']), (0, 0))
            comparison.paste(Image.fromarray(composite), (1080, 0))
            comparison.save(directory / f'{frame:04d}-native-vs-composite.png')
report = {'method': 'Native independent hand renders include only their own depressed/highlighted key and shadows. Binary difference layers over one neutral native keyboard; compared at unchanged pixels to the actual native both-hand render. Threshold is an8-bit per-channel residual cutoff, not anatomy or geometry modification.',
          'rows': rows, 'inputs': {str(p.name): hashlib.sha256(p.read_bytes()).hexdigest() for p in directory.glob('*.png') if p.name.endswith(('-left.png', '-right.png', '-both.png', 'keyboard-neutral.png'))}}
(directory / 'composition-validation.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps([row for row in rows if row['threshold'] == 1], indent=2))
