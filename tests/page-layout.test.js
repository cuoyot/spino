import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pageRows,pageSystemCount} from '../src/page-layout.js';
test('compact system stack reserves bottom space and centres below the label',()=>{
 for(const height of [159,405,468,650]){
  const count=pageSystemCount(height,false,1.08),rows=pageRows(height,count,130,1.08);
  assert.ok(rows.offset>=Math.min(32,height*0.16));
  assert.ok(rows.offset+rows.rowHeight*count<=height-Math.min(16,height*0.08));
  assert.ok(rows.rowHeight<=130*1.08+8);
 }
});
