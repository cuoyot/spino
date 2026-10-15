import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {mkdir,writeFile} from 'node:fs/promises';

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
  const evidence=process.env.SPINO_KEYBOARD_THEME_EVIDENCE;
  if(evidence)await mkdir(evidence,{recursive:true});
  for(const [layout,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await evaluate(`new Promise(resolve=>setTimeout(resolve,220))`);
    const materials={};
    for(const theme of ['light','dark']){
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};window.materialKey=[...document.querySelectorAll('#piano .key.black')].find(k=>{const r=k.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth});window.materialGeometry=()=>[...document.querySelectorAll('#piano .key,#piano .key-edge')].map(k=>{const r=k.getBoundingClientRect();return[k.dataset.midi||'edge',r.x,r.y,r.width,r.height]});window.originalGeometry=materialGeometry()`);
      for(const state of ['idle','pressed','guide']){
        await evaluate(`materialKey.classList.toggle('down',${state==='pressed'});materialKey.classList.toggle('guide',${state==='guide'})`);
        const colours=await evaluate(`(()=>{const style=getComputedStyle(materialKey),white=getComputedStyle(document.querySelector('#piano .white'));return{black:style.backgroundImage,white:white.backgroundImage}})()`);
        const opaque=[...colours.black.matchAll(/rgba?\(([^)]+)\)/g)].map(m=>m[1].split(',').map(Number)).filter(c=>c.length===3||c[3]>=.5);
        assert.ok(opaque.length&&opaque.every(c=>Math.max(...c.slice(0,3))<128),`${theme}/${state}: black keys must retain a dark material`);
        assert.notEqual(colours.black,colours.white);
        if(theme==='light')materials[state]=colours;else assert.deepEqual(colours,materials[state],'Piano materials are independent of the application theme');
        assert.equal(await evaluate(`JSON.stringify(materialGeometry())===JSON.stringify(originalGeometry)`),true,'Theme and key feedback preserve MIDI IDs and geometry');
        if(evidence)await writeFile(`${evidence}/${theme}-${state}-${layout}.png`,Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));
      }
      await evaluate(`materialKey.classList.remove('down','guide')`);
    }
  }
  assert.deepEqual(errors,[]);
});
