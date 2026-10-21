"""Incrementally pack passed complete exercises into one bounded native AVIF bank.

Each add command owns one bank lock. Completed chunks are hash-verified on resume;
new source/code requires a new work directory. Runtime index is written only when
all nine complete tracks exist. Raw PNG spools are bounded and reproducible.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import fcntl
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

from bank_contract import APPROVED_SHA256, sha, read_json, write_json, verify_track
from export_no1_frames import layout, MAX_DIMENSION, MAX_RGBA_BYTES

HERE = Path(__file__).resolve().parent
RENDERER = HERE/'render_native_bank.py'
WIDTH, HEIGHT = 720, 400
MODES = ('left','right','both')


def render(job, directory):
    directory.mkdir(parents=True,exist_ok=True)
    attempts=directory/'attempts';attempts.mkdir(exist_ok=True)
    attempt=attempts/f'{len(list(attempts.iterdir()))+1:03d}';attempt.mkdir()
    job_path=attempt/'job.json';write_json(job_path,job)
    env=os.environ.copy();env.update(OPENBLAS_NUM_THREADS='1',VECLIB_MAXIMUM_THREADS='1',OMP_NUM_THREADS='1')
    command=['/Applications/Blender.app/Contents/MacOS/Blender','--background','--threads','2',
             '--python-exit-code','1','--python',str(RENDERER),'--','--job',str(job_path)]
    with (attempt/'render.log').open('w') as log:
        process=subprocess.Popen(command,env=env,stdout=log,stderr=subprocess.STDOUT)
        state={'pid':process.pid,'command':command,'startedAt':time.time(),'status':'running'}
        write_json(attempt/'process.json',state);returncode=process.wait()
        state.update(status='complete' if returncode==0 else 'failed',returncode=returncode,finishedAt=time.time())
        write_json(attempt/'process.json',state)
    if returncode:raise RuntimeError('Native renderer failed; preserve evidence at '+str(attempt))
    return read_json(Path(job['outputDirectory'])/'native-export-report.json')


def crop_native(path,neutral):
    image=np.array(Image.open(path).convert('RGB'))
    if image.shape!=(HEIGHT,WIDTH,3):raise ValueError('Unexpected native image dimensions')
    changed=np.any(image!=neutral,axis=2);ys,xs=np.where(changed)
    if not len(xs):raise ValueError('Hand-mode image equals the neutral keyboard')
    box=[max(0,int(xs.min())-2),max(0,int(ys.min())-2),min(WIDTH,int(xs.max())+3),min(HEIGHT,int(ys.max())+3)]
    rgba=Image.fromarray(np.dstack((image,changed.astype(np.uint8)*255)),'RGBA').crop(box)
    check=Image.fromarray(neutral,'RGB').convert('RGBA');check.alpha_composite(rgba,(box[0],box[1]))
    if not np.array_equal(np.array(check.convert('RGB')),image):raise ValueError('Changed pixels omitted from crop')
    return rgba,box,image


def checked_chunks(directory,destination,signature):
    path=directory/'manifest.json'
    if not path.exists():return None
    saved=read_json(path)
    if saved['signature']!=signature or any(sha(destination/p['file'])!=p['sha256'] for p in saved['packs']):
        raise ValueError('Completed chunk changed; preserve it and use a new run')
    return saved


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('command',choices=('add','finalize'))
    parser.add_argument('--track',type=Path)
    parser.add_argument('--work',type=Path,required=True)
    parser.add_argument('--destination',type=Path,required=True)
    parser.add_argument('--workers',type=int,choices=(1,2),default=2)
    parser.add_argument('--chunk-size',type=int,default=32)
    parser.add_argument('--license',type=Path)
    args=parser.parse_args()
    if not 1<=args.chunk_size<=64:raise ValueError('Use a bounded chunk size from1to64')
    args.work=args.work.resolve();args.destination=args.destination.resolve()
    args.work.mkdir(parents=True,exist_ok=True)
    with (args.work/'export.lock').open('w') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        export(args)


def export(args):
    config={'sourceSha256':APPROVED_SHA256,'rendererSha256':sha(RENDERER),'generatorSha256':sha(__file__),
            'contractSha256':sha(HERE/'bank_contract.py'),'layoutSha256':sha(HERE/'export_no1_frames.py'),
            'width':WIDTH,'height':HEIGHT,'fps':24,'qcolor':70,'qalpha':100,'yuv':'444','range':'full','depth':8,'cicp':'1/13/6',
            'maxDimension':MAX_DIMENSION,'maxDecodedPackBytesExclusive':MAX_RGBA_BYTES,'chunkSize':args.chunk_size,
            'destination':str(args.destination),'avifVersion':subprocess.check_output(['avifenc','--version'],text=True).strip()}
    registry_path=args.work/'registry.json'
    if registry_path.exists():
        registry=read_json(registry_path)
        if registry['configuration']!=config:raise ValueError('Source/code/settings changed; preserve this run and use a new work directory')
    else:
        if args.destination.exists() and any(args.destination.iterdir()):raise ValueError('Destination is not an empty new bank')
        registry={'configuration':config,'records':[],'sprites':[],'packs':[],'exercises':{}}
        write_json(registry_path,registry)
    for child in ('packs','posters','exercises'):(args.destination/child).mkdir(parents=True,exist_ok=True)
    if args.command=='finalize':
        finalize(args,registry)
        return
    if not args.track:raise ValueError('add requires --track')
    track_path=args.track.resolve();track=verify_track(track_path);number=track['number'];key=str(number)
    if key in registry['exercises']:
        if registry['exercises'][key]['trackSha256']!=sha(track_path):raise ValueError('A completed exercise source changed')
        verify_files(args.destination,registry['exercises'][key]['files'])
        print(json.dumps({'alreadyComplete':number}),flush=True);return
    run=args.work/f'hanon-{number:02d}';run.mkdir(exist_ok=True)
    common={'track':str(track_path),'outputDirectory':str((run/'timeline').resolve())}
    timeline_path=run/'timeline/native-export-report.json'
    if not timeline_path.exists():render({**common,'scanTimeline':True},run/'timeline')
    timeline_report=read_json(timeline_path)
    if timeline_report['trackSha256']!=sha(track_path) or timeline_report['fingerprintVersion']!=3:raise ValueError('Timeline source changed')
    common['expectedAuthorFingerprint']=timeline_report['authorFingerprint']
    timeline=timeline_report['timeline']
    if len(timeline)!=1440:raise ValueError('Incomplete timeline')
    existing={(r['mode'],r['signature']):r['id'] for r in registry['records']}
    records=[]
    for mode in MODES:
        for state in timeline:
            identity=mode,state['signatures'][mode]
            if identity not in existing:
                item={'id':len(registry['records'])+len(records),'mode':mode,'nativeFrame':state['nativeFrame'],
                      'signature':state['signatures'][mode],'number':number}
                existing[identity]=item['id'];records.append(item)
    plan={'configuration':config,'trackSha256':sha(track_path),'timelineSha256':sha(timeline_path),'baseRegistryRecords':len(registry['records']),'authorFingerprint':timeline_report['authorFingerprint'],'records':records}
    plan_path=run/'plan.json'
    if plan_path.exists() and read_json(plan_path)!=plan:raise ValueError('Existing plan no longer matches source/registry; preserve it')
    write_json(plan_path,plan)
    posters=run/'neutral-posters'
    if not (posters/'native-export-report.json').exists():
        render({**common,'outputDirectory':str(posters),'renderNeutral':True,
                'renders':[{'nativeFrame':timeline[3]['nativeFrame'],'mode':mode,'filename':f'poster-{mode}.png',
                            'signature':timeline[3]['signatures'][mode]} for mode in MODES]},posters)
    neutral_image=Image.open(posters/'keyboard-neutral.png').convert('RGB');neutral=np.array(neutral_image)
    keyboard=args.destination/'keyboard.webp'
    if keyboard.exists():
        if not np.array_equal(np.array(Image.open(keyboard).convert('RGB')),neutral):raise ValueError('Neutral keyboard geometry/light changed between exercises')
    else:neutral_image.save(keyboard,'WEBP',lossless=True,method=4)
    for mode in MODES:
        file=args.destination/f'posters/hanon-{number}-{mode}.webp'
        if not file.exists():Image.open(posters/f'poster-{mode}.png').save(file,'WEBP',quality=90,method=4)
    tasks=[]
    for mode in MODES:
        subset=[r for r in records if r['mode']==mode]
        for offset in range(0,len(subset),args.chunk_size):tasks.append((mode,offset//args.chunk_size,subset[offset:offset+args.chunk_size]))
    started=time.monotonic()

    def process(task):
        mode,chunk,items=task;directory=run/'chunks'/f'{mode}-{chunk:03d}'
        signature=hashlib.sha256(json.dumps({'plan':plan,'items':items},sort_keys=True).encode()).hexdigest()
        saved=checked_chunks(directory,args.destination,signature)
        if saved:return saved
        directory.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='native-spool-',dir=directory) as temporary:
            spool=Path(temporary)
            native=render({**common,'outputDirectory':str(spool),
                           'renders':[{'nativeFrame':r['nativeFrame'],'mode':mode,'filename':f'{r["id"]:05d}.png','signature':r['signature']} for r in items]},directory)
            shutil.copyfile(spool/'native-export-report.json',directory/'native-export-report.json')
            result={'signature':signature,'number':number,'mode':mode,'chunk':chunk,'sprites':[],'packs':[],
                    'nativeImages':len(items),'nativeRenderSeconds':sum(r['seconds'] for r in native['frames']),
                    'nativeReportSha256':sha(directory/'native-export-report.json')}
            group=[];images=[];boxes=[];originals=[]

            def flush():
                if not images:return
                _,width,height,positions=layout(images)
                sheet=Image.new('RGBA',(width,height))
                for image,position in zip(images,positions):sheet.paste(image,position)
                stem=f'e{number:02d}-{mode}-{chunk:03d}-{len(result["packs"]):02d}'
                raw=spool/(stem+'.png');encoded=spool/(stem+'.avif');decoded_path=spool/(stem+'-decoded.png');sheet.save(raw)
                subprocess.run(['avifenc','--jobs','2','--speed','6','--qcolor','70','--qalpha','100','--yuv','444','--depth','8','--range','full','--cicp','1/13/6','--ignore-exif','--ignore-xmp',str(raw),str(encoded)],check=True,stdout=subprocess.DEVNULL)
                subprocess.run(['avifdec',str(encoded),str(decoded_path)],check=True,stdout=subprocess.DEVNULL)
                decoded=Image.open(decoded_path).convert('RGBA')
                if decoded.size!=sheet.size or not np.array_equal(np.array(decoded)[:,:,3],np.array(sheet)[:,:,3]):raise ValueError('AVIF dimensions/lossless alpha changed')
                checks=[]
                for item,image,box,position,original in zip(group,images,boxes,positions,originals):
                    check=Image.fromarray(neutral,'RGB').convert('RGBA');x,y=position
                    check.alpha_composite(decoded.crop((x,y,x+image.width,y+image.height)),(box[0],box[1]))
                    difference=np.array(check.convert('RGB'),dtype=float)-original.astype(float)
                    mae=float(np.mean(np.abs(difference)));mse=float(np.mean(difference**2));psnr=float(10*np.log10(255**2/mse)) if mse else 99.0
                    if mae>1.5 or psnr<40:raise ValueError(('Compressed native fidelity exceeds reviewed bounds',item['id'],mae,psnr))
                    checks.append({'sprite':item['id'],'mae255':mae,'psnrDb':psnr})
                    result['sprites'].append({'id':item['id'],'file':'packs/'+stem+'.avif','tuple':[None,x,y,image.width,image.height,box[0],box[1],image.width,image.height]})
                file='packs/'+stem+'.avif';destination=args.destination/file
                if destination.exists():
                    if sha(destination)!=sha(encoded):raise ValueError('Unrecorded differing atlas exists; preserve failed attempt')
                else:shutil.copyfile(encoded,destination)
                result['packs'].append({'file':file,'width':width,'height':height,'bytes':destination.stat().st_size,
                                        'decodedBytes':width*height*4,'sha256':sha(destination),'imageChecks':checks})
                group.clear();images.clear();boxes.clear();originals.clear()
            for item in items:
                image,box,original=crop_native(spool/f'{item["id"]:05d}.png',neutral)
                if images and layout(images+[image]) is None:flush()
                group.append(item);images.append(image);boxes.append(box);originals.append(original)
            flush()
            if len(result['sprites'])!=len(items):raise ValueError('A rendered image is absent from its atlas')
            write_json(directory/'manifest.json',result)
        return result

    completed=[]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures=[pool.submit(process,task) for task in tasks]
        try:
            for future in as_completed(futures):
                row=future.result();completed.append(row)
                print(json.dumps({'number':number,'completedChunks':len(completed),'totalChunks':len(tasks),
                                  'nativeImages':sum(r['nativeImages'] for r in completed),'totalNativeImages':len(records),
                                  'compressedBytes':sum(p['bytes'] for r in completed for p in r['packs']),'elapsedSeconds':time.monotonic()-started}),flush=True)
        except BaseException:
            for future in futures:future.cancel()
            raise
    packs=sorted((p for r in completed for p in r['packs']),key=lambda p:p['file'])
    sprites={s['id']:s for r in completed for s in r['sprites']}
    if len(sprites)!=len(records):raise ValueError('Incomplete exercise packing')
    canonical=read_json(track['canonical']['path']);frames=[];both=[]
    for state in timeline:
        left,right,pair=[existing[(mode,state['signatures'][mode])] for mode in MODES]
        frames.append([state['eventIndex'],int(bool(state['hands']['left']['pressed'])),left,0,0,right,0,0]);both.append(pair)
    data={'version':1,'id':f'hanon-{number}','number':number,'fps':24,'composition':'single-mode-sprite',
          'events':canonical['events'],'frames':frames,'both':both,'nativeFrames':[s['nativeFrame'] for s in timeline]}
    write_json(args.destination/f'exercises/hanon-{number}.json',data)
    registry['records'].extend(records);registry['sprites'].extend(sprites[r['id']] for r in records);registry['packs'].extend(packs)
    files={p['file']:{'bytes':p['bytes'],'sha256':p['sha256']} for p in packs}
    for file in [f'exercises/hanon-{number}.json']+[f'posters/hanon-{number}-{m}.webp' for m in MODES]:
        path=args.destination/file;files[file]={'bytes':path.stat().st_size,'sha256':sha(path)}
    registry['exercises'][key]={'track':str(track_path),'trackSha256':sha(track_path),'timeline':str(timeline_path),'timelineSha256':sha(timeline_path),
                              'canonicalSha256':track['canonical']['sha256'],'files':files,'nativeImageCount':len(records)}
    verify_track(track_path);verify_files(args.destination,files);write_json(registry_path,registry)
    print(json.dumps({'exerciseComplete':number,'bankExercises':sorted(map(int,registry['exercises'])),'newNativeImages':len(records)}),flush=True)


def verify_files(destination,files):
    for file,row in files.items():
        path=destination/file
        if path.stat().st_size!=row['bytes'] or sha(path)!=row['sha256']:raise ValueError('Durable bank file changed: '+str(path))


def finalize(args,registry):
    if set(registry['exercises'])!=set(map(str,range(2,11))):raise ValueError('All nine complete tracks are required before publishing a runtime index')
    if not args.license:raise ValueError('Finalization requires the retained hand license')
    for exercise in registry['exercises'].values():
        verify_track(exercise['track'])
        if sha(exercise['track'])!=exercise['trackSha256'] or sha(exercise['timeline'])!=exercise['timelineSha256']:raise ValueError('Accepted track evidence changed')
        verify_files(args.destination,exercise['files'])
    packs=sorted(registry['packs'],key=lambda p:p['file']);pack_ids={p['file']:i for i,p in enumerate(packs)}
    sprites=[]
    for expected,row in enumerate(registry['sprites']):
        if row['id']!=expected:raise ValueError('Global sprite order changed')
        value=row['tuple'][:];value[0]=pack_ids[row['file']];sprites.append(value)
    source_index=read_json(Path(verify_track(registry['exercises']['2']['track'])['canonical']['path']).parent.parent/'index.json')
    # Board coordinates are reference metadata only: every key's motion/color is native-baked.
    base_board=read_json(HERE.parent.parent/'public/warmups/hanon-frames-v2/index.json')['board']
    board={k:(v*2/3 if k in ('width','height','left','keyWidth','top','bottom','blackBottom') else v) for k,v in base_board.items()}
    index={'version':3,'revision':'2026-10-20-complete-blender-hanon-2-10-static','width':WIDTH,'height':HEIGHT,'fps':24,
           'bakedKeys':True,'composition':'single-mode-sprite','maxPacks':8,'keyboard':'keyboard.webp','board':board,
           'scoreSha256':source_index['scoreSha256'],'sourceSha256':APPROVED_SHA256,'sprites':sprites,
           'packs':[{k:p[k] for k in ('file','width','height','bytes')} for p in packs],
           'exercises':[{'id':f'hanon-{n}','number':n,'file':f'exercises/hanon-{n}.json'} for n in range(2,11)]}
    shutil.copyfile(args.license,args.destination/'LICENSE.txt');write_json(args.destination/'index.json',index)
    files={str(p.relative_to(args.destination)):{'bytes':p.stat().st_size,'sha256':sha(p)} for p in args.destination.rglob('*') if p.is_file()}
    sizes=sorted((p['decodedBytes'] for p in packs),reverse=True)
    report={'status':'All nine validated complete native static tracks packed; app/native/public release validation remains separate',
            'configuration':registry['configuration'],'exerciseCount':9,'framesPerExercise':1440,'eventsPerExercise':113,'durationSecondsPerExercise':60,
            'uniqueSprites':len(sprites),'packCount':len(packs),'maxPackDecodedBytes':max(sizes),'cache8DecodedUpperBoundBytes':sum(sizes[:8]),
            'totalBytes':sum(r['bytes'] for r in files.values()),'files':files,'exercises':registry['exercises']}
    write_json(args.work/'assets-manifest.json',report);print(json.dumps({k:report[k] for k in ('exerciseCount','uniqueSprites','packCount','totalBytes')}),flush=True)


if __name__=='__main__':main()
