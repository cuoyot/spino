"""Create an isolated production-player review overlay, never a public runtime index."""
import argparse, hashlib, json, os
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--number',type=int,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];work=root/'output/app-hanon-2-10-2026-10-20/export-bank-01';dest=root/'public/warmups/hanon-frames-v3'
registry_bytes=(work/'registry.json').read_bytes();registry=json.loads(registry_bytes);number=a.number
if str(number) not in registry['exercises']:raise ValueError('Exercise is not completely registered')
for relative,entry in registry['exercises'][str(number)]['files'].items():
 path=dest/relative
 if path.stat().st_size!=entry['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest()!=entry['sha256']:raise ValueError('Completed exercise asset changed: '+str(path))
# Snapshot the entire currently registered sprite order: exercise files use global IDs.
packs=sorted(registry['packs'],key=lambda row:row['file']);ids={row['file']:i for i,row in enumerate(packs)};sprites=[]
for expected,row in enumerate(registry['sprites']):
 if row['id']!=expected:raise ValueError('Unexpected sprite ordering')
 value=row['tuple'][:];value[0]=ids[row['file']];sprites.append(value)
base=json.loads((root/'public/warmups/hanon-frames-v2/index.json').read_text());board={k:v*2/3 if k in ('width','height','left','keyWidth','top','bottom','blackBottom') else v for k,v in base['board'].items()}
index={**{k:base[k] for k in ('fps','bakedKeys','composition','maxPacks','keyboard','scoreSha256','sourceSha256')},'version':3,'revision':'review-overlay-complete-blender-hanon-2-10-static','width':720,'height':400,'board':board,'sprites':sprites,'packs':[{k:row[k] for k in ('file','width','height','bytes')} for row in packs],'exercises':[{'id':f'hanon-{number}','number':number,'file':f'exercises/hanon-{number}.json'}]}
out=a.output.resolve();out.mkdir(parents=True,exist_ok=False);app=out/'app';app.mkdir()
for item in (root/'dist').iterdir():
 if item.name!='warmups':os.symlink(item,app/item.name,target_is_directory=item.is_dir())
warm=app/'warmups';warm.mkdir()
for item in (root/'dist/warmups').iterdir():
 if item.name!='hanon-frames-v1':os.symlink(item,warm/item.name,target_is_directory=item.is_dir())
bank=warm/'hanon-frames-v1';bank.mkdir()
for name in ('packs','posters','keyboard.webp'):os.symlink(dest/name,bank/name,target_is_directory=(dest/name).is_dir())
(bank/'exercises').mkdir();source=dest/f'exercises/hanon-{number}.json';os.symlink(source,bank/'exercises'/source.name)
(bank/'index.json').write_text(json.dumps(index,separators=(',',':')))
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
(out/'overlay.json').write_text(json.dumps({'kind':'Isolated production player plus controlled complete-exercise asset overlay; not finalized bank, native acceptance or publication','number':number,'buildIndexSha256':sha(root/'dist/index.html'),'registrySnapshotSha256':hashlib.sha256(registry_bytes).hexdigest(),'exerciseSha256':sha(source),'publicIndexCreated':False},indent=2)+'\n')
print(app)
