"""Filesystem safety checks use disposable fixtures, never production evidence."""
import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import archive_authoring as archive
import prepare_revision as revision


class ArchiveRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'; self.repo.mkdir()
        self.storage = self.root / 'external'
        self.source = self.repo / 'output/study'; self.source.mkdir(parents=True)
        (self.source / 'source.blend').write_bytes(b'Synthetic archive fixture, not a Blender source')
        (self.source / 'link').symlink_to('source.blend')
        self.patch = patch.object(archive, 'REPO', self.repo); self.patch.start(); self.addCleanup(self.patch.stop)
        self.mount = patch.object(archive, 'mounted', lambda path: None); self.mount.start(); self.addCleanup(self.mount.stop)
        self.plan = self.repo / 'evidence/inventory.json'
        rows = [archive.inspect(p, True) for p in archive.walk(self.source)]
        archive.write(self.plan, {'archive': str(self.storage), 'roots': ['output/study'], 'files': rows,
                                 'fileCount': len(rows), 'bytes': sum(r['bytes'] for r in rows)})
        archive.copy(self.plan)
        self.proof = self.repo / 'evidence/proof.json'
        archive.write(self.proof, {'passed': True, 'inventorySha256': archive.sha(self.plan)})

    def test_exfat_link_descriptor_and_full_recovery_after_retirement(self):
        stored = self.storage / 'original-paths/output/study/link'
        self.assertFalse(stored.is_symlink())
        self.assertEqual(json.loads(stored.read_text())['archivedSymbolicLink'], 'source.blend')
        archive.retire(self.plan, self.proof)
        self.assertTrue(self.source.is_symlink())
        recovered = self.root / 'restored'
        archive.restore(self.plan, recovered)
        self.assertEqual((recovered / 'output/study/source.blend').read_bytes(), (self.source / 'source.blend').read_bytes())
        self.assertEqual((recovered / 'output/study/link').readlink(), Path('source.blend'))
        self.assertEqual((recovered / 'output/study/link').read_bytes(), (self.source / 'source.blend').read_bytes())

    def test_corruption_and_new_source_files_block_retirement(self):
        target = self.storage / 'original-paths/output/study/source.blend'
        original = target.read_bytes(); target.write_bytes(b'corrupt')
        with self.assertRaises(ValueError): archive.retire(self.plan, self.proof)
        self.assertFalse(self.source.is_symlink())
        target.write_bytes(original); (self.source / 'new.txt').write_text('New work must not disappear')
        with self.assertRaises(ValueError): archive.retire(self.plan, self.proof)
        self.assertTrue((self.source / 'new.txt').exists())

    def test_unbound_proof_blocks_retirement(self):
        archive.write(self.proof, {'passed': True, 'inventorySha256': 'wrong'})
        with self.assertRaises(ValueError): archive.retire(self.plan, self.proof)
        self.assertFalse(self.source.is_symlink())


class RevisionSafetyTests(unittest.TestCase):
    def test_copy_keeps_baseline_hashes_and_requires_a_new_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); stored = root / 'archive'; source = stored / 'original-paths/output/take.blend'
            source.parent.mkdir(parents=True); source.write_bytes(b'Synthetic revision fixture')
            inventory = stored / 'inventory.json'; inventory.write_text('{}')
            index = root / 'index.json'; index.write_text(json.dumps({'archiveRoot':str(stored),
                'inventorySha256':archive.sha(inventory), 'handAssets':[], 'exercises':[{'number':2,
                'editableProject':{'path':'output/take.blend','sha256':archive.sha(source)},'motionFiles':{}}]}))
            output = root / 'revision'; revision.prepare(2, output, index)
            self.assertEqual((output / 'hanon-02-editable.blend').read_bytes(), source.read_bytes())
            self.assertFalse(json.loads((output / 'REVISION.json').read_text())['productionReady'])
            with self.assertRaises(FileExistsError): revision.prepare(2, output, index)
            source.write_bytes(b'changed baseline')
            with self.assertRaises(ValueError): revision.prepare(2, root / 'other', index)
            self.assertFalse((root / 'other').exists())


if __name__ == '__main__': unittest.main()
