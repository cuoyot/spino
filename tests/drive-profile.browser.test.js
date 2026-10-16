import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';

test('Profile removes the isolated Drive test and keeps Backup & sync on every platform',{timeout:45000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Profile timeout'))}},20)})`);
 await wait(`document.querySelector('.cp-profile-nav')`);
 await evaluate(`document.querySelector('.cp-profile-nav').click()`);
 assert.equal(await evaluate(`!!document.querySelector('[data-action=drive-media-review]')`),false,'web has no Android OAuth entry');
 // Simulate only the platform helper; actual native navigation is checked on the installed APK.
 await evaluate(`Capacitor.getPlatform=()=> 'android';document.querySelector('.cp-nav [data-action=home]').click();document.querySelector('.cp-profile-nav').click()`);
 assert.equal(await evaluate(`!!document.querySelector('[data-action=drive-media-review]')`),false,'Android beta no longer exposes a test section');
 assert.equal(await evaluate(`!!document.querySelector('[data-action=profile-backup]')`),true);
 await evaluate(`document.querySelector('[data-action=profile-backup]').click()`);await wait(`document.querySelector('#cloud-backup')`);
 assert.equal(await evaluate(`!!document.querySelector('[data-action=cloud-create-shared],[data-action=cloud-join-shared],[data-action=cloud-connect]')`),false);
 assert.deepEqual(errors,[]);
});
