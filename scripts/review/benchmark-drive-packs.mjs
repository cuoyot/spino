// Synthetic protocol benchmark. No network account or personal notebook is accessed.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createIncrementalNotebookAdapter} from '../../src/companion/drive-incremental.js';
import {createIncrementalNotebookAdapter as stableAdapter} from '../../tests/fixtures/drive/stable-615-adapter.js';
import {syntheticNotebookDrive} from '../../tests/fixtures/drive/notebook-server.js';
import {cloudRecoveryFixture} from './cloud-recovery-fixture.mjs';
import {stableJSON} from '../../src/companion/cloud-merge.js';
import {backupHash} from '../../src/companion/cloud-backup.js';

const latency=Number(process.env.SPINO_BENCHMARK_LATENCY_MS||2),output=process.argv[2];
assert.ok(output,'Pass the benchmark output JSON path');
function device(server,adapter=createIncrementalNotebookAdapter,delay=0){
  let settings={};const entries=new Map(),native=server.native(),request=native.request;
  native.request=async options=>{if(delay)await new Promise(r=>setTimeout(r,delay));return request(options);};
  return adapter({native,fastReads:true,recovery:{saveRecovery:async()=>{}},settings:{read:()=>settings,save:value=>{settings=structuredClone(value);}},journal:{get:async key=>structuredClone(entries.get(key)),set:async(key,value)=>entries.set(key,structuredClone(value))}});
}
async function extend(server,writer,count){
  const initial=await writer.readLinked(),snapshot=JSON.parse(initial.text),rootFile=[...server.files.values()].find(f=>f.appProperties?.spinoType==='spino-notebook-v2'),root=JSON.parse(rootFile.text);
  const key='data/works/'+snapshot.data.works[0].id;let head=initial.heads[0],previous=initial.versions[key][0];
  const put=async(value,id,commit=false)=>{const text=stableJSON(value),hash=await backupHash(text),file={id,owner:'synthetic-owner',name:(commit?'Change ':'Object ')+hash.slice(0,16),mimeType:'application/json',text,revision:1,appProperties:{spinoType:commit?'spino-commit-v2':'spino-object-v2',rootId:root.rootId,notebookId:root.notebookId,hash}};server.files.set(id,file);server.checksums.set(id,hash);server.touch(file);return hash;};
  for(let n=0;n<count;n++){
    const part=await put({kind:'record-changes',changes:[{key,previous:[previous],value:{...snapshot.data.works[0],notes:'Synthetic benchmark note '+n}}]},'benchmark-part-'+n);
    head=await put({format:'spino-notebook-v2',rootId:root.rootId,notebookId:root.notebookId,parents:[head],parts:[part]},'benchmark-commit-'+n,true);previous=head;
  }
  return rootFile.id;
}
async function measure(server,rootId,Adapter){
  const adapter=device(server,Adapter,latency),start=server.requests.length,bytes=server.responseBytes,time=performance.now();adapter.choose(rootId);
  const result=await adapter.pickBackup(),elapsedMs=Math.round(performance.now()-time),requests=server.requests.slice(start);
  assert.ok(JSON.parse(result.text).data.works[0].notes.startsWith('Synthetic benchmark note'));
  const metrics={requests:requests.length,contentReads:requests.filter(r=>r.path.includes('alt=media')).length,responseBytes:server.responseBytes-bytes,requestBodyBytes:requests.reduce((sum,r)=>sum+Buffer.byteLength(r.text||''),0),elapsedMs,processRSS:process.memoryUsage().rss};
  const warmStart=server.requests.length,warmBytes=server.responseBytes;await adapter.readLinked();
  metrics.unchangedPoll={requests:server.requests.length-warmStart,responseBytes:server.responseBytes-warmBytes};
  return metrics;
}
const results=[];
for(const edits of [100,1000,10000]){
  const server=syntheticNotebookDrive(),writer=device(server);await writer.create({text:JSON.stringify(cloudRecoveryFixture('en'))});
  const rootId=await extend(server,writer,edits);await writer.readLinked();const prepared=await writer.prepareCheckpoint();assert.equal(prepared.created,true);
  const stable=await measure(server,rootId,stableAdapter),beta=await measure(server,rootId,createIncrementalNotebookAdapter);
  const row={edits,prepared,stable,beta,requestReductionPercent:Math.round(100*(1-beta.requests/stable.requests)),responseReductionPercent:Math.round(100*(1-beta.responseBytes/stable.responseBytes))};results.push(row);console.log(JSON.stringify(row));
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({date:'2026-10-25',kind:'Synthetic protocol benchmark; not physical Google/device timing',injectedRequestLatencyMs:latency,baseline:'Frozen stable 6.1.5 adapter, commit 50b0e37',scenario:'Distinct versions of one work record, original PDF/annotations retained, separate empty caches; unchanged polling measured separately',results},null,2));
}
