import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';

test('beta release notes show current and historical versions in a responsive accessible dialog',{timeout:90000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{rootDirectory:'site'});
  const evidence=process.env.SPINO_SITE_RELEASE_EVIDENCE,frames=[];
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const id=setInterval(()=>{if(${condition}){clearInterval(id);resolve()}else if(++n>500){clearInterval(id);reject(Error('Release dialog timeout'))}},20)})`);
  for(const lang of ['es','en','ca'])for(const [layout,width,height] of [['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768],['narrow-phone',320,568]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await send('Page.navigate',{url:url+(lang==='es'?'':lang+'/')});
    await wait(`document.querySelector('[data-release-open]')`);
    await evaluate(`document.querySelector('[data-release-open]').focus();document.querySelector('[data-release-open]').click()`);
    await wait(`document.querySelector('#release-notes').open`);
    const state=await evaluate(`(()=>{const d=document.querySelector('#release-notes'),r=d.getBoundingClientRect(),b=d.querySelector('[data-release-close]').getBoundingClientRect(),body=d.querySelector('.release-body');return{modal:d.matches(':modal'),current:d.querySelector('details').dataset.version,expanded:d.querySelector('details').open,history:[...d.querySelectorAll('details')].map(e=>e.dataset.version),bounds:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,overflow:d.scrollWidth>d.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,closeVisible:b.top>=0&&b.bottom<=innerHeight&&b.width>=44&&b.height>=44,scrollable:body.scrollHeight>body.clientHeight,focusInDialog:d.contains(document.activeElement)}})()`);
    assert.equal(state.modal,true);assert.equal(state.current,'6.1.0-beta.12');assert.equal(state.expanded,true);
    for(const version of ['6.0.0','6.0.0-beta.13','6.0.0-beta.1','5.2.7','5.2.3','5.1.1','4.0'])assert.ok(state.history.includes(version));
    assert.equal(new Set(state.history).size,state.history.length);
    for(const key of ['bounds','closeVisible','scrollable','focusInDialog'])assert.equal(state[key],true,`${lang} ${layout} ${key}`);
    assert.equal(state.overflow,false);assert.equal(state.pageOverflow,false);
    if(evidence){await mkdir(evidence,{recursive:true});const file=`${lang}-${layout}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(evidence+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,lang,width,height,state});}
    await evaluate(`document.querySelector('[data-version="5.2.7"] summary').scrollIntoView();if(!document.querySelector('[data-version="5.2.7"]').open)document.querySelector('[data-version="5.2.7"] summary').click()`);
    assert.ok(await evaluate(`document.querySelector('[data-version="5.2.7"]').open&&document.querySelector('[data-version="5.2.7"] li').textContent.length>20`));
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await wait(`!document.querySelector('#release-notes').open`);
    assert.equal(await evaluate(`document.activeElement===document.querySelector('[data-release-open]')`),true);
    await evaluate(`document.querySelector('[data-release-open]').click()`);
    assert.equal(await evaluate(`document.querySelector('.release-body').scrollTop`),0);
    await evaluate(`document.querySelector('[data-release-close]').click()`);
    assert.equal(await evaluate(`document.querySelector('#release-notes').open`),false);
  }
  assert.deepEqual(errors,[]);
  if(evidence)await writeFile(evidence+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'Responsive Chromium, synthetic website content; not native-device acceptance',frames,checks:['Current beta and previous archived releases','Modal bounds, scrolling, close target and focus','Archived notes expand; Escape and close return focus','Reopening returns to current version'],sources:Object.fromEntries(await Promise.all(['scripts/site/build-site.mjs','scripts/site/release-history.mjs','scripts/site/site-copy.mjs'].map(async f=>[f,createHash('sha256').update(await readFile(f)).digest('hex')])))},null,2));
});
