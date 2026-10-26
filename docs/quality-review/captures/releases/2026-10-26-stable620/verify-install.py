from pathlib import Path
import subprocess,json,time,hashlib
adb='/Users/migue/Library/Android/sdk/platform-tools/adb';root=Path('/private/tmp/spino-sync-pack-beta');out=Path('/Users/migue/Source/spino/output/releases/6.2.0');e=root/'docs/quality-review/captures/releases/2026-10-26-stable620';e.mkdir(parents=True,exist_ok=True);private=Path('/Users/migue/Source/spino/output/native-review-backups/2026-10-26-stable620');private.mkdir(parents=True,exist_ok=True)
def run(args,timeout=240):return subprocess.check_output([adb,'-s','emulator-5554']+args,timeout=timeout)
def hashes(pkg):
 path='/data/user/0/'+pkg+'/app_webview/Default/IndexedDB';data=run(['shell','su','0','find',path,'-type','f','-exec','sha256sum','{}',r'\;']).decode()
 return dict(line.split('  ',1)[::-1] for line in data.strip().splitlines())
packages=['com.miguecoll.spino','com.miguecoll.spino.beta'];before={}
for pkg in packages:
 run(['shell','am','force-stop',pkg]);before[pkg]=hashes(pkg);assert before[pkg]
 (private/(pkg+'.tar')).write_bytes(run(['exec-out','su','0','tar','-C','/data/user/0/'+pkg,'-cf','-','.']))
(private/'before-hashes.json').write_text(json.dumps(before,indent=2))
for pkg,name in [('com.miguecoll.spino.beta','spino-6.2.0-112-beta-emulator.apk'),('com.miguecoll.spino','spino-6.2.0-112-android.apk')]:
 result=run(['install','-r',str(out/name)]).decode();assert 'Success' in result
 after={p:hashes(p) for p in packages};assert before==after
run(['shell','am','start','-n','com.miguecoll.spino/com.miguecoll.spino.MainActivity']);time.sleep(3)
foreground=[x.strip() for x in run(['shell','dumpsys','activity','activities']).decode().splitlines() if 'topResumedActivity' in x or 'mResumedActivity' in x];assert any('com.miguecoll.spino/.MainActivity' in x or 'com.miguecoll.spino/com.miguecoll.spino.MainActivity' in x for x in foreground)
(e/'launch.png').write_bytes(run(['exec-out','screencap','-p']))
v={'version':'6.2.0','versionCode':112,'replacementInstall':True,'indexedDBFilesPreserved':{p:len(before[p]) for p in packages},'verification':'Exact pre-launch SHA-256 manifests equal across both replacement installs','applicationDataCleared':False,'foregroundVerified':True,'foreground':foreground,'nativeVisualAcceptance':False,'physicalGoogleAcceptance':False}
(e/'install.json').write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(v))
