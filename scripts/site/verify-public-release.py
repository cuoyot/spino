"""Verify the deployed release, localized pages, downloads and current website images."""
import concurrent.futures
import datetime
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import time
import urllib.parse

version, commit = sys.argv[1:3]
root = pathlib.Path(__file__).resolve().parents[2]
origin = 'https://spinoapp.com/'
manifest_path = f'downloads/spino-{version}-checksums.json'
manifest = json.loads((root / 'site' / manifest_path).read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()

def fetch(url):
    return subprocess.run(['curl', '-fsSL', '--retry', '2', '--retry-delay', '2', '--connect-timeout', '10', '--max-time', '30', url], check=True, capture_output=True).stdout

previous_status = None
for attempt in range(40):
    checks = json.loads(fetch(f'https://api.github.com/repos/cuoyot/spino/commits/{commit}/check-runs'))
    deployment = next((c for c in checks.get('check_runs', []) if c['name'] == 'Workers Builds: spino'), None)
    status = (deployment.get('status'), deployment.get('conclusion')) if deployment else ('waiting', None)
    if status != previous_status:
        print('Cloudflare deployment:', status, flush=True)
        previous_status = status
    if deployment and deployment['status'] == 'completed':
        assert deployment['conclusion'] == 'success', deployment.get('output')
        break
    time.sleep(10)
else:
    raise RuntimeError('Deployment did not complete within this verification run.')

pages, image_paths = [], set()
for language, relative in [('es', ''), ('en', 'en/'), ('ca', 'ca/')]:
    url = origin + relative
    expected = (root / 'site' / relative / 'index.html').read_bytes()
    for attempt in range(6):
        body = fetch(url)
        if body == expected:
            break
        time.sleep(5)
    assert body == expected, f'Public page mismatch: {url}'
    html = body.decode()
    assert version in html and '6.1.0 (76)' in html
    pages.append({'language': language, 'url': url, 'bytes': len(body), 'sha256': sha(body)})
    for reference in re.findall(r'<img[^>]+src="([^"]+)"', html):
        parsed = urllib.parse.urlparse(urllib.parse.urljoin(url, reference))
        image_paths.add((parsed.path.lstrip('/'), parsed.query))

actual_manifest = fetch(origin + manifest_path)
assert actual_manifest == (root / 'site' / manifest_path).read_bytes()

artifacts = {a['file']: a for a in manifest['artifacts']}
previous = [json.loads(path.read_text()) for path in (root / 'docs/releases').glob('*-artifacts.json')]
previous = [item for item in previous if item.get('channel') == manifest.get('channel') and item.get('build', 0) < manifest['build']]
if previous:
    previous_manifest = max(previous, key=lambda item: item['build'])
    artifacts[previous_manifest['artifacts'][0]['file']] = previous_manifest['artifacts'][0]
for artifact in json.loads((root / 'site/downloads/spino-6.0.0-checksums.json').read_text())['artifacts']:
    artifacts[artifact['file']] = artifact

def verify_artifact(artifact):
    url = origin + 'downloads/' + artifact['file']
    body = fetch(url)
    assert len(body) == artifact['bytes'], url
    assert sha(body) == artifact['sha256'], url
    return {'url': url, 'bytes': len(body), 'sha256': sha(body)}

def verify_image(item):
    path, query = item
    url = origin + path + ('?' + query if query else '')
    body = fetch(url)
    assert body == (root / 'site' / path).read_bytes(), url
    return {'url': url, 'bytes': len(body), 'sha256': sha(body)}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    downloads = list(executor.map(verify_artifact, artifacts.values()))
    images = list(executor.map(verify_image, sorted(image_paths)))

result = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'version': version, 'build': manifest['build'], 'websiteCommit': commit, 'tag': 'v' + version, 'languagePages': pages, 'manifestSHA256': sha(actual_manifest), 'downloads': downloads, 'websiteImages': images, 'languagePagesWithoutCacheQueryVerified': True, 'deployment': {'provider': 'Cloudflare Workers Builds', 'check': deployment['name'], 'status': deployment['status'], 'conclusion': deployment['conclusion'], 'detailsURL': deployment['details_url']}, 'nativeEvidence': json.loads((root / f'docs/releases/{version}-validation.json').read_text())['nativeEvidence'], 'physicalDeviceAcceptance': False}
(root / f'docs/releases/{version}-publication.json').write_text(json.dumps(result, indent=2) + '\n')
print(f'Public verification passes: {len(pages)} language pages, manifest, {len(downloads)} downloads and {len(images)} images.', flush=True)
