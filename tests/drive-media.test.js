import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDriveMedia,driveURL,DRIVE_CHUNK} from '../src/companion/drive-media.js';
import {syntheticDrive} from '../src/companion/drive-media-fixture.js';
const book='synthetic-notebook',account='synthetic-owner';
const take={takeId:'take-1',workId:'work-1',title:'Original musical title',blob:new Blob([new Uint8Array(DRIVE_CHUNK+123).map((_,i)=>i%251)],{type:'audio/webm'})};
function device(server,{accountId=account,notebookId=book,state=new Map(),request=server.request}={}){
  return {state,client:createDriveMedia({request,state:{get:async k=>structuredClone(state.get(k)),set:async(k,v)=>state.set(k,structuredClone(v))},accountId,notebookId})};
}
test('two devices upload, discover and verify the same bytes without sharing device identity',async()=>{
  const server=syntheticDrive(),a=device(server),b=device(server);const uploaded=await a.client.upload(take);
  assert.equal((await b.client.list())[0].id,uploaded.id);
  const {blob}=await b.client.download(uploaded.id);assert.deepEqual(new Uint8Array(await blob.arrayBuffer()),new Uint8Array(await take.blob.arrayBuffer()));
  assert.equal((await a.client.upload(take)).id,uploaded.id);assert.equal(server.files.size,1);
});
test('accepted upload chunk survives interruption and client recreation without duplication',async()=>{
  const server=syntheticDrive(),state=new Map(),a=device(server,{state});server.interruptNextChunk();
  await assert.rejects(a.client.upload(take),/interrupted/);assert.equal([...server.sessions.values()][0].size,DRIVE_CHUNK);
  const progress=[];const b=device(server,{state});await b.client.upload({...take,onProgress:n=>progress.push(n)});
  assert.equal(progress[0],DRIVE_CHUNK);assert.equal(server.files.size,1);
});
test('lost final response is recovered using the preallocated immutable file ID',async()=>{
  const server=syntheticDrive(),a=device(server);server.interruptNextChunk();const small={...take,blob:take.blob.slice(0,32,'audio/webm')};
  await assert.rejects(a.client.upload(small),/interrupted/);assert.equal(server.files.size,1);
  await a.client.upload(small);assert.equal(server.files.size,1);assert.equal(server.sessions.size,1);
});
test('account and notebook namespaces prevent discovery and state reuse across boundaries',async()=>{
  const server=syntheticDrive(),a=device(server),uploaded=await a.client.upload(take);
  const foreignAccount=device(server,{accountId:'another-user',state:a.state});assert.deepEqual(await foreignAccount.client.list(),[]);await assert.rejects(foreignAccount.client.download(uploaded.id),/404/);
  const foreignBook=device(server,{notebookId:'another-book',state:a.state});assert.deepEqual(await foreignBook.client.list(),[]);await assert.rejects(foreignBook.client.download(uploaded.id),/notebook identity/);
});
test('changing bytes for an existing take cannot overwrite its original recording',async()=>{
  const server=syntheticDrive(),a=device(server);await a.client.upload(take);
  await assert.rejects(a.client.upload({...take,blob:new Blob(['different'],{type:'audio/webm'})}),/different recording bytes/);assert.equal(server.files.size,1);
});
test('corrupt downloaded bytes are rejected before playback',async()=>{
  const server=syntheticDrive(),a=device(server);const uploaded=await a.client.upload(take);
  const b=device(server,{request:async options=>{const r=await server.request(options);if(r.body)r.body[0]^=1;return r;}});
  await assert.rejects(b.client.download(uploaded.id),/checksum differs/);
});
test('server metadata cannot redirect a recording into another notebook',async()=>{
  const server=syntheticDrive(),a=device(server),uploaded=await a.client.upload(take);server.files.get(uploaded.id).appProperties.notebookId='wrong-book';
  await assert.rejects(a.client.download(uploaded.id),/notebook identity/);
});
test('untrusted upload URLs cannot send native authorization to another host',()=>{
  for(const value of ['http://www.googleapis.com/drive/v3/files','https://evil.example/drive/v3/files','https://www.googleapis.com.evil.example/drive/v3/files','https://user@www.googleapis.com/drive/v3/files','https://www.googleapis.com/oauth2/v1/userinfo'])assert.throws(()=>driveURL(value));
});
test('authorization failure stops transfer while preserving progress',async()=>{
  const server=syntheticDrive(),a=device(server);server.interruptNextChunk();await assert.rejects(a.client.upload(take));
  const before=structuredClone(a.state),b=device(server,{state:a.state,request:async()=>({status:401})});await assert.rejects(b.client.upload(take),/Reconnect/);assert.deepEqual(a.state,before);
});
test('aborted and invalid recordings perform no network writes',async()=>{
  const server=syntheticDrive(),a=device(server),controller=new AbortController();controller.abort();await assert.rejects(a.client.upload({...take,signal:controller.signal}),/paused/);
  await assert.rejects(a.client.upload({...take,blob:new Blob(['wrong'],{type:'text/plain'})}),/Invalid/);assert.equal(server.sessions.size,0);assert.equal(server.files.size,0);
});
