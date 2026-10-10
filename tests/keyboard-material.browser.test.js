import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';

test('case cheeks appear only at physical A0 and C8, not cropped viewport edges', async t => {
  const {send,evaluate,url,errors}=await openBrowser(t);
  await send('Page.navigate',{url});
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('#piano [data-midi]')){clearInterval(timer);resolve();}},20);})`);
  for(const end of ['min','max','middle']) {
    await evaluate(`{const slider=document.querySelector('#kb-shift');slider.value=${end==='middle'?'Math.round((Number(slider.min)+Number(slider.max))/2)':`slider.${end}`};slider.dispatchEvent(new Event('input',{bubbles:true}));slider.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
    const state=await evaluate(`(()=>{const piano=document.querySelector('#piano'),keys=[...piano.querySelectorAll('[data-midi]')];return{first:Number(keys[0].dataset.midi),last:Number(keys.at(-1).dataset.midi),start:piano.classList.contains('physical-start'),end:piano.classList.contains('physical-end'),left:getComputedStyle(piano,'::after').borderLeftWidth,right:getComputedStyle(piano,'::after').borderRightWidth,felt:getComputedStyle(piano,'::before').pointerEvents};})()`);
    assert.equal(state.start,state.first===21);assert.equal(state.end,state.last===108);
    assert.equal(state.left,state.start?'3px':'0px');assert.equal(state.right,state.end?'3px':'0px');
    assert.equal(state.felt,'none');
    if(end==='min')assert.equal(state.first,21);
    if(end==='max')assert.equal(state.last,108);
    if(end==='middle'){assert.equal(state.start,false);assert.equal(state.end,false);}
  }
  assert.deepEqual(errors,[]);
});
