"""Verify immutable registered assets and their actual native codec measurements."""
import argparse
from pathlib import Path
from bank_contract import read_json,write_json,sha,verify_track,checked_file
p=argparse.ArgumentParser();p.add_argument('--work',type=Path,required=True);p.add_argument('--destination',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--require-all',action='store_true');a=p.parse_args()
assert not a.output.exists(),'Preserve earlier integrity evidence'
registry_bytes=(a.work/'registry.json').read_bytes()
import json,hashlib,datetime
r=json.loads(registry_bytes);numbers=sorted(map(int,r['exercises']))
if a.require_all and numbers!=list(range(2,11)):raise ValueError('All nine complete exercises are required')
rows=[]
for n in numbers:
 entry=r['exercises'][str(n)];track=verify_track(entry['track'])
 if sha(entry['track'])!=entry['trackSha256'] or sha(entry['timeline'])!=entry['timelineSha256']:raise ValueError('Registered source/timeline changed')
 audit=read_json(checked_file(track['nativeAudit']));checked_file(audit['sourceBlend'])
 for binding in audit['reports'].values():checked_file(binding)
 for relative,saved in entry['files'].items():
  file=a.destination/relative
  if not file.is_file() or file.stat().st_size!=saved['bytes'] or sha(file)!=saved['sha256']:raise ValueError('Registered runtime asset changed: '+str(file))
 checks={};packs=[];chunks=sorted((a.work/f'hanon-{n:02d}/chunks').glob('*/manifest.json'))
 for manifest in chunks:
  chunk=read_json(manifest)
  if chunk['number']!=n or sha(manifest.parent/'native-export-report.json')!=chunk['nativeReportSha256']:raise ValueError('Chunk native evidence changed')
  for pack in chunk['packs']:
   if pack['decodedBytes']!=pack['width']*pack['height']*4 or pack['decodedBytes']>=5*1024*1024 or max(pack['width'],pack['height'])>2048:raise ValueError('Decoded pack bound exceeded')
   if sha(a.destination/pack['file'])!=pack['sha256']:raise ValueError('Chunk atlas changed')
   packs.append(pack['file'])
   for c in pack['imageChecks']:
    if c['sprite'] in checks or c['mae255']>1.5 or c['psnrDb']<40:raise ValueError('Native codec measurement missing, duplicated or outside bounds')
    checks[c['sprite']]=c
 expected={rec['id'] for rec in r['records'] if rec['number']==n}
 if set(checks)!=expected or len(expected)!=entry['nativeImageCount']:raise ValueError('Full native image codec ledger is incomplete')
 rows.append({'number':n,'sourceApprovalSha256':entry['trackSha256'],'nativeSourceSha256':audit['sourceBlend']['sha256'],'completeNativeImages':len(expected),'chunks':len(chunks),'packCount':len(packs),'runtimeFilesHashVerified':len(entry['files']),'maximumFullImageMae255':max(c['mae255'] for c in checks.values()),'minimumFullImagePsnrDb':min(c['psnrDb'] for c in checks.values()),'alphaQualification':'Exact alpha enforced during original AVIF decode/reconstruction by unchanged exporter; this audit verifies those recorded atlas hashes, not a new decode'})
report={'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'kind':'Read-only registered complete-bank integrity and full native codec ledger audit; app/native/publication acceptance remains separate','registrySnapshotSha256':hashlib.sha256(registry_bytes).hexdigest(),'completeExerciseNumbers':numbers,'allNineRegistered':numbers==list(range(2,11)),'exercises':rows,'passed':True}
write_json(a.output,report);print(json.dumps(report,indent=2))
