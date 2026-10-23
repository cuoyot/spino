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
import tempfile
import urllib.parse

version, commit = sys.argv[1:3]
retained_range_only = '--retained-large-range-only' in sys.argv[3:]
provider_path = next((arg.split('=', 1)[1] for arg in sys.argv[3:] if arg.startswith('--provider-evidence=')), None)
direct_path = next((arg.split('=', 1)[1] for arg in sys.argv[3:] if arg.startswith('--direct-deployment-evidence=')), None)
root = pathlib.Path(__file__).resolve().parents[2]
origin = 'https://spinoapp.com/'
manifest_path = f'downloads/spino-{version}-checksums.json'
manifest = json.loads((root / 'site' / manifest_path).read_text())
sha = lambda data: hashlib.sha256(data).hexdigest()

def fetch(url, max_seconds=30):
    # A retry must replace a partial download, never append it to captured stdout.
    for attempt in range(3):
        try:
            with tempfile.NamedTemporaryFile() as download:
                subprocess.run(['curl', '-fsSL', '--connect-timeout', '10', '--max-time', str(max_seconds), '-o', download.name, url], check=True, capture_output=True)
                return pathlib.Path(download.name).read_bytes()
        except subprocess.CalledProcessError:
            if attempt == 2:
                raise
            time.sleep(2)

if direct_path:
    direct = json.loads(pathlib.Path(direct_path).read_text())
    assert direct['commit'] == commit and direct['exitCode'] == 0
    log = pathlib.Path(direct['log']).read_bytes()
    assert sha(log) == direct['logSHA256']
    assert ('Current Version ID: ' + direct['versionId']) in log.decode()
    deployment = {'name': 'Wrangler direct deployment', 'status': 'completed', 'conclusion': 'success', 'details_url': direct['detailsURL']}
else:
    previous_status = None
    for attempt in range(40):
        checks = json.loads(pathlib.Path(provider_path).read_text()) if provider_path else json.loads(fetch(f'https://api.github.com/repos/cuoyot/spino/commits/{commit}/check-runs'))
        deployment = next((c for c in checks.get('check_runs', []) if c['name'] == 'Workers Builds: spino'), None)
        if provider_path:
            assert deployment and deployment.get('head_sha') == commit, 'Saved authenticated provider evidence must bind this exact full SHA'
            assert deployment['status'] == 'completed' and deployment['conclusion'] == 'success', 'Saved provider evidence must prove a completed successful build'
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
for language, relative in [('es', ''), ('en', 'en/'), ('ca', 'ca/'), ('de', 'de/'), ('hu', 'hu/')]:
    url = origin + relative
    expected = (root / 'site' / relative / 'index.html').read_bytes()
    for attempt in range(6):
        body = fetch(url)
        if body == expected:
            break
        time.sleep(5)
    assert body == expected, f'Public page mismatch: {url}'
    html = body.decode()
    assert version in html and f"{manifest.get('stable', {}).get('version', version)} ({manifest.get('stable', {}).get('build', manifest['build'])})" in html
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
stable_manifest = root / 'site/downloads' / f"spino-{manifest['stable']['version']}-checksums.json"
for artifact in json.loads(stable_manifest.read_text())['artifacts']:
    artifacts[artifact['file']] = artifact

