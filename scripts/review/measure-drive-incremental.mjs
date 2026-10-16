// Synthetic protocol body-byte measurements; excludes HTTP/TLS overhead and native authentication.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createIncrementalNotebookAdapter} from '../../src/companion/drive-incremental.js';
import {syntheticNotebookDrive} from '../../tests/fixtures/drive/notebook-server.js';
import {cloudRecoveryFixture} from './cloud-recovery-fixture.mjs';
const bytes=text=>new TextEncoder().encode(text||'').length;
async function measure(includeChecksum){
 const server=syntheticNotebookDrive();server.includeChecksum=includeChecksum;
 let state={};const cache=new Map(),options={native:server.native(),settings:{read:()=>state,save:v=>{state=structuredClone(v);}},journal:{get:async k=>structuredClone(cache.get(k)),set:async(k,v)=>cache.set(k,structuredClone(v))},recovery:{saveRecovery:async()=>{}}};
 let adapter=createIncrementalNotebookAdapter(options);
 const notebook=cloudRecoveryFixture('en');notebook.assets[0].base64=Buffer.concat([Buffer.from(notebook.assets[0].base64,'base64'),Buffer.from('\n%'+ 'padding'.repeat(300000))]).toString('base64');
 async function phase(run){const n=server.requests.length,b=server.responseBytes;await run();const requests=server.requests.slice(n);return {requests:requests.length,uploads:requests.filter(r=>r.method==='POST'&&r.path.includes('multipart')).length,uploadBodyBytes:requests.reduce((sum,r)=>sum+bytes(r.text),0),responseBodyBytes:server.responseBytes-b,mediaDownloads:requests.filter(r=>r.path.includes('alt=media')).length};}
 const initial=await phase(()=>adapter.create({text:JSON.stringify(notebook)}));await adapter.readLinked();
 const quiet=await phase(async()=>{for(let n=0;n<10;n++)await adapter.readLinked();});assert.equal(quiet.requests,10);assert.equal(quiet.uploadBodyBytes,0);assert.equal(quiet.mediaDownloads,0);
 const restart=await phase(async()=>{adapter=createIncrementalNotebookAdapter(options);await adapter.readLinked();});assert.equal(restart.mediaDownloads,0);
 const before=await adapter.readLinked(),next=JSON.parse(before.text);next.data.works[0].notes='A small saved note';
 const note=await phase(()=>adapter.write({text:JSON.stringify(next),expectedHash:before.hash}));assert.equal(note.uploads,2);assert.ok(note.uploadBodyBytes<10000);
 const saved=await adapter.readLinked(),retry=await phase(()=>adapter.write({text:saved.text,expectedHash:saved.hash}));assert.equal(retry.uploads,0);
 return {serverSHA256:includeChecksum,portableJSONBytes:bytes(JSON.stringify(notebook)),scoreBytes:Buffer.from(notebook.assets[0].base64,'base64').length,initial,quietTenPolls:quiet,restartWithCache:restart,smallNote:note,unchangedWriteRetry:retry};
}
const result={date:new Date().toISOString(),kind:'synthetic-drive-protocol-body-bytes',excludes:['HTTP headers','TLS','Google authentication','independent recording-copy protocol'],runs:await Promise.all([measure(true),measure(false)])};
const text=JSON.stringify(result,null,2)+'\n';if(process.argv[2])await writeFile(process.argv[2],text);else process.stdout.write(text);
