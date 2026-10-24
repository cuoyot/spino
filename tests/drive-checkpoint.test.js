import test from 'node:test';import assert from 'node:assert/strict';
import {packCheckpoint,unpackCheckpoint} from '../src/companion/drive-checkpoint.js';
import {backupHash} from '../src/companion/cloud-backup.js';import {stableJSON} from '../src/companion/cloud-merge.js';
test('checkpoint round trip preserves immutable identities and rejects altered content',async()=>{const value={kind:'record-changes',changes:[]},hash=await backupHash(stableJSON(value)),packed=packCheckpoint(new Map([[hash,value]]));assert.deepEqual(await unpackCheckpoint(packed),new Map([[hash,value]]));await assert.rejects(unpackCheckpoint(packCheckpoint(new Map([[hash,{...value,changes:[{}]}]]))),{code:'INTEGRITY'});});
test('checkpoint never embeds score bytes',async()=>{const v={kind:'score-bytes',value:'PDF'},h=await backupHash(stableJSON(v));await assert.rejects(unpackCheckpoint(packCheckpoint(new Map([[h,v]]))),{code:'INTEGRITY'});});

test('malformed compressed checkpoint is an integrity failure that permits legacy graph fallback',async()=>{await assert.rejects(unpackCheckpoint({kind:'notebook-checkpoint-v1',value:'not gzip'}),{code:'INTEGRITY'});});
