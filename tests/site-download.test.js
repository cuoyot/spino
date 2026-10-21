import test from 'node:test';import assert from 'node:assert/strict';
import {downloadResponse} from '../scripts/site/download-worker.mjs';
import media from '../scripts/site/media-parts.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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

test('the published Hanon video plays inline with byte ranges matching its exact reviewed media',async()=>{
 const [path,entry]=Object.entries(media)[0],video=readFileSync('site'+path);
 assert.equal(video.byteLength,entry.bytes);
 assert.equal(createHash('sha256').update(video).digest('hex'),entry.sha256);
 const videoAssets={fetch:async request=>new Response(new URL(request.url).pathname===path?video:'missing')};
 const respond=headers=>downloadResponse(new Request('https://example.com'+path,{headers}),videoAssets);
 for(const [range,start,end] of [['bytes=0-1',0,1],['bytes=1048576-1048639',1048576,1048639],['bytes=-128',video.byteLength-128,video.byteLength-1]]){
  const r=await respond({Range:range});assert.equal(r.status,206);
  assert.equal(r.headers.get('content-type'),'video/mp4');assert.match(r.headers.get('content-disposition'),/^inline;/);
  assert.equal(r.headers.get('accept-ranges'),'bytes');assert.equal(r.headers.get('content-range'),`bytes ${start}-${end}/${video.byteLength}`);
  assert.deepEqual(new Uint8Array(await r.arrayBuffer()),new Uint8Array(video.subarray(start,end+1)));
 }
 const head=await downloadResponse(new Request('https://example.com'+path,{method:'HEAD'}),videoAssets);
 assert.equal(head.headers.get('content-length'),String(video.byteLength));assert.equal(await head.text(),'');
 const unchanged=await respond({'If-None-Match':'"'+entry.sha256+'"'});assert.equal(unchanged.status,304);
});

test('the 498 MB beta streams every complete part through native pipes without JavaScript readers',async()=>{
 const bytes=498335277,partSize=20*1024*1024,chunkSize=64*1024;
 const parts=Array.from({length:Math.ceil(bytes/partSize)},(_,i)=>({path:'/large-'+i,bytes:Math.min(partSize,bytes-i*partSize)}));
 const expected=createHash('sha256');
 for(const [i,part] of parts.entries())for(let offset=0;offset<part.bytes;offset+=chunkSize)expected.update(new Uint8Array(Math.min(chunkSize,part.bytes-offset)).fill(i));
 let nativePipes=0;
 const largeAssets={fetch:async request=>{
  const i=Number(new URL(request.url).pathname.slice('/large-'.length)),part=parts[i];let offset=0;
  const stream=new ReadableStream({pull(controller){if(offset===part.bytes){controller.close();return}const size=Math.min(chunkSize,part.bytes-offset);controller.enqueue(new Uint8Array(size).fill(i));offset+=size}});
  const nativePipe=stream.pipeTo.bind(stream);stream.pipeTo=(...args)=>{nativePipes++;return nativePipe(...args)};
  stream.getReader=()=>{throw Error('Complete static parts must use native pipeTo')};
  return {ok:true,body:stream};
 }};
 const r=await downloadResponse(new Request('https://example.com/large.apk'),largeAssets,{'/large.apk':{bytes,sha256:'large',parts}});
 const actual=createHash('sha256');let received=0;
 for await(const chunk of r.body){actual.update(chunk);received+=chunk.byteLength}
 assert.equal(received,bytes);assert.equal(nativePipes,24);assert.equal(actual.digest('hex'),expected.digest('hex'));
});
