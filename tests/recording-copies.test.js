import test from 'node:test';import assert from 'node:assert/strict';
import {createDriveMedia,mediaHash} from '../src/companion/drive-media.js';
import {createDriveStorage} from '../src/companion/drive-storage.js';
import {syntheticDrive} from '../src/companion/drive-media-fixture.js';
import {emptyData} from '../src/companion/model.js';
import {inspectCompleteBackup} from '../src/companion/complete-backup.js';
async function fixture(){
 const accountId='owner',notebookId='book',server=syntheticDrive(),state=new Map();
 const client=createDriveMedia({request:server.request,state:{get:async k=>state.get(k),set:async(k,v)=>state.set(k,v)},accountId,notebookId});
 const record={id:'original',workId:'',title:'My piano recording',kind:'audio',createdAt:'2026-10-25T08:00:00Z',durationMs:1000,blob:new Blob(['original bytes'],{type:'audio/webm'})};
 const uploaded=await client.upload({...record,takeId:record.id});server.files.get(uploaded.id).mimeType='application/octet-stream';delete server.files.get(uploaded.id).appProperties.spinoMimeType;
 const book={format:'cuaderno-piano',version:1,data:emptyData(),assets:[],legacy:{}};
 const args={drive:{storageLink:()=>({id:'root',folderId:'objects',notebookId,accountId})},mediaClient:async()=>client,mediaStore:{index:async()=>{const {blob,...meta}=record;return [meta];},get:async()=>record},snapshot:async()=>JSON.stringify(book)};
 return {server,client,record,args,file:server.files.get(uploaded.id)};
}
test('a complete ZIP repairs a wrong Drive format only after verifying the original and restores exact bytes',async()=>{
 const f=await fixture(),before=await mediaHash(f.file.blob),id=f.file.id;
 const result=await createDriveStorage(f.args).complete(),copy=await inspectCompleteBackup(result.blob);
 assert.equal(copy.records.length,1);assert.equal(await copy.records[0].blob.text(),'original bytes');assert.equal(f.file.id,id);assert.equal(f.file.mimeType,'application/octet-stream');assert.equal(f.file.appProperties.spinoMimeType,'audio/webm');assert.equal(await mediaHash(f.file.blob),before);assert.equal(f.server.files.size,1);
});
test('a mismatched local original cannot relabel remote data or produce a misleading complete ZIP',async()=>{
 const f=await fixture();f.record.blob=new Blob(['different data'],{type:'audio/webm'});
 await assert.rejects(createDriveStorage(f.args).complete(),e=>e.recordingTitle==='My piano recording'&&/identity conflict/.test(e.recordingError));
 assert.equal(f.file.mimeType,'application/octet-stream');assert.equal(await f.file.blob.text(),'original bytes');
});
test('without the original a bad label blocks the complete ZIP with the recording name, without writes',async()=>{
 const f=await fixture();f.args.mediaStore.index=async()=>[];
 await assert.rejects(createDriveStorage(f.args).complete(),e=>e.recordingTitle==='My piano recording'&&/format is not supported/.test(e.recordingError));assert.equal(f.file.mimeType,'application/octet-stream');assert.equal(f.server.files.size,1);
});
