"""Checksum-verified Hanon archive, recovery and path-compatible local retirement.

The removable archive keeps regular files and portable symlink descriptors because
ExFAT cannot store symlinks. Restoration recreates the original symlinks on APFS.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

REPO = Path(__file__).resolve().parents[2]
VOLUME = Path('/Volumes/2TB-MIGUE')
DEFAULT_ARCHIVE = VOLUME / 'SPino/hanon-2026-10-20/archive-2026-10-21'
ROOTS = ['output/app-hanon-2-10-2026-10-20', 'output/app-no1-2026-10-20',
         'output/blender/hanon-hands-2026-10-20', 'output/video/hanon-cinematic-2026-10-20']
PREFIXES = ('hanon-', 'scan-hanon-', 'run-hanon-')


def sha(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w') as stream:
        json.dump(value, stream, indent=2)
        stream.write('\n')
        stream.flush()
        os.fsync(stream.fileno())


def mounted(archive):
    if not os.path.ismount(VOLUME) or VOLUME.stat().st_dev == REPO.stat().st_dev:
        raise RuntimeError('The real external volume must be mounted; never create a fake mount directory')
    if not archive.is_relative_to(VOLUME):
        raise ValueError('Archive destination must remain on the owner-authorized external volume')


def walk(path):
    if path.is_symlink() or path.is_file():
        yield path
        return
    for base, dirs, files in os.walk(path, followlinks=False):
        dirs.sort()
        for name in dirs[:]:
            child = Path(base) / name
            if child.is_symlink():
                yield child
                dirs.remove(name)
        for name in sorted(files):
            yield Path(base) / name


def descriptor(target):
    return (json.dumps({'archivedSymbolicLink': target}, sort_keys=True) + '\n').encode()


def inspect(path, relocate):
    relative = str(path.relative_to(REPO))
    row = {'path': relative, 'relocate': relocate,
           'stored': ('original-paths/' if relocate else 'repository-snapshot/') + relative}
    if path.is_symlink():
        row.update(type='symlink', target=os.readlink(path))
        row['sha256'] = hashlib.sha256(descriptor(row['target'])).hexdigest()
        row['bytes'] = len(descriptor(row['target']))
    else:
        row.update(type='file', bytes=path.stat().st_size, sha256=sha(path), mode=path.stat().st_mode & 0o777)
    return row


def verify_entry(row, path, stored=False):
    if row['type'] == 'symlink' and not stored:
        if not path.is_symlink() or os.readlink(path) != row['target']:
            raise ValueError('Symbolic link changed: ' + str(path))
    elif not path.is_file() or path.stat().st_size != row['bytes'] or sha(path) != row['sha256']:
        raise ValueError('Bytes changed: ' + str(path))


def plan(path, archive):
    roots = ROOTS + [str(p.relative_to(REPO)) for p in sorted((REPO / 'output/review').iterdir())
                    if p.name.startswith(PREFIXES)]
    tracked = set(subprocess.check_output(['git', 'ls-files', '-z'], cwd=REPO).decode().split('\0'))
    rows = []
    for root in roots:
        source = REPO / root
        if source.is_symlink():
            raise ValueError('Already relocated: ' + root)
        for item in walk(source):
            if str(item.relative_to(REPO)) in tracked:
                raise ValueError('Refusing to retire tracked work: ' + str(item))
            rows.append(inspect(item, True))
    support = list((REPO / 'scripts/hanon').glob('*.py')) + [REPO / 'scripts/hanon/README.md']
    support += list((REPO / 'scripts/review').glob('*hanon*'))
    support += list((REPO / 'public/warmups/hanon-frames-v1/exercises').glob('*.json'))
    for item in sorted(set(support)):
        if item.is_file():
            rows.append(inspect(item, False))
    value = {'version': 1, 'createdAt': time.time(), 'repository': str(REPO), 'archive': str(archive),
             'gitHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO).decode().strip(),
             'roots': roots, 'files': rows, 'fileCount': len(rows),
             'bytes': sum(r['bytes'] for r in rows),
             'exclusions': ['Private hand photographs', 'Personal notebooks and native recovery backups',
                            'Runtime banks, application source, regression tests and committed review evidence',
                            'Unrelated dirty work', 'Active complete-exercise review viewer']}
    write(path, value)
    print(json.dumps({'files': len(rows), 'bytes': value['bytes'], 'roots': len(roots)}), flush=True)


def copy(plan_path):
    value = json.loads(plan_path.read_text()); archive = Path(value['archive']); mounted(archive)
    archive.mkdir(parents=True, exist_ok=False)
    write(archive / 'inventory.json', value)
    for i, row in enumerate(value['files']):
        source, target = REPO / row['path'], archive / row['stored']
        verify_entry(row, source)
        target.parent.mkdir(parents=True, exist_ok=True)
        if row['type'] == 'symlink':
            target.write_bytes(descriptor(row['target']))
        else:
            shutil.copy2(source, target)
        with target.open('rb') as stream:
            os.fsync(stream.fileno())
        verify_entry(row, target, stored=True)
        if (i + 1) % 1000 == 0:
            print('Copied and verified', i + 1, '/', value['fileCount'], flush=True)
    verify(plan_path, source=True)
    write(archive / 'COPY-VERIFIED.json', {'inventorySha256': sha(plan_path), 'fileCount': value['fileCount'],
                                         'bytes': value['bytes'], 'verifiedAt': time.time()})
    print('Complete source and destination verification passed', flush=True)


def verify(plan_path, source=False):
    value = json.loads(plan_path.read_text()); archive = Path(value['archive']); mounted(archive)
    if sha(archive / 'inventory.json') != sha(plan_path):
        raise ValueError('Archive inventory changed')
    for row in value['files']:
        verify_entry(row, archive / row['stored'], stored=True)
        if source:
            verify_entry(row, REPO / row['path'])
    print('All archive bytes verified:', value['fileCount'], flush=True)


def retire(plan_path, proof_path):
    value = json.loads(plan_path.read_text()); archive = Path(value['archive']); mounted(archive)
    proof = json.loads(proof_path.read_text())
    if proof.get('passed') is not True or proof.get('inventorySha256') != sha(plan_path):
        raise ValueError('A real archived-source reproduction proof is required before retirement')
    verify(plan_path, source=True)
    by_root = {root: {r['path'] for r in value['files'] if r['relocate'] and
                     (r['path'] == root or r['path'].startswith(root + '/'))} for root in value['roots']}
    for root, expected in by_root.items():
        if {str(p.relative_to(REPO)) for p in walk(REPO / root)} != expected:
            raise ValueError('New or missing source files: ' + root)
    records = []
    staging = plan_path.parent / 'retiring'; staging.mkdir(exist_ok=False)
    for i, root in enumerate(value['roots']):
        source, target, temporary = REPO / root, archive / 'original-paths' / root, staging / str(i)
        source.rename(temporary)
        try:
            source.symlink_to(target, target_is_directory=temporary.is_dir())
        except BaseException:
            temporary.rename(source)
            raise
        if temporary.is_dir():
            shutil.rmtree(temporary)
        else:
            temporary.unlink()
        records.append({'original': root, 'archive': str(target), 'compatibilityLink': str(source)})
    staging.rmdir()
    report = {'passed': True, 'retiredAt': time.time(), 'inventorySha256': sha(plan_path),
              'files': value['fileCount'], 'bytesArchived': value['bytes'], 'links': records,
              'originalEvidenceRecoverable': True, 'privatePhotosAndNotebooksUntouched': True}
    write(plan_path.parent / 'retirement.json', report)
    write(archive / 'RETIREMENT.json', report)
    print('Verified local copies retired; original paths retained as archive aliases', flush=True)


def restore(plan_path, destination):
    value = json.loads(plan_path.read_text()); archive = Path(value['archive']); verify(plan_path)
    destination.mkdir(parents=True, exist_ok=False)
    for row in value['files']:
        target = destination / row['path']; target.parent.mkdir(parents=True, exist_ok=True)
        if row['type'] == 'symlink':
            target.symlink_to(row['target'])
        else:
            shutil.copy2(archive / row['stored'], target)
        verify_entry(row, target)
    write(destination / 'RESTORED.json', {'inventorySha256': sha(plan_path), 'verifiedAt': time.time()})


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['plan', 'copy', 'verify', 'retire', 'restore'])
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--archive', type=Path, default=DEFAULT_ARCHIVE)
    parser.add_argument('--proof', type=Path)
    parser.add_argument('--destination', type=Path)
    args = parser.parse_args()
    if args.action == 'plan': plan(args.plan, args.archive)
    elif args.action == 'copy': copy(args.plan)
    elif args.action == 'verify': verify(args.plan)
    elif args.action == 'retire': retire(args.plan, args.proof)
    else: restore(args.plan, args.destination)
