#!/usr/bin/env python3
"""Transcode approved complete native sprite timelines; never regenerate motion."""
import argparse, hashlib, json, shutil, subprocess, time
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--destination',type=Path,required=True);ap.add_argument('--work',type=Path,required=True);args=ap.parse_args()
 dest,work=args.destination,args.work
 if dest.exists():raise SystemExit('Destination must be new; preserve accepted banks.')
 dest.mkdir(parents=True);work.mkdir(parents=True,exist_ok=True)
 for name in ['videos','posters','exercises']:(dest/name).mkdir()
 def job(task):
  number,hand=task;bank=Path(f'public/warmups/hanon-frames-v{2 if number==1 else 3}')
  index=json.loads((bank/'index.json').read_text());data=json.loads((bank/f'exercises/hanon-{number}.json').read_text());assert len(data['frames'])==1440
  target=dest/f'videos/hanon-{number}-{hand}.mp4';cache=OrderedDict();bg=Image.open(bank/index['keyboard']).convert('RGBA');used={}
  cmd=['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f"{index['width']}x{index['height']}",'-r','24','-i','pipe:0','-vf','scale=720:400:flags=lanczos','-c:v','libx264','-threads','2','-preset','slow','-crf','30','-pix_fmt','yuv420p','-g','24','-keyint_min','24','-sc_threshold','0','-an','-movflags','+faststart',str(target)]
  proc=subprocess.Popen(cmd,stdin=subprocess.PIPE);start=time.time()
  try:
   for frame,meta in enumerate(data['frames']):
    sid=data['both'][frame] if hand=='both' else meta[2 if hand=='left' else 5]
    pack,sx,sy,sw,sh,x,y,w,h=index['sprites'][sid];source=bank/index['packs'][pack]['file']
    if pack not in cache:
     used[str(source)]=digest(source)
     if source.suffix=='.avif':
      tmp=work/f'{number}-{hand}-{pack}.png';subprocess.run(['avifdec',str(source),str(tmp)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);cache[pack]=Image.open(tmp).convert('RGBA');tmp.unlink()
     else:cache[pack]=Image.open(source).convert('RGBA')
     while len(cache)>8:cache.popitem(last=False)[1].close()
    cache.move_to_end(pack);sprite=cache[pack].crop((sx,sy,sx+sw,sy+sh))
    if sprite.size!=(w,h):sprite=sprite.resize((w,h),Image.Resampling.LANCZOS)
    if hand!='both':x+=meta[3 if hand=='left' else 6];y+=meta[4 if hand=='left' else 7]
    image=bg.copy();image.alpha_composite(sprite,(int(x),int(y)));rgb=image.convert('RGB')
    if frame==3:rgb.resize((720,400),Image.Resampling.LANCZOS).save(dest/f'posters/hanon-{number}-{hand}.webp',quality=85)
    proc.stdin.write(rgb.tobytes())
  finally:proc.stdin.close()
  if proc.wait()!=0:raise RuntimeError(f'Encode failed: {target}')
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,nb_frames,duration,r_frame_rate','-of','json',str(target)]))['streams'][0]
  assert (probe['width'],probe['height'],probe['nb_frames'],probe['r_frame_rate'])==(720,400,'1440','24/1'),probe
  result={'exercise':number,'hand':hand,'file':str(target.relative_to(dest)),'bytes':target.stat().st_size,'sha256':digest(target),'probe':probe,'sourceIndexSha256':digest(bank/'index.json'),'sourceExerciseSha256':digest(bank/f'exercises/hanon-{number}.json'),'sourcePacks':used,'seconds':round(time.time()-start,1)}
  (work/f'hanon-{number}-{hand}.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['sourcePacks','probe']}),flush=True)
  for im in cache.values():im.close()
  return result
 with ThreadPoolExecutor(max_workers=2) as executor:results=list(executor.map(job,[(n,h) for n in range(1,11) for h in ['both','left','right']]))
 for n in range(1,11):
  source=Path(f'public/warmups/hanon-frames-v{2 if n==1 else 3}/exercises/hanon-{n}.json');data=json.loads(source.read_text())
  out={'id':data['id'],'fps':24,'events':data['events'],'frames':[f[:2] for f in data['frames']],'nativeFrames':data['nativeFrames'],'videos':{r['hand']:{k:r[k] for k in ['file','bytes','sha256']} for r in results if r['exercise']==n}}
  (dest/f'exercises/hanon-{n}.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
 shutil.copyfile('public/warmups/hanon-frames-v3/LICENSE.txt',dest/'LICENSE.txt')
 manifest={'version':1,'revision':'2026-10-21-complete-blender-hanon-video-720','width':720,'height':400,'fps':24,'codec':'H.264','pixelFormat':'yuv420p','crf':30,'keyframeInterval':24,'exercises':[{'id':f'hanon-{n}','file':f'exercises/hanon-{n}.json'} for n in range(1,11)],'videoBytes':sum(r['bytes'] for r in results),'complete':True}
 (dest/'index.json').write_text(json.dumps(manifest,indent=2)+'\n');(work/'verification.json').write_text(json.dumps({'passed':True,'manifest':manifest,'results':results},indent=2)+'\n');print(json.dumps(manifest),flush=True)
if __name__=='__main__':main()
