import test from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';

test('Profile offers the Drive check on Android beta and opens the isolated route',{timeout:45000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Profile timeout'))}},20)})`);
 await wait(`document.querySelector('.cp-profile-nav')`);
 await evaluate(`document.querySelector('.cp-profile-nav').click()`);
 assert.equal(await evaluate(`!!document.querySelector('[data-action=drive-media-review]')`),false,'web has no Android OAuth entry');
 // Simulate only the platform helper; actual native navigation is checked on the installed APK.
 await evaluate(`Capacitor.getPlatform=()=> 'android';document.querySelector('.cp-nav [data-action=home]').click();document.querySelector('.cp-profile-nav').click()`);
 assert.equal(await evaluate(`!!document.querySelector('[data-action=drive-media-review]')`),true,'Android beta exposes the transfer check');
 await evaluate(`document.querySelector('[data-action=drive-media-review]').click()`);
 await wait(`location.pathname==='/drive-media-review.html'&&document.querySelector('#connect')`);
 assert.deepEqual(errors,[]);
});
