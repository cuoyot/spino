"""Replace-install a beta, retain a private recovery archive and verify data before launch."""
import datetime
import hashlib
import json
import os
import pathlib
import re
import subprocess
import sys
import uuid

apk, destination, version, code = sys.argv[1:5]
adb = os.environ.get('ADB', '/Users/migue/Library/Android/sdk/platform-tools/adb')
package = 'com.miguecoll.spino.beta'
folder = pathlib.Path(destination)
folder.mkdir(parents=True, exist_ok=False)

def run(*args, timeout=60):
    return subprocess.check_output([adb, *args], timeout=timeout).decode().strip()

def hashes():
    names = run('shell', 'run-as', package, 'find', 'app_webview/Default/IndexedDB', '-type', 'f').splitlines()
    return {name: run('shell', 'run-as', package, 'sha256sum', name).split()[0] for name in sorted(names)}

run('shell', 'am', 'force-stop', package)
private = pathlib.Path('output/native-review-backups')
private.mkdir(parents=True, exist_ok=True, mode=0o700)
archive = private / (package + '-' + str(uuid.uuid4()) + '.tar')
backup = subprocess.check_output([adb, 'exec-out', 'run-as', package, 'tar', '-cf', '-', 'app_webview', 'files', 'shared_prefs'], timeout=60)
with os.fdopen(os.open(archive, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'wb') as output:
    output.write(backup)
before = hashes()
installed = run('install', '-r', str(pathlib.Path(apk).resolve()), timeout=180)
assert 'Success' in installed, installed
assert hashes() == before, 'Original IndexedDB files changed before application launch'
details = run('shell', 'dumpsys', 'package', package)
assert re.search(r'versionCode=' + re.escape(code) + r'\b', details), 'Installed versionCode differs'
assert 'versionName=' + version in details, 'Installed versionName differs'
run('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
run('shell', 'wm', 'dismiss-keyguard')
launch = run('shell', 'am', 'start', '-W', '-n', package + '/com.miguecoll.spino.MainActivity', '--es', 'spinoReview', 'storage-check')
foreground = [line.strip() for line in run('shell', 'dumpsys', 'activity', 'activities').splitlines() if 'topResumedActivity' in line]
assert any(package + '/com.miguecoll.spino.MainActivity' in line for line in foreground), foreground
result = {
    'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'version': version, 'build': int(code),
    'applicationId': package, 'replacementInstall': installed, 'applicationStorageCleared': False,
    'retainedFiles': len(before), 'allOriginalIndexedDBFilesUnchangedBeforeLaunch': True,
    'originalIndexedDBFileHashes': before, 'privateBackup': str(archive),
    'privateBackupSHA256': hashlib.sha256(backup).hexdigest(),
    'apkSHA256': hashlib.sha256(pathlib.Path(apk).read_bytes()).hexdigest(),
    'launch': launch, 'foreground': foreground, 'physicalDeviceAcceptance': False,
}
(folder / 'native-handoff.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'version': version, 'build': int(code), 'retainedFiles': len(before), 'replacementInstall': 'Success', 'foreground': True}))
