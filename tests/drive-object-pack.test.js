import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync,strToU8} from 'fflate';
import {buildObjectPacks,unpackObjectPack,validatePackIndex,PACK_KIND,INDEX_KIND,PACK_LIMIT} from '../src/companion/drive-object-pack.js';
import {backupHash} from '../src/companion/cloud-backup.js';
import {stableJSON} from '../src/companion/cloud-merge.js';

const scope={rootId:'synthetic-root',notebookId:'713f8775-9831-4e98-957e-d53ad5ff8807'};
async function entry(value,n=1){const text=stableJSON(value);return [await backupHash(text),{id:'synthetic-file-'+n,version:'1',size:strToU8(text).length,value}];}
test('bounded packs cover histories larger than the old single-checkpoint limit',async()=>{
 const records=new Map();for(let n=0;n<180;n++)records.set(...await entry({kind:'large-record-part',value:'x'.repeat(100000)+n},n));
 const packs=buildObjectPacks(records,scope);assert.ok(packs.length>8);
 const recovered=new Map();for(const pack of packs){assert.ok(strToU8(stableJSON(pack.value)).length<1048576);for(const [hash,record] of await unpackObjectPack(pack.value,scope))recovered.set(hash,record);}
 assert.deepEqual(recovered,records);
});
test('pack validation rejects changed objects, foreign scope and compressed expansion bombs',async()=>{
 const original=await entry({kind:'record-changes',changes:[]});
 const pack=buildObjectPacks(new Map([original]),scope)[0].value;
 await assert.rejects(unpackObjectPack(pack,{...scope,rootId:'another-root'}),{code:'INTEGRITY'});
 const changed=structuredClone(original);changed[1].value.changes=[{}];changed[1].size=strToU8(stableJSON(changed[1].value)).length;
 await assert.rejects(unpackObjectPack(buildObjectPacks(new Map([changed]),scope)[0].value,scope),{code:'INTEGRITY'});
 const compressed=gzipSync(strToU8('x'.repeat(PACK_LIMIT+1)));
 await assert.rejects(unpackObjectPack({...pack,value:Buffer.from(compressed).toString('base64')},scope),{code:'LIMIT'});
 await assert.rejects(unpackObjectPack({...pack,value:'not gzip'},scope),{code:'INTEGRITY'});
 const score=buildObjectPacks(new Map([await entry({kind:'score-bytes',value:'PDF'})]),scope)[0].value;
 await assert.rejects(unpackObjectPack(score,scope),{code:'INTEGRITY'});
});
test('pack indexes reject duplicate segments, mismatched counts and unknown contexts',()=>{
 const index={kind:INDEX_KIND,...scope,commitCount:2,objectCount:3,segments:[{hash:'a'.repeat(64),count:3}]};
 assert.equal(validatePackIndex(index,scope),index);
 for(const value of [{...index,segments:[...index.segments,...index.segments],objectCount:6},{...index,objectCount:4},{...index,rootId:'another-root'},{...index,kind:PACK_KIND}])assert.throws(()=>validatePackIndex(value,scope),{code:'INTEGRITY'});
});
