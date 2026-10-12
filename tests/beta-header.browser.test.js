import test from 'node:test';import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';import {openBrowser} from './browser.js';
test('fixed header, profile placement, controls and light MIDI across six screens/four layouts',{timeout:120000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
 await send('Page.navigate',{url});await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('.cp-app-header h1')){clearInterval(timer);resolve()}},20)})`);
 const folder='artifacts/beta/2026-10-12/beta2-notch/responsive';await mkdir(folder,{recursive:true});
 for(const theme of ['light','dark']){
  await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-appearance]').click();document.querySelector('[data-action=set-theme][data-id=${theme}]').click();document.querySelector('[data-action=close-dialog]').click()`);
  for(const [layout,width,height] of [['phone-portrait',402,874],['phone-landscape',874,402],['tablet-portrait',820,1180],['tablet-landscape',1180,820]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
   const insets=layout==='phone-portrait'?{top:59,bottom:34,left:0,right:0}:layout==='phone-landscape'?{top:0,bottom:21,left:62,right:62}:{top:24,bottom:20,left:0,right:0};
   await send('Emulation.setSafeAreaInsetsOverride',{insets});
   for(const view of ['home','practice','calendar','piano','progress','settings']){
    await evaluate(`document.querySelector('[data-action=${view}]').click()`);
    const measure=()=>evaluate(`(()=>{const h=document.querySelector('.cp-app-header'),p=document.querySelector('.cp-page'),nav=document.querySelector('.cp-nav'),box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};return {header:box(h),nav:box(nav),page:box(p),title:h.querySelector('h1').textContent,profileInHeader:!!h.querySelector('[data-action=settings]'),profileInNav:!!nav.querySelector('[data-action=settings]'),midiBg:getComputedStyle(h.querySelector('.cp-midi-status')).backgroundColor,overflow:document.documentElement.scrollWidth>innerWidth+1,headerOverflow:h.scrollWidth>h.clientWidth+1}})()`);
    const before=await measure();assert.equal(before.profileInHeader,true);assert.equal(before.profileInNav,false);assert.equal(before.overflow,false,`${view}/${theme}/${layout}`);assert.equal(before.headerOverflow,false);assert.ok(before.header.h>=68);assert.ok(before.header.y>=insets.top);assert.ok(before.header.x>=insets.left);assert.ok(before.header.x+before.header.w<=width-insets.right+1);assert.ok(before.page.y>=before.header.y+before.header.h-1);
    await evaluate(`(()=>{const p=document.querySelector('.cp-page');p.scrollTop=p.scrollHeight})()`);const after=await measure();assert.deepEqual(after.header,before.header);assert.deepEqual(after.nav,before.nav);
    if(theme==='light')assert.equal(before.midiBg,'rgb(255, 255, 255)');
    if(view==='calendar')assert.ok(await evaluate(`document.querySelector('.cp-app-header [data-action=calendar-mode]')`));
    if(view==='practice')assert.ok(await evaluate(`document.querySelector('.cp-app-header [data-action=quick-practice]')`));
    if(view==='piano')assert.ok(await evaluate(`document.querySelector('.cp-app-header .cp-library-navigation')`));
    await evaluate(`document.querySelector('.cp-page').scrollTop=0`);const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${view}-${theme}-${layout}.png`,Buffer.from(shot.data,'base64'));
   }
  }
 }
 assert.deepEqual(errors,[]);
});
