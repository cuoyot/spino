"""Check complete source-note/fingering/pressure semantics before pose approval."""
import argparse
import hashlib
import json
from pathlib import Path

parser=argparse.ArgumentParser()
parser.add_argument('--source-index',type=Path,required=True)
parser.add_argument('--input-dir',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
raw=args.source_index.read_bytes();source=json.loads(raw);source_sha=hashlib.sha256(raw).hexdigest()
def smooth(value):
    t=max(0,min(1,value));return t*t*(3-2*t)

report={'status':'Complete input semantic checks only; whole-hand placement/native motion approval remains separate',
        'sourceIndexSha256':source_sha,'handFramesChecked':0,'noteAndFingeringErrors':0,'pressureErrors':0,'tracks':[]}
for number in range(2,11):
    exercise=source['exercises'][number-1]
    assert exercise['number']==number and len(exercise['events'])==113 and len(exercise['frames'])==1440
    for side in ('left','right'):
        path=args.input_dir/f'hanon-{number:02d}/input-{side}.json'
        record=json.loads(path.read_text());m=record['metadata']
        prepared=json.loads((path.parent/f'{side}-input-preparation.json').read_text())
        digest=hashlib.sha256(path.read_bytes()).hexdigest();assert digest==prepared['inputSha256']
        assert record['source']['exercise']==number and record['source']['index_sha256']==source_sha
        assert (record['source']['absolute_first_native_frame'],record['source']['absolute_last_native_frame'])==(1,2880)
        assert len(m['pressure'])==2880
        for i in range(2880):
            event=exercise['events'][exercise['frames'][i//2][0]]
            assert [int(m['note_d'][i]),int(m['active_finger'][i])]==[event[side]['d'],event[side]['finger']], (number,side,i+1)
            phase=i-round(event['start']*12)
            pressure=min(smooth(phase/3),smooth((event['units']*12-1-phase)/4))
            assert abs(m['pressure'][i]-pressure)<1e-12 and int(m['pressed'][i])==int(pressure>.001), (number,side,i+1)
            report['handFramesChecked']+=1
        assert m['pressure'][-1]==0
        report['tracks'].append({'number':number,'hand':side,'nativeFrames':2880,'canonicalEvents':113,
                                 'input':str(path),'inputSha256':digest,'terminalPressure':0,
                                 'preparationSeconds':prepared['elapsedSeconds'],
                                 'duplicateResultsIndependentlyChecked':prepared['exactMemoization']['duplicateResultsIndependentlyChecked']})
assert report['handFramesChecked']==51840
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({key:value for key,value in report.items() if key!='tracks'},indent=2))
