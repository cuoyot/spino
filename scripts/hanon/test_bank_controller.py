"""Controller integration with synthetic pictures and mocked native audits only.

This verifies interrupted-chunk recovery, exact identity reuse and AVIF packing;
it is never evidence that any actual exercise or hand pose has passed.
"""
from collections import Counter
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from PIL import Image, ImageDraw

import export_frame_bank as bank
from bank_contract import sha, read_json, write_json


class ControllerTests(unittest.TestCase):
    def test_interrupted_chunk_resumes_and_shared_identities_keep_stable_ids(self):
        with TemporaryDirectory() as temporary:
            root=Path(temporary);work=root/'work';dest=root/'synthetic-bank';tracks={};calls=Counter();fail_right=[True]
            (root/'canonical/exercises').mkdir(parents=True)
            write_json(root/'canonical/index.json',{'scoreSha256':'synthetic-score-fixture'})
            for number in range(2,11):
                canonical=root/f'canonical/exercises/hanon-{number}.json'
                write_json(canonical,{'id':f'hanon-{number}','events':[[21,5,28,1,0,0]]*113,'frames':[[min(112,i*113//1440),1,0,0,0,0,0,0] for i in range(1440)]})
                track=root/f'track-{number}.json';write_json(track,{'number':number,'canonical':{'path':str(canonical),'sha256':sha(canonical)}});tracks[number]=track
            def mock_render(job,directory):
                directory=Path(directory);out=Path(job['outputDirectory']);out.mkdir(parents=True,exist_ok=True)
                report={'trackSha256':sha(job['track']),'fingerprintVersion':3,'authorFingerprint':{'fixture':'synthetic'},'timeline':[],'frames':[]}
                if job.get('scanTimeline'):
                    report['timeline']=[{'nativeFrame':1+2*i if i<1439 else 2880,'eventIndex':min(112,i*113//1440),
                       'hands':{'left':{'pressed':i<1439},'right':{'pressed':i<1439}},'signatures':{mode:'fixture-'+mode for mode in bank.MODES}} for i in range(1440)]
                if job.get('renderNeutral'):Image.new('RGB',(720,400),'#30343c').save(out/'keyboard-neutral.png')
                for item in job.get('renders',[]):
                    mode=item['mode'];is_chunk=directory.parent.name=='chunks';calls[(mode,is_chunk)]+=1
                    if is_chunk and mode=='right' and fail_right[0]:fail_right[0]=False;raise RuntimeError('Synthetic interrupted native worker')
                    picture=Image.new('RGB',(720,400),'#30343c');draw=ImageDraw.Draw(picture)
                    if mode in ('left','both'):draw.rounded_rectangle((150,180,280,370),radius=18,fill='#b88a6c')
                    if mode in ('right','both'):draw.rounded_rectangle((440,180,570,370),radius=18,fill='#b88a6c')
                    picture.save(out/item['filename']);report['frames'].append({'seconds':0.0})
                write_json(out/'native-export-report.json',report);return report
            def command(name,number=None):
                args=['export_frame_bank.py',name,'--work',str(work),'--destination',str(dest),'--workers','1']
                if number:args+=['--track',str(tracks[number])]
                if name=='finalize':
                    license=root/'LICENSE.txt';license.write_text('Synthetic controller test fixture');args+=['--license',str(license)]
                with patch('sys.argv',args):bank.main()
            with patch.object(bank,'verify_track',side_effect=lambda path:read_json(path)),patch.object(bank,'render',side_effect=mock_render):
                with self.assertRaisesRegex(RuntimeError,'Synthetic interrupted'):command('add',2)
                self.assertFalse(read_json(work/'registry.json')['exercises'])
                self.assertFalse((dest/'index.json').exists())
                command('add',2)
                self.assertEqual(calls[('left',True)],1,'Completed native chunk must not render again')
                self.assertEqual(calls[('right',True)],2,'Interrupted native chunk must retry')
                self.assertEqual(calls[('both',True)],1)
                for number in range(3,11):command('add',number)
                registry=read_json(work/'registry.json');self.assertEqual(len(registry['records']),3)
                self.assertEqual(len(registry['exercises']),9)
                self.assertFalse((dest/'index.json').exists(),'Full registry does not publish itself')
                command('finalize')
                index=read_json(dest/'index.json');self.assertEqual(len(index['sprites']),3);self.assertEqual(len(index['exercises']),9)
                for number in range(2,11):
                    data=read_json(dest/f'exercises/hanon-{number}.json');self.assertEqual(len(data['frames']),1440)
                    self.assertEqual(data['frames'][0][2],0);self.assertEqual(data['frames'][0][5],1);self.assertEqual(data['both'][0],2)
                    self.assertEqual(data['nativeFrames'][-1],2880);self.assertFalse(data['frames'][-1][1])
                for pack in index['packs']:
                    self.assertLess(pack['width']*pack['height']*4,bank.MAX_RGBA_BYTES)
                    self.assertLessEqual(max(pack['width'],pack['height']),2048)
                pack=dest/index['packs'][0]['file'];pack.write_bytes(pack.read_bytes()+b'corrupt-test-byte')
                with self.assertRaisesRegex(ValueError,'Durable bank file changed'):command('add',2)


if __name__=='__main__':unittest.main()
