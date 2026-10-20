import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pageRows,pageSystemCount,pageBarCount,pageBeatGrid} from '../src/page-layout.js';
test('compact system stack reserves bottom space and centres below the label',()=>{
 for(const height of [159,405,468,650]){
  const count=pageSystemCount(height,false,1.08),rows=pageRows(height,count,130,1.08);
  assert.ok(rows.offset>=Math.min(32,height*0.16));
  assert.ok(rows.offset+rows.rowHeight*count<=height-Math.min(16,height*0.08));
  assert.ok(rows.rowHeight<=130*1.08+8);
 }
});

test('Hanon pages make room for dense rhythms and larger notation',()=>{
 assert.equal(pageBarCount(390,4,.5,1.08),1);
 assert.equal(pageBarCount(768,4,.5,1.08),2);
 assert.equal(pageBarCount(1024,4,.5,1.08),3);
 assert.equal(pageBarCount(768,4,1,1.08),4);
 assert.equal(pageBarCount(768,4,.25,1.08),1);
 assert.ok(pageBarCount(1024,4,.5,1.62)<pageBarCount(1024,4,.5,1.08));
});

test('dense page notes stay inside bar lines without a clock jump',()=>{
 for(const bars of [1,2,3,4])for(const shortest of [.25,.5,1,4]){
  const left=120,right=940,beats=4;
  const {barWidth,xAt}=pageBeatGrid(left,right,bars,beats,shortest);
  for(let bar=0;bar<bars;bar++){
   const start=left+bar*barWidth,end=start+barWidth;
   assert.ok(xAt(bar*beats)>start);
   assert.ok(xAt((bar+1)*beats-shortest)<end);
   assert.ok(Math.abs((xAt(bar*beats)-start)-(end-xAt((bar+1)*beats-shortest)))<1e-9);
  }
  const step=xAt(1)-xAt(0);
  assert.ok(Math.abs(xAt(4.01)-xAt(3.99)-step*.02)<1e-9);
 }
});
