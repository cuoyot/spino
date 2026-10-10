import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { scorePDF } from './pdf-fixture.js';

test('PDF mark sizing, compact palette and editing preserve IDs and undo history', {timeout:30000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  let chunk;
  for(const name of (await readdir('dist/assets')).filter(n=>/^pdf-viewer-.*\.js$/.test(n)))if(/\bas openScore\b/.test(await readFile(`dist/assets/${name}`,'utf8')))chunk=name;
  const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${c}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Edit timeout'));}},20);})`);
  await send('Emulation.setDeviceMetricsOverride',{width:768,height:1024,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const marks=['highlight','line','arrow','ellipse','rectangle'].map((type,i)=>({id:`mark-${i}`,page:1,type,color:'#2878c8',width:.0035,points:[{x:.2,y:.15+i*.12},{x:.45,y:.2+i*.12}]}));
  const asset={id:'edit-fixture',type:'application/pdf',base64:scorePDF(),annotations:{version:1,marks}};
  await evaluate(`(async()=>{window.edited=${JSON.stringify(asset.annotations)};window.editViewer=await(await import('/assets/${chunk}')).openScore({asset:${JSON.stringify(asset)},save:async value=>{window.edited=value;}});})()`);
  await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  const choose=name=>evaluate(`document.querySelector('[data-tool="${name}"]').click()`);
  const drag=async (a,b,cancel=false)=>{
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:a.x,y:a.y,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:b.x,y:b.y,button:'left',buttons:1});
    if(cancel)await evaluate(`document.querySelector('.pdf-viewport').dispatchEvent(new PointerEvent('pointercancel',{pointerId:1,bubbles:true}))`);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:b.x,y:b.y,button:'left',clickCount:1});
  };
  for(let i=0;i<marks.length;i++){
    await choose('select');
    const r=await evaluate(`(()=>{const r=document.querySelector('[data-mark-id="mark-${i}"]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    await drag(r,{x:r.x+20,y:r.y+15});
    assert.equal(await evaluate(`document.querySelector('.pdf-quick-palette').hidden`),false);
    assert.equal(await evaluate(`document.querySelector('[data-mark-setting=fontSize]').closest('label').hidden`),true);
    assert.equal(await evaluate(`document.querySelector('[data-mark-setting=width]').closest('label').hidden`),false);
    await wait(`edited.marks[${i}].points[0].x>${marks[i].points[0].x}`);
    assert.equal(await evaluate(`edited.marks[${i}].id`),`mark-${i}`);
    const handle=await evaluate(`(()=>{const r=document.querySelector('[data-resize="1"]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    const before=await evaluate(`edited.marks[${i}].points[1].x`);
    await drag(handle,{x:handle.x+18,y:handle.y+10});
    await wait(`edited.marks[${i}].points[1].x>${before}`);
  }
  const edited=await evaluate('edited');
  await evaluate(`{const field=document.querySelector('[data-mark-setting=width]');field.value=.7;field.dispatchEvent(new Event('change',{bubbles:true}));}`);
  assert.ok(Math.abs(await evaluate('edited.marks[4].width')-.007)<1e-10);
  await evaluate(`document.querySelector('[data-pdf=undo]').click()`);
  assert.deepEqual(await evaluate('edited'),edited);
  await evaluate(`document.querySelector('[data-pdf=undo]').click()`);await wait(`JSON.stringify(edited)!==${JSON.stringify(JSON.stringify(edited))}`);
  await evaluate(`document.querySelector('[data-pdf=redo]').click()`);assert.deepEqual(await evaluate('edited'),edited);
  // Fingering uses its digit controls rather than data-tool.
  await evaluate(`document.querySelector('[data-finger="3"]').click()`);
  assert.equal(await evaluate(`document.querySelector('.pdf-panel').hidden`),true);
  assert.equal(await evaluate(`document.querySelector('.pdf-quick-palette').hidden`),false);
  assert.equal(await evaluate(`document.querySelector('.pdf-mark-settings').hidden`),false);
  assert.equal(await evaluate(`document.querySelector('[data-mark-setting=fontSize]').closest('label').hidden`),false);
  assert.equal(await evaluate(`document.querySelector('[data-pdf=tools]').hidden`),true);
  await evaluate(`document.querySelector('[data-color="#2878c8"]').click();document.querySelector('[data-finger="4"]').click();document.querySelector('[data-finger="3"]').click()`);
  assert.equal(await evaluate(`document.querySelector('.pdf-quick-palette').hidden`),false);
  const point=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return{x:r.left+r.width*.65,y:r.top+r.height*.3};})()`);
  await drag(point,point);await wait(`edited.marks.length===6`);
  await choose('select');
  const digitPoint=await evaluate(`(()=>{const r=document.querySelector('[data-mark-id="'+edited.marks[5].id+'"]').getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  await drag(digitPoint,digitPoint);
  assert.equal(await evaluate(`document.querySelector('[data-mark-setting=width]').closest('label').hidden`),true);
  assert.equal(await evaluate(`document.querySelector('[data-mark-setting=fontSize]').closest('label').hidden`),false);
  await evaluate(`{const field=document.querySelector('[data-mark-setting=fontSize]');field.value=5;field.dispatchEvent(new Event('change',{bubbles:true}));}`);
  assert.equal(await evaluate(`edited.marks[5].fontSize`),.05);
  await evaluate(`document.querySelector('[data-pdf=active-tool]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-pdf=tools]').hidden`),true);
  assert.equal(await evaluate(`document.querySelector('.pdf-hint')===null`),true);
  for (const type of ['pen','highlight','underline','line','arrow','ellipse','rectangle']) {
    await choose(type);
    assert.equal(await evaluate(`document.querySelector('[data-pdf=tools]').hidden`),true);
    assert.equal(await evaluate(`document.querySelector('[data-pdf=split-done]').hidden`),false);
    assert.equal(await evaluate(`document.querySelector('.pdf-quick-palette').hidden`),false);
    assert.equal(await evaluate(`document.querySelector('.pdf-palette').closest('[hidden]')===null`),true);
    assert.equal(await evaluate(`document.querySelector('[data-mark-setting=width]').closest('label').hidden`),false);
    assert.equal(await evaluate(`document.querySelector('[data-mark-setting=fontSize]').closest('label').hidden`),true);
  }
  await evaluate(`editViewer.close()`);await wait(`!document.querySelector('.pdf-viewer')`);
  await evaluate(`(async()=>{editViewer=await(await import('/assets/${chunk}')).openScore({asset:{...${JSON.stringify(asset)},annotations:edited},save:async value=>{window.edited=value;}});})()`);
  await wait(`document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false'`);
  assert.equal(await evaluate(`document.querySelectorAll('[data-mark-id]').length`),6);
  assert.equal(await evaluate(`document.querySelector('[data-mark-id="mark-4"]').dataset.markId`),'mark-4');
  await evaluate(`editViewer.close()`);
  assert.deepEqual(errors,[]);
});
