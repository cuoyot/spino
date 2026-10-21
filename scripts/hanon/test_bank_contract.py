"""Fast authoring contract/packing guards; no Blender or public assets are changed."""
import copy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import numpy as np
from PIL import Image

import bank_contract as contract
from export_frame_bank import crop_native, finalize, WIDTH, HEIGHT


class BankContractTests(unittest.TestCase):
    def setUp(self):
        self.tmp=TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
        self.source=self.root/'fixture.blend';self.source.write_bytes(b'Synthetic source fixture only')
        self.track={'number':2,'productionReady':True,'authorRoot':str(self.root),'sourceBlend':self.entry(self.source),'hands':{}}
        for side in ('left','right'):
            record={'wrists':[[0,0,0]]*2880,'clearance_angles':[[0,0]]*2880,'metadata':{'pressure':[0]*2880}}
            input_path=self.save(side+'-input.json',record);cache=self.root/(side+'.npz');cache.write_bytes(b'Synthetic opaque hash fixture, never rendered')
            scan={'input_sha256':contract.sha(input_path),'solution_cache_sha256':contract.sha(cache),'finger_checks':14400,
                  'physics_failures':[],'support_failures':[],'self_crossings':[],'fresh_scan_without_search_cache':True,'canonical_note_and_fingering_errors':0}
            self.track['hands'][side]={'input':self.entry(input_path),'solutions':self.entry(cache),'scan':self.entry(self.save(side+'-scan.json',scan))}
        native={'passed':True,'nativeFrames':2880,'motionContinuityPassed':True,'visualReviewPassed':True,
                'hands':{s:{k+'Sha256':self.track['hands'][s][k]['sha256'] for k in ('input','solutions')} for s in ('left','right')}}
        self.track['nativeAudit']=self.entry(self.save('native.json',native))
        self.track['canonical']=self.entry(self.save('canonical.json',{'id':'hanon-2','events':[[0]*6]*113,'frames':[[0]*8]*1440}))
        self.path=self.save('track.json',self.track)
        self.patch=patch.object(contract,'APPROVED_SHA256',contract.sha(self.source));self.patch.start();self.addCleanup(self.patch.stop)

    def entry(self,path):return {'path':str(path),'sha256':contract.sha(path)}
    def save(self,name,data):
        path=self.root/name;path.write_text(json.dumps(data));return path
    def rewrite_track(self):self.save('track.json',self.track)

    def test_complete_bound_fixture_passes_and_partial_sources_are_rejected(self):
        self.assertEqual(contract.verify_track(self.path)['number'],2)
        self.track['productionReady']=False;self.rewrite_track()
        with self.assertRaisesRegex(ValueError,'has not passed'):contract.verify_track(self.path)

    def test_idle_crossings_cannot_be_hidden_by_passed_playing_supports(self):
        entry=self.track['hands']['left']['scan'];scan=contract.read_json(entry['path']);scan['self_crossings']=[{'frame':73,'finger':2}]
        self.save('left-scan.json',scan);self.track['hands']['left']['scan']=self.entry(Path(entry['path']));self.rewrite_track()
        with self.assertRaisesRegex(ValueError,'placement is still failing'):contract.verify_track(self.path)

    def test_native_audit_must_match_the_exact_motion_cache(self):
        native=contract.read_json(self.track['nativeAudit']['path']);native['hands']['right']['solutionsSha256']='old-cache'
        self.track['nativeAudit']=self.entry(self.save('native.json',native));self.rewrite_track()
        with self.assertRaisesRegex(ValueError,'not bound'):contract.verify_track(self.path)

    def test_changed_input_is_rejected_even_with_an_updated_handoff_hash(self):
        entry=self.track['hands']['left']['input'];record=contract.read_json(entry['path']);record['wrists'][77]=[1,0,0]
        self.save('left-input.json',record);self.track['hands']['left']['input']=self.entry(Path(entry['path']));self.rewrite_track()
        with self.assertRaisesRegex(ValueError,'not bound'):contract.verify_track(self.path)

    def test_native_crop_preserves_every_changed_edge_pixel(self):
        neutral=np.full((HEIGHT,WIDTH,3),91,dtype=np.uint8);full=neutral.copy();full[0,0]=[5,6,7];full[-1,-1]=[9,8,7];full[130:190,200:270]=[170,120,80]
        path=self.root/'native.png';Image.fromarray(full).save(path)
        image,box,_=crop_native(path,neutral);result=Image.fromarray(neutral).convert('RGBA');result.alpha_composite(image,(box[0],box[1]))
        self.assertTrue(np.array_equal(np.array(result.convert('RGB')),full))
        self.assertEqual(box,[0,0,WIDTH,HEIGHT])

    def test_partial_bank_cannot_publish_a_runtime_index(self):
        class Args:destination=self.root;license=None
        with self.assertRaisesRegex(ValueError,'All nine complete tracks'):finalize(Args(),{'exercises':{'2':{}}})
        self.assertFalse((self.root/'index.json').exists())


if __name__=='__main__':unittest.main()
