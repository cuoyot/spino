import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {openBrowser} from './browser.js';

test('processed files survive reopen, follow take revisions, and clean up without changing originals',{timeout:30000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});await send('Page.navigate',{url});
 const source=await readFile('src/companion/media-store.js','utf8');
 const result=await evaluate(`(async()=>{
  const {openMediaStore}=await import(URL.createObjectURL(new Blob([${JSON.stringify(source)}],{type:'text/javascript'})));
  let store=await openMediaStore('synthetic-prepared-store');
  const original={id:'video',workId:'work',kind:'video',title:'First title',workTitle:'Piece title',createdAt:'2026-11-10',durationMs:3000,blob:new Blob(['original-video'],{type:'video/webm'})};
  await store.put(original);await store.putPrepared(original,{blob:new Blob(['prepared-video'],{type:'video/mp4'}),durationMs:8000});
  const first=await store.getPrepared(original);store.close();store=await openMediaStore('synthetic-prepared-store');
  const reopened=await store.getPrepared(original);if(first.fileId!==reopened.fileId)throw Error('Processed file was regenerated');
  const renamed={...original,title:'New display title',workTitle:'Renamed piece',createdAt:'2026-12-10',durationMs:3001};await store.put(renamed);
  const metadataOnly=await store.getPrepared(renamed);if(metadataOnly?.fileId!==first.fileId)throw Error('Display metadata invalidated video');
  const originalRow=await store.get('video');
  const trimmed={...renamed,mediaTakeId:'trim-revision',blob:new Blob(['trimmed-video'],{type:'video/mp4'})};await store.replaceTrim(trimmed,'video');
  const stale=await store.getPrepared(trimmed);let staleWriteRejected=false;try{await store.putPrepared(original,first)}catch{staleWriteRejected=true;}
  await store.putPrepared(trimmed,{blob:new Blob(['prepared-trim'],{type:'video/mp4'}),durationMs:8000});
  const trimmedFile=await store.getPrepared(trimmed);await store.remove('video');const deleted=await store.getPrepared(trimmed);
  await store.put(original);await store.putPrepared(original,first);await store.attachCloud('video',{fileId:'cloud',pending:false});await store.releaseLocal('video');
  const released=await store.getPrepared(original);
  await store.clear();store.close();
  return {sameFile:first.fileId===reopened.fileId,metadataSame:first.fileId===metadataOnly.fileId,original:await originalRow.blob.text(),stale,staleWriteRejected,newTrim:trimmedFile.fileId!==first.fileId,deleted,released};
 })()`);
 assert.deepEqual(result,{sameFile:true,metadataSame:true,original:'original-video',stale:null,staleWriteRejected:true,newTrim:true,deleted:null,released:null});assert.deepEqual(errors,[]);
});

test('failed processed-file writes keep the saved original and never advertise a ready copy',{timeout:30000},async t=>{
 const {send,evaluate,url}=await openBrowser(t,{companion:true});await send('Page.navigate',{url});
 const source=await readFile('src/companion/media-store.js','utf8');
 const result=await evaluate(`(async()=>{
 const {openMediaStore}=await import(URL.createObjectURL(new Blob([${JSON.stringify(source)}],{type:'text/javascript'})));const store=await openMediaStore('synthetic-prepared-quota');
 const record={id:'video',workId:'work',kind:'video',blob:new Blob(['original'],{type:'video/webm'}),durationMs:3000};await store.put(record);
 const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='exports')throw new DOMException('Synthetic quota','QuotaExceededError');return put.call(this,value,...args)};
 let failed=false;try{await store.putPrepared(record,{blob:new Blob(['prepared'],{type:'video/mp4'}),durationMs:8000})}catch{failed=true}finally{IDBObjectStore.prototype.put=put;}
 const original=await store.get(record.id),prepared=await store.getPrepared(record);store.close();return {failed,original:await original.blob.text(),prepared};})()`);
 assert.deepEqual(result,{failed:true,original:'original',prepared:null});
});
