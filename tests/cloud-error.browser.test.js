import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';
import { cloudBackupMarkup } from '../src/companion/cloud-backup-view.js';

test('cloud errors remain visible and retry is reachable across phone and tablet layouts', {timeout:60000}, async t => {
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'es'});
  await send('Page.navigate',{url});
  await evaluate(`new Promise(resolve=>{const timer=setInterval(()=>{if(document.querySelector('.cp-app-header')){clearInterval(timer);resolve();}},20)})`);
  await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-backup]').click()`);
  const html=cloudBackupMarkup({transport:'drive',account:{email:'synthetic-owner@example.invalid'},mode:'sync',enabled:true,status:'error',name:'Synthetic-shared.json',operation:'read',error:'Synthetic provider failure: the selected document is temporarily unavailable.',retryable:true},{available:true,driveAvailable:true,driveOnly:true,lang:'es'});
  await evaluate(`document.querySelector('#cloud-backup').outerHTML=${JSON.stringify(html)}`);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate(`document.querySelector('#cloud-backup [role=alert]').textContent.includes('Synthetic provider failure')`),true);
    assert.equal(await evaluate(`document.querySelector('#cloud-backup').scrollWidth<=document.querySelector('#cloud-backup').clientWidth`),true);
    await evaluate(`document.querySelector('#cloud-backup [data-action=cloud-sync]').scrollIntoView({block:'center'})`);
    assert.equal(await evaluate(`(()=>{const b=document.querySelector('#cloud-backup [data-action=cloud-sync]'),r=b.getBoundingClientRect();return !b.disabled&&r.top>=0&&r.bottom<=innerHeight;})()`),true);
    if(process.env.CLOUD_ERROR_CAPTURE) {
      await mkdir(process.env.CLOUD_ERROR_CAPTURE,{recursive:true});
      const capture=await send('Page.captureScreenshot',{format:'png'});
      await writeFile(`${process.env.CLOUD_ERROR_CAPTURE}/${width}x${height}.png`,Buffer.from(capture.data,'base64'));
    }
  }
  assert.deepEqual(errors,[]);
});
