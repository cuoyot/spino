import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';

test('notification preferences request permission, persist, disable and render responsively', {timeout:60000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.__reminderCalls=[];window.__permission=false;
    window.CapacitorCustomPlatform={name:'android'};
    window.Capacitor={PluginHeaders:[{name:'Notebook',methods:['reminders','networkStatus','practiceScreenAwake'].map(name=>({name,rtype:'promise'}))}],nativeCallback:()=> 'fixture',nativePromise:async(plugin,method,args)=>{
      if(method==='reminders'){__reminderCalls.push(args);if(args.requestPermission)__permission=true;return {enabled:__permission};}
      if(method==='networkStatus')return {online:false,wifi:false};return {};
    }};`});
  await send('Page.navigate',{url});
  const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('timeout'))}},20)})`);
  await wait(`document.querySelector('.cp-profile-nav')`);
  await evaluate(`document.querySelector('.cp-profile-nav').click();document.querySelector('[data-action=profile-reminders]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-action=practice-suggestions]').disabled`),true);
  assert.equal(await evaluate(`__reminderCalls.some(c=>c.requestPermission)`),false);
  await evaluate(`document.querySelector('[data-action=notification-permission]').click()`);
  await wait(`document.querySelector('[data-action=notification-permission]').getAttribute('aria-checked')==='true'`);
  await evaluate(`document.querySelector('[data-action=practice-suggestions]').click()`);
  await wait(`document.querySelector('[data-action=practice-suggestions]').getAttribute('aria-checked')==='true'`);
  assert.ok(await evaluate(`__reminderCalls.at(-1).items.some(n=>n.id.startsWith('suggestion:'))`));
  const folder=process.env.REMINDER_CAPTURE_DIR;
  if(folder)await mkdir(folder,{recursive:true});
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),true);
    if(folder){const shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(`${folder}/${width}x${height}.png`,Buffer.from(shot.data,'base64'));}
  }
  await evaluate(`document.querySelector('[data-action=notification-permission]').click()`);
  await wait(`document.querySelector('[data-action=notification-permission]').getAttribute('aria-checked')==='false'`);
  assert.deepEqual(await evaluate(`__reminderCalls.at(-1).items`),[]);
  await send('Page.reload');await wait(`document.querySelector('.cp-profile-nav')`);
  await evaluate(`document.querySelector('.cp-profile-nav').click();document.querySelector('[data-action=profile-reminders]').click()`);
  assert.equal(await evaluate(`document.querySelector('[data-action=notification-permission]').getAttribute('aria-checked')`),'false');
  assert.equal(await evaluate(`document.querySelector('[data-action=practice-suggestions]').getAttribute('aria-checked')`),'true');
  await evaluate(`document.querySelector('.cp-nav [data-action=home]').click();document.querySelector('[data-action=new-event]').click()`);
  await evaluate(`{const f=document.querySelector('#event-form');f.elements.title.value='Synthetic reminder';f.elements.date.value='2030-01-02';f.elements.eventHour.value='12';f.elements.eventHour.dispatchEvent(new Event('change'));f.elements.reminder.checked=true;f.requestSubmit();}`);
  await wait(`document.querySelector('#cp-confirm')`);
  assert.match(await evaluate(`document.querySelector('#cp-confirm').closest('dialog').textContent`),/Habilitar las notificaciones|Habilitar notificaciones/);
  assert.equal(await evaluate(`__reminderCalls.some(c=>c.requestPermission)`),false,'saving an alarm does not implicitly enable notifications');
  await evaluate(`document.querySelector('#cp-confirm').click()`);
  await wait(`__reminderCalls.some(c=>c.requestPermission)`);
  assert.ok(await evaluate(`__reminderCalls.at(-1).items.some(n=>n.title==='Synthetic reminder')`));
  assert.deepEqual(errors,[]);
  if(folder)await writeFile(`${folder}/verification.json`,JSON.stringify({kind:'responsive browser with synthetic native notification bridge; not native-device acceptance',fixture:'Disposable empty notebook; no personal data',viewports:[[390,844],[844,390],[768,1024],[1024,768]],buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex'),permissionRequested:true,cancellation:true,reloadPersistence:true,errors},null,2));
});
