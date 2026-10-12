import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeDeviceLink,parseDeviceLink,deviceLinkMarkup,deviceLinkConfirmMarkup,deviceLinkQRMarkup} from '../src/companion/device-link.js';
const link={id:'6ce8d640-d2e3-4fcb-8fa3-885d36b2cc52',name:'SPino á & notebook.json'};
test('notebook QR round trips Unicode and rejects unrelated, malformed and oversized input',()=>{
 const code=encodeDeviceLink(link);assert.deepEqual(parseDeviceLink(code),link);assert.deepEqual(parseDeviceLink(' '+code+' '),link);
 for(const input of ['https://example.com','SPINO-NOTEBOOK:1:%bad','SPINO-NOTEBOOK:1:'+encodeURIComponent(JSON.stringify({id:'invalid',name:'book'})),'x'.repeat(4001)])assert.throws(()=>parseDeviceLink(input));
 assert.ok(!code.includes('password'));
});
test('linking UI escapes notebook names and always offers a code fallback',async()=>{
 const html=deviceLinkMarkup({mode:'sync',name:'book.json'},{lang:'en'});assert.match(html,/device-link-show/);assert.match(html,/device-link-manual/);
 assert.ok(!deviceLinkConfirmMarkup({...link,name:'<script>x</script>'},'en').includes('<script>'));
 const qr=await deviceLinkQRMarkup(link,'en');assert.match(qr,/data:image\/png;base64/);assert.match(qr,/SPINO-NOTEBOOK:1:/);assert.match(qr,/device-link-copy/);
});
