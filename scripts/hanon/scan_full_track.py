"""Fresh full-track skin/key/self/pulp scan and numeric pose cache.

No candidate-search memoization is installed in this process. A passing report
still requires native agreement, actual motion inspection and export checks.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys
import time
from mathutils import Matrix

parser = argparse.ArgumentParser()
parser.add_argument('--number',type=int,choices=range(2,11),required=True)
parser.add_argument('--hand',choices=('left','right'),required=True)
parser.add_argument('--author-root',type=Path,required=True)
parser.add_argument('--input-path',type=Path,required=True)
parser.add_argument('--output-dir',type=Path,required=True)
parser.add_argument('--diagnostic',action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
root=args.author_root.resolve();sys.path.insert(0,str(root));sys.path.insert(0,str(root.parent))
from input_record_io import load
from excerpt_validation import scan

out=args.output_dir.resolve();out.mkdir(parents=True,exist_ok=True)
assert not (out/f'{args.hand}-full-scan.json').exists(), 'Preserve an existing full scan'
record=load(args.input_path.resolve(),root,args.hand)
assert len(record['wrists'])==2880 and record['source']['absolute_first_native_frame']==1 and record['source']['absolute_last_native_frame']==2880
source_index=Path(record['source']['index_path'])
assert hashlib.sha256(source_index.read_bytes()).hexdigest()==record['source']['index_sha256']
exercise=json.loads(source_index.read_text())['exercises'][args.number-1]
assert exercise['number']==args.number
for i in range(2880):
    event=exercise['events'][exercise['frames'][i//2][0]][args.hand]
    assert (int(record['metadata']['note_d'][i]),int(record['metadata']['active_finger'][i]))==(event['d'],event['finger'])
assert record['metadata']['pressure'][-1]==0
started=time.monotonic()
report=scan(record,args.hand,root,Matrix.Rotation(math.radians(16),3,'X'),out,
            progress=lambda row:print(json.dumps({'stage':'fresh-full-skin-scan','exercise':args.number,'hand':args.hand,
                                                 **row,'seconds':time.monotonic()-started}),flush=True))
report.update({'exercise':args.number,'native_frames':2880,'canonical_events':113,'canonical_note_and_fingering_errors':0,
               'fresh_scan_without_search_cache':True,'source_input_sha256':hashlib.sha256(args.input_path.read_bytes()).hexdigest(),
               'generator_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'elapsed_seconds':time.monotonic()-started})
report['support_summary']={}
for finger in range(1,6):
    rows=[row for row in report['support_samples'] if row['finger']==finger]
    report['support_summary'][str(finger)]={'samples':len(rows),'maximum_patch_mean':max(row['intrinsic_support_radial_dot_dorsal_mean'] for row in rows),
        'distal_axis_degrees_range':[min(row['distal_axis_elevation_degrees'] for row in rows),max(row['distal_axis_elevation_degrees'] for row in rows)],
        'maximum_owned_key_skin_error_m':max(row['key_skin_error_m'] for row in rows)}
(out/f'{args.hand}-full-scan.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({key:value for key,value in report.items() if key not in ('support_samples','self_crossings','physics_failures','support_failures')},indent=2),flush=True)
if not args.diagnostic:
    assert not report['self_crossings'] and not report['physics_failures'] and not report['support_failures'], 'Incomplete whole-hand placement; preserved scan must not be exported as cleared'
