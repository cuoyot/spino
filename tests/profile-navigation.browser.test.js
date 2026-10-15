import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

test('profile detail navigation preserves edits and scales saved scores across device sizes', {timeout:90000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.navigate',{url});
  const wait=expression=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${expression}){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('timeout'));}},20);})`);
  await wait(`document.querySelector('.cp-profile-nav')`);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.cp-nav button')].map(b=>b.dataset.action)`),['home','practice','calendar','piano','progress']);
  assert.equal(await evaluate(`!!document.querySelector('.cp-app-header .cp-profile-nav')`),true);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.cp-nav button > span:not(.cp-avatar)')].map(s=>s.textContent)`),['Hoy','Practicar','Calendario','Biblioteca','Progreso']);
  assert.equal(await evaluate(`document.querySelector('.cp-profile-nav').getAttribute('aria-label')`),'Perfil');
  assert.equal(await evaluate(`document.querySelector('.cp-nav [data-action=midi-settings]')`),null,'MIDI is a utility rather than a primary destination');
  await evaluate(`new Promise((resolve,reject)=>{const request=indexedDB.open('cuaderno-piano',1);request.onsuccess=()=>{const db=request.result,tx=db.transaction('assets','readwrite');for(let i=0;i<29;i++)tx.objectStore('assets').put({id:'layout-'+i,name:'Piano score '+String(i).padStart(2,'0')+' — A deliberately long title for a complete edition with annotations and several movements.pdf',type:'application/pdf',base64:'YWJjZA=='});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};})`);
  await evaluate(`document.querySelector('.cp-profile-nav').click();document.querySelector('[data-action=profile-edit]').click();document.querySelector('[name=name]').value='Alex Pianist';document.querySelector('[name=weeklyMinutes]').value='240';document.querySelector('#profile-identity-form').requestSubmit()`);
  await wait(`!document.querySelector('#cp-dialog').open`);
  assert.equal(await evaluate(`document.querySelector('.cp-profile-nav .cp-avatar').textContent`),'AP');
  await evaluate(`document.querySelector('[data-action=profile-practice]').click();document.querySelector('[name=reading-bpm]').value='88';document.querySelector('[name=reading-bpm]').dispatchEvent(new Event('input',{bubbles:true}));__sr.midi.simulateDevices(['Test grand piano']);`);
  assert.equal(await evaluate(`document.querySelector('[name=reading-bpm]').value`),'88','device changes preserve unsaved fields');
  assert.equal(await evaluate(`document.querySelector('output[for=reading-bpm]').value`),'88');
  await evaluate(`document.querySelector('#preferences-form').requestSubmit()`);
  await wait(`document.querySelector('#cp-toast').textContent.includes('guardadas')`);
  await evaluate(`document.querySelector('[data-action=profile-back]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-profile-identity h2').textContent`),'Alex Pianist','saving practice preferences retains identity');
  assert.ok(await evaluate(`document.querySelector('.cp-profile-identity p').textContent.includes('240')`));
  await evaluate(`document.querySelector('.cp-nav [data-action=progress]').click()`);
  assert.equal(await evaluate(`document.querySelector('.cp-nav [aria-current=page]').dataset.action`),'progress','progress is a main destination');
  for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1180,820]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    for(const [action,name] of [['practice','practice'],['settings','profile'],['profile-practice','preferences'],['settings',null],['profile-backup','backup'],['settings',null],['profile-files','files'],['midi-settings','instrument'],['piano','library']]) {
      await evaluate(`document.querySelector('[data-action="${action}"]').click()`);
      if(action==='profile-files')await wait(`document.querySelectorAll('.cp-file-row').length===24`);
      if(!name)continue;
      const layout=await evaluate(`(()=>{const p=document.querySelector('.cp-page');return{overflow:p.scrollWidth>p.clientWidth+1,nav:[...document.querySelectorAll('.cp-nav button')].map(b=>{const r=b.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}),fields:[...document.querySelectorAll('#preferences-form select')].map(f=>f.getBoundingClientRect().width)}})()`);
      assert.equal(layout.overflow,false,`${name} ${width}x${height}`);
      for(const b of layout.nav)assert.ok(b.width>=44&&b.height>=44&&b.x>=0&&b.y>=0&&b.right<=width+1&&b.bottom<=height+1,JSON.stringify({name,width,height,b}));
      assert.ok(await evaluate(`document.querySelector('.cp-profile-nav').getBoundingClientRect().width>=44`),'profile avatar retains a complete touch target');
      assert.ok(layout.fields.every(w=>w>=90),'fields remain usable');
      if(process.env.UI_SCREENSHOTS){await mkdir('artifacts/review',{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`artifacts/review/new-${name}-${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
    }
  }
  await evaluate(`document.querySelector('.cp-profile-nav').click();document.querySelector('[data-action=profile-files]').click()`);
  await wait(`document.querySelectorAll('.cp-file-row').length===24`);
  await evaluate(`document.querySelector('[data-action=profile-files-more]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-file-row').length`),29);
  await evaluate(`const search=document.querySelector('#profile-file-search');search.value='score 28';search.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-file-row').length`),1);
  assert.ok(await evaluate(`document.querySelector('.cp-file-row strong').textContent.includes('28')`));
  await evaluate(`document.querySelector('.cp-file-row').click();window.dispatchEvent(new Event('spino:back',{cancelable:true}));`);
  assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),false);
  assert.equal(await evaluate(`document.querySelector('#profile-file-search').value`),'score 28');
  assert.deepEqual(errors,[]);
});
