# Verify this native audit matrix and normalize rotated iPad framebuffers while retaining raw evidence.
from pathlib import Path
import json,hashlib,struct,collections,sys
from PIL import Image
root=Path(sys.argv[1] if len(sys.argv)>1 else 'artifacts/platform-comparison/2026-10-11-native-01')
scenarios=json.loads((root/'scenarios.json').read_text()); rows=[]; errors=[]; frames=0
for target in ['android-phone','ios-phone','android-tablet','ios-tablet']:
 p=root/(target+'-results.json'); data=json.loads(p.read_text())
 keys=[(r['case'],r['orientation']) for r in data]
 expectedKeys={(c['id'],o) for c in scenarios for o in ['portrait','landscape']}
 if set(keys)!=expectedKeys or len(keys)!=len(set(keys)):errors.append(target+' scenario matrix mismatch')
 for r in data:
  vp=r.get('metrics',{}).get('viewport',{})
  if vp and ((vp['width']>vp['height']) != (r['orientation']=='landscape')):errors.append(target+'/'+r['case']+' actual viewport orientation mismatch')
  for f in r.get('frames',[]):
   frames+=1; path=root/f['path']; b=path.read_bytes(); dim=struct.unpack('>II',b[16:24])
   if target=='ios-tablet' and r['orientation']=='landscape' and dim==(1640,2360) and vp.get('width',0)>vp.get('height',0):
    raw=root/'diagnostics/raw-ipad-landscape'/path.name;raw.parent.mkdir(parents=True,exist_ok=True);raw.write_bytes(b)
    f['rawPath']=str(raw.relative_to(root));f['rawSHA256']=hashlib.sha256(b).hexdigest();f['normalization']='Lossless clockwise 90-degree framebuffer rotation'
    with Image.open(path) as im:im.transpose(Image.Transpose.ROTATE_270).save(path)
    b=path.read_bytes();f['sha256']=hashlib.sha256(b).hexdigest();dim=struct.unpack('>II',b[16:24])
   expected=(1206,2622) if 'phone' in target else (1640,2360)
   if r['orientation']=='landscape':expected=expected[::-1]
   if dim!=expected:errors.append(f['path']+' dimensions '+str(dim))
   if not b.startswith(b'\x89PNG') or len(b)<1000:errors.append(f['path']+' invalid PNG')
   if hashlib.sha256(b).hexdigest()!=f.get('sha256'):errors.append(f['path']+' hash mismatch')
 p.write_text(json.dumps(data,indent=2,ensure_ascii=False));rows+=data
status=dict(collections.Counter(r['status'] for r in rows));verification=dict(states=len(rows),scenarios=len(scenarios),frames=frames,status=status,errors=errors)
(root/'verification.json').write_text(json.dumps(verification,indent=2));print(verification)

if errors: raise SystemExit(1)
