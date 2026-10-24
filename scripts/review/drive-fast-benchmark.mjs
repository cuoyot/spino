// Synthetic benchmark: bytes count JSON response bodies, not TLS/HTTP overhead.
import {createIncrementalNotebookAdapter} from '../../src/companion/drive-incremental.js';
import {syntheticNotebookDrive} from '../../tests/fixtures/drive/notebook-server.js';
import {cloudRecoveryFixture} from './cloud-recovery-fixture.mjs';
import {writeFile} from 'node:fs/promises';
const server=syntheticNotebookDrive();
function device(fastReads=false){let state={},received=0,gets=0;const journal=new Map(),native=server.native('synthetic-owner'),original=native.request;native.request=async request=>{const result=await original(request);received+=new TextEncoder().encode(result.text||'').length;if(request.path.includes('alt=media'))gets++;return result;};return {adapter:createIncrementalNotebookAdapter({fastReads,native,settings:{read:()=>state,save:v=>state=v},journal:{get:async k=>journal.get(k),set:async(k,v)=>journal.set(k,v)},recovery:{saveRecovery:async()=>{}}}),metrics:()=>({responseBodyBytes:received,contentGETs:gets})};}
const writer=device(),original=cloudRecoveryFixture('en');original.assets[0].base64=Buffer.concat([Buffer.from(original.assets[0].base64,'base64'),Buffer.alloc(2*1024*1024,32)]).toString('base64');await writer.adapter.create({text:JSON.stringify(original)});
for(let n=0;n<88;n++){const before=await writer.adapter.readLinked(),value=JSON.parse(before.text);value.data.works[0].notes='Saved edit '+n;await writer.adapter.write({text:JSON.stringify(value),expectedHash:before.hash});}
const root=[...server.files.values()].find(f=>f.appProperties?.spinoType==='spino-notebook-v2').id;
const old=device();old.adapter.choose(root);await old.adapter.pickBackup({});
await writer.adapter.prepareCheckpoint();const next=device(true);next.adapter.choose(root);const value=JSON.parse((await next.adapter.pickBackup({})).text);
if(value.assets[0].base64!==undefined||value.data.works[0].notes!=='Saved edit 87')throw Error('History-first benchmark failed');
const result={synthetic:true,commits:89,old:old.metrics(),fast:next.metrics(),deferredScores:value.assets.length,notes:'No real Drive account used. Payload bytes, excluding protocol/authentication overhead; no real-network latency measurement.'};console.log(JSON.stringify(result,null,2));if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
