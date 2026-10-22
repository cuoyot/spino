import test from 'node:test';
import assert from 'node:assert/strict';
import {bookendLabels,fadeOpacity,exportRecording} from '../src/companion/media-bookends.js';
test('export uses the piece title and recording date, with bounded fades for short clips',()=>{
 assert.deepEqual(bookendLabels({workTitle:'Bach',title:'Take 2',createdAt:'2026-10-22T12:00:00Z'},'en-US'),{title:'Bach',date:'October 22, 2026'});
 assert.equal(bookendLabels({title:'Free take',createdAt:'invalid'},'en-US').title,'Free take');
 assert.equal(bookendLabels({createdAt:'invalid'},'en-US').date,'');
 assert.deepEqual([0,150,300,700,850,1000].map(t=>fadeOpacity(t,1000)),[0,.5,1,1,.5,0]);
 assert.ok(fadeOpacity(100,200)>0);assert.equal(fadeOpacity(-1,200),0);
});
test('audio-only sharing preserves the original format and content',async()=>{
 const record={kind:'audio',blob:new Blob(['audio'],{type:'audio/webm'})};assert.equal(await exportRecording(record),record);
});
