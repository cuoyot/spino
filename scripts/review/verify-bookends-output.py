"""Inspect a synthetic white video/tone export, including transitions and audio alignment."""
import array
import json
import math
import subprocess
import sys
from pathlib import Path
source=Path(sys.argv[1]);body=float(sys.argv[2])
levels=[]
for time in [3.05,3.15,3+body/2,3+body-.15,3+body-.05]:
    frame=subprocess.check_output(['ffmpeg','-v','error','-ss',str(time),'-i',str(source),'-frames:v','1','-vf','crop=20:20:0:0,format=gray','-f','rawvideo','-'])
    levels.append(round(sum(frame)/len(frame),2))
assert levels[2]>190 and levels[0]<130 and levels[-1]<130,levels
samples=array.array('f',subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-vn','-ac','1','-ar','48000','-f','f32le','-']))
def rms(start,end):
    values=samples[int(start*48000):int(end*48000)]
    return math.sqrt(sum(v*v for v in values)/len(values))
audio=[rms(1,2),rms(3.2,3+body-.2),rms(3+body+.5,3+body+1.5)]
assert audio[0]<.0001 and audio[1]>.02 and audio[2]<.0001,audio
result={'source':str(source),'bodyDuration':body,'frameBrightness':levels,'audioRMS':audio}
source.with_suffix('.signal.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