def verify_artifact(artifact):
    url = origin + 'downloads/' + artifact['file']
    if retained_range_only and artifact['file'] != manifest['artifacts'][0]['file'] and artifact['bytes'] > 100 * 1024 * 1024:
        # Unchanged large legacy releases were already fully verified at release.
        # Bind the retained local full hash, then check live remote cross-part,
        # middle and final ranges without redownloading hundreds of megabytes.
        candidates = list((root / 'artifacts').rglob(artifact['file']))
        local = next((path for path in candidates if path.stat().st_size == artifact['bytes']), None)
        assert local is not None, 'A full retained artifact is required for range-only legacy verification'
        digest = hashlib.sha256()
        with local.open('rb') as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b''):
                digest.update(chunk)
        assert digest.hexdigest() == artifact['sha256'], local
        prior_path = root / 'docs/releases' / f"{artifact['version']}-publication.json"
        prior_report = json.loads(prior_path.read_text())
        assert any(item['url'] == url and item['bytes'] == artifact['bytes'] and item['sha256'] == artifact['sha256'] for item in prior_report['downloads']), 'A prior full public verification is required'
        ranges = []
        for start, end in [(0, 30), (20971510, 20971540), (artifact['bytes']//2, artifact['bytes']//2+30), (artifact['bytes']-31, artifact['bytes']-1)]:
            with tempfile.NamedTemporaryFile() as headers:
                response = subprocess.run(['curl', '-fsSL', '--connect-timeout', '10', '--max-time', '60', '--range', f'{start}-{end}', '-D', headers.name, url], check=True, capture_output=True).stdout
                header_text = pathlib.Path(headers.name).read_text().lower()
            assert re.search(r'http/[^ ]+ 206', header_text), header_text
            assert f'content-range: bytes {start}-{end}/{artifact["bytes"]}' in header_text, header_text
            with local.open('rb') as source:
                source.seek(start)
                assert response == source.read(end-start+1), 'Retained public range mismatch'
            ranges.append({'start': start, 'end': end, 'status': 206, 'bytes': len(response), 'sha256': sha(response)})
        return {'url': url, 'bytes': artifact['bytes'], 'sha256': artifact['sha256'], 'verification': 'Unchanged legacy local full hash plus live public range samples; full public body was verified in its original publication', 'priorFullPublicationProof': {'file': str(prior_path.relative_to(root)), 'sha256': sha(prior_path.read_bytes()), 'verifiedAt': prior_report['verifiedAt']}, 'ranges': ranges}
    body = fetch(url, max_seconds=180)
    assert len(body) == artifact['bytes'], f"{url}: received {len(body)} bytes, expected {artifact['bytes']}"
    assert sha(body) == artifact['sha256'], url
    result = {'url': url, 'bytes': len(body), 'sha256': sha(body)}
    if artifact['file'] == manifest['artifacts'][0]['file']:
        ranges = [(20971510, 20971530), (41943030, 41943060), (len(body)-31, len(body)-1)]
        result['ranges'] = []
        for start, end in ranges:
            with tempfile.NamedTemporaryFile() as headers:
                response = subprocess.run(['curl', '-fsSL', '--connect-timeout', '10', '--max-time', '60', '--range', f'{start}-{end}', '-D', headers.name, url], check=True, capture_output=True).stdout
                header_text = pathlib.Path(headers.name).read_text().lower()
            assert re.search(r'http/[^ ]+ 206', header_text), header_text
            assert f'content-range: bytes {start}-{end}/{len(body)}' in header_text, header_text
            assert response == body[start:end+1], f'Public range mismatch: {url} {start}-{end}'
            result['ranges'].append({'start': start, 'end': end, 'bytes': len(response), 'status': 206, 'sha256': sha(response)})
    return result

def verify_image(item):
    path, query = item
    url = origin + path + ('?' + query if query else '')
    body = fetch(url)
    assert body == (root / 'site' / path).read_bytes(), url
    return {'url': url, 'bytes': len(body), 'sha256': sha(body)}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    downloads = list(executor.map(verify_artifact, artifacts.values()))
    images = list(executor.map(verify_image, sorted(image_paths)))

result = {'verifiedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'version': version, 'build': manifest['build'], 'websiteCommit': commit, 'tag': 'v' + version, 'languagePages': pages, 'manifestSHA256': sha(actual_manifest), 'downloads': downloads, 'websiteImages': images, 'languagePagesWithoutCacheQueryVerified': True, 'deployment': {'provider': 'Cloudflare Wrangler' if direct_path else 'Cloudflare Workers Builds', 'check': deployment['name'], 'status': deployment['status'], 'conclusion': deployment['conclusion'], 'detailsURL': deployment['details_url']}, 'nativeEvidence': json.loads((root / f'docs/releases/{version}-validation.json').read_text())['nativeEvidence'], 'physicalDeviceAcceptance': False}
if direct_path:
    result['deployment']['directEvidence'] = {'file': direct_path, 'sha256': sha(pathlib.Path(direct_path).read_bytes()), 'versionId': direct['versionId']}
if provider_path:
    result['deployment']['authenticatedConnectorEvidence'] = {'file': provider_path, 'sha256': sha(pathlib.Path(provider_path).read_bytes()), 'headSHA': deployment['head_sha']}
(root / f'docs/releases/{version}-publication.json').write_text(json.dumps(result, indent=2) + '\n')
print(f'Public verification passes: {len(pages)} language pages, manifest, {len(downloads)} downloads and {len(images)} images.', flush=True)
