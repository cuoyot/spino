import test from 'node:test';import assert from 'node:assert/strict';
import {downloadResponse} from '../scripts/site/download-worker.mjs';
const file='/downloads/spino-test.apk',payload=new TextEncoder().encode('0123456789abcdef');
const manifest={[file]:{bytes:payload.length,sha256:'original-sha',parts:[{path:'/part-a',bytes:5},{path:'/part-b',bytes:7},{path:'/part-c',bytes:4}]}};
const parts={'/part-a':payload.slice(0,5),'/part-b':payload.slice(5,12),'/part-c':payload.slice(12)};
const assets={fetch:async request=>new Response(parts[new URL(request.url).pathname]||'static',{status:parts[new URL(request.url).pathname]?200:404})};
const response=(headers={},method='GET')=>downloadResponse(new Request('https://example.com'+file,{headers,method}),assets,manifest);
test('large downloads stream the exact artifact and resume across static-part boundaries',async()=>{
 const full=await response();assert.equal(full.status,200);assert.equal(full.headers.get('content-length'),'16');assert.equal(await full.text(),'0123456789abcdef');
 for(const [range,expected]of [['bytes=3-13','3456789abcd'],['bytes=12-','cdef'],['bytes=-5','bcdef'],['bytes=0-0','0']]){
  const r=await response({Range:range});assert.equal(r.status,206);assert.equal(r.headers.get('content-length'),String(expected.length));assert.equal(await r.text(),expected);
 }
 const head=await response({},'HEAD');assert.equal(await head.text(),'');assert.equal(head.headers.get('content-length'),'16');
 const unchanged=await response({'If-None-Match':'"original-sha"'});assert.equal(unchanged.status,304);
 const modified=await response({Range:'bytes=3-13','If-Range':'"older"'});assert.equal(modified.status,200);assert.equal(await modified.text(),'0123456789abcdef');
 for(const range of ['bytes=20-','bytes=8-2','bytes=-0','bytes=1-2,4-5'])assert.equal((await response({Range:range})).status,416);
 assert.equal((await response({},'POST')).status,405);
 const other=await downloadResponse(new Request('https://example.com/other'),assets,manifest);assert.equal(other.status,404);assert.equal(await other.text(),'static');
});
