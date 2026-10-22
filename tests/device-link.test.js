import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeDeviceLink,parseDeviceLink,deviceLinkMarkup,deviceLinkConfirmMarkup,deviceLinkQRMarkup} from '../src/companion/device-link.js';
const link={id:'6ce8d640-d2e3-4fcb-8fa3-885d36b2cc52',name:'SPino á & notebook.json'};
test('notebook QR round trips Unicode and rejects unrelated, malformed and oversized input',()=>{
 const code=encodeDeviceLink(link);assert.deepEqual(parseDeviceLink(code),link);assert.deepEqual(parseDeviceLink(' '+code+' '),link);
 for(const input of ['https://example.com','SPINO-NOTEBOOK:1:%bad','SPINO-NOTEBOOK:1:'+encodeURIComponent(JSON.stringify({id:'invalid',name:'book'})),'x'.repeat(4001)])assert.throws(()=>parseDeviceLink(input));
 assert.ok(!code.includes('password'));
});
test('linking separates joining from sharing and escapes notebook names',async()=>{
 const html=deviceLinkMarkup({}, {lang:'en'});assert.match(html,/device-link-scan/);assert.match(html,/cloud-join-shared/);assert.doesNotMatch(html,/device-link-show|device-link-manual|cloud-setup/);
 const connected=deviceLinkMarkup({mode:'sync',name:'book.json'},{lang:'en'});assert.doesNotMatch(connected,/device-link-show|cloud-join-shared|device-link-scan/);assert.match(connected,/Disconnect the current notebook/);
 assert.ok(!deviceLinkConfirmMarkup({...link,name:'<script>x</script>'},'en').includes('<script>'));
 const qr=await deviceLinkQRMarkup(link,'en');assert.match(qr,/data:image\/png;base64/);assert.match(qr,/SPINO-NOTEBOOK:1:/);assert.match(qr,/device-link-copy/);
});

test('Drive QR retains the exact file while accepting earlier notebook-only codes',()=>{
 const exact={...link,fileId:'drive-file_A-123'};
 assert.deepEqual(parseDeviceLink(encodeDeviceLink(exact)),exact);
 assert.throws(()=>encodeDeviceLink({...link,fileId:'../wrong'}));
});
