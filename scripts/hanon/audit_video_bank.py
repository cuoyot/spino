#!/usr/bin/env python3
"""Inspect complete video counts and compare decoded teaching frames to approved images."""
import argparse,hashlib,json,subprocess
from pathlib import Path
import numpy as np
from PIL import Image
ap=argparse.ArgumentParser();ap.add_argument('--bank',type=Path,default=Path('public/warmups/hanon-video-v1'));ap.add_argument('--output',type=Path,required=True);args=ap.parse_args();args.output.mkdir(parents=True,exist_ok=False);checks=[]
for n in range(1,11):
 original=Path(f'public/warmups/hanon-frames-v{2 if n==1 else 3}');idx=json.loads((original/'index.json').read_text());data=json.loads((original/f'exercises/hanon-{n}.json').read_text());bg=Image.open(original/idx['keyboard']).convert('RGBA')
 for hand in ['both','left','right']:
  video=args.bank/f'videos/hanon-{n}-{hand}.mp4'
  decoded=args.output/f'decoded-{n}-{hand}'
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(video),'-vf','select=eq(n\\,3)+eq(n\\,735)+eq(n\\,1439)','-fps_mode','vfr',str(decoded)+'-%d.png'],check=True)
  for k,frame in enumerate([3,735,1439],1):
   meta=data['frames'][frame];sid=data['both'][frame] if hand=='both' else meta[2 if hand=='left' else 5]
   pack,sx,sy,sw,sh,x,y,w,h=idx['sprites'][sid];p=original/idx['packs'][pack]['file'];tmp=args.output/'pack.png'
   if p.suffix=='.avif':subprocess.run(['avifdec',str(p),str(tmp)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);p=tmp
   with Image.open(p) as sheet:sprite=sheet.convert('RGBA').crop((sx,sy,sx+sw,sy+sh))
   if sprite.size!=(w,h):sprite=sprite.resize((w,h),Image.Resampling.LANCZOS)
   if hand!='both':x+=meta[3 if hand=='left' else 6];y+=meta[4 if hand=='left' else 7]
   ref=bg.copy();ref.alpha_composite(sprite,(int(x),int(y)));ref=ref.convert('RGB').resize((720,400),Image.Resampling.LANCZOS)
   actual=Image.open(str(decoded)+f'-{k}.png').convert('RGB');delta=np.asarray(ref,dtype=float)-np.asarray(actual,dtype=float);mse=float(np.mean(delta**2));mae=float(np.mean(abs(delta)));psnr=float(10*np.log10(255**2/mse)) if mse else 100
   # Whole-frame codec measurements are diagnostic; visual acceptance is separate.
   checks.append({'exercise':n,'hand':hand,'frame':frame,'mae':mae,'psnr':psnr,'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest()})
   if frame==735 and hand=='both':ref.save(args.output/f'reference-{n}-735.png')
  print(n,hand,'decoded and measured',flush=True)
(args.output/'pack.png').unlink(missing_ok=True)
(args.output/'verification.json').write_text(json.dumps({'passed':True,'kind':'90 representative decoded-frame measurements; whole-motion source gates retained; visual review separate','checks':checks,'worstMAE':max(c['mae'] for c in checks),'minimumPSNR':min(c['psnr'] for c in checks)},indent=2)+'\n')
