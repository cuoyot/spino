"""Select actual native motion/contact outliers for human review; never approve them."""
import argparse
from collections import defaultdict
from pathlib import Path

from bank_contract import read_json, sha, write_json


def summarize(motion_path, pad_path):
    motion, pad = read_json(motion_path), read_json(pad_path)
    if motion['input_sha256'] != pad['input_sha256']:
        raise ValueError('Native motion and pad reports refer to different source files')
    groups = defaultdict(list)
    for row in pad['rows']:
        groups[(row['hand'], row['finger'], row['role'])].append(row)
    supports = []
    for (hand, finger, role), rows in sorted(groups.items()):
        fields = {
            'largestKeySkinError': lambda r: r['key_skin_error_m'],
            'mostDorsalSourcePatch': lambda r: r['source_support_radial_dot_dorsal']['mean'],
            'steepestDistalAxis': lambda r: abs(r['distal_axis_elevation_degrees']),
            'leastDownwardSkinNormal': lambda r: r['support_skin_normal_dot_key_normal_mean'],
        }
        supports.append({'hand': hand, 'finger': finger, 'role': role, 'samples': len(rows),
                         'outliers': {name: max(rows, key=key) for name, key in fields.items()}})
    rotations = sorted(motion['per_bone_maxima'], key=lambda r: r['world_orientation_change_degrees'], reverse=True)
    thumbs = [r for r in rotations if 'thumb' in r['bone']]
    travel = sorted(motion['per_tip_travel_maxima'], key=lambda r: r['travel_m'], reverse=True)
    # These are ranked diagnostic frames, not a replacement for complete source scans
    # or viewing the passage through preparation, support, release and travel.
    candidates = []
    for row in rotations[:4] + thumbs[:4] + travel[:4]:
        frame = row['frame']
        candidates.extend([max(motion['frames'][0], frame - 1), frame])
    for group in supports:
        if group['role'] == 'playing':
            candidates.extend(row['frame'] for row in group['outliers'].values())
    return {
        'kind': 'Read-only diagnostic summary; human interpretation and visual review required',
        'productionReady': False,
        'sourceSha256': motion['input_sha256'],
        'reports': {'motion': {'path': str(motion_path), 'sha256': sha(motion_path)},
                    'pad': {'path': str(pad_path), 'sha256': sha(pad_path)}},
        'nativeFrames': motion['frames'],
        'fingerStateChecks': pad['finger_state_checks'],
        'supportSamples': pad['support_samples'],
        'maximumUnitBoneScaleError': motion['maximum_unit_bone_scale_error'],
        'maximumBoneLengthVariationM': motion['maximum_bone_length_variation_m'],
        'perBoneMaxima': rotations,
        'thumbMaxima': thumbs,
        'perTipTravelMaxima': travel,
        'supportGroups': supports,
        'candidateInspectionFrames': sorted(set(candidates)),
        'interpretation': 'Positive dorsal metrics and steep axes identify patches to inspect; '
                          'lateral thumb support differs from long-finger pulp. No clinical '
                          'joint-angle threshold or automatic approval is inferred.',
    }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--motion', type=Path, required=True)
    parser.add_argument('--pad', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Preserve existing diagnostic evidence; choose a new output path')
    result = summarize(args.motion, args.pad)
    write_json(args.output, result)
    print('Native diagnostic summary saved; production approval remains open.', flush=True)
