import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openBrowser} from './browser.js';
import {mkdir,writeFile} from 'node:fs/promises';
test('update notice is once per installation, defers active practice and opens the existing store listing', {timeout:60000}, async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,releaseNotice:true});
 const wait=exp=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${exp}){clearInterval(timer);resolve();}else if(++n>1000){clearInterval(timer);reject(Error('Release notice timeout'));}},20)})`);
 const data=()=>evaluate(`new Promise(resolve=>{const r=indexedDB.open('cuaderno-piano',1);r.onsuccess=()=>{const q=r.result.transaction('state').objectStore('state').get('current');q.onsuccess=()=>{resolve(q.result);r.result.close();};};})`);
 await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
 assert.equal(await evaluate(`!!document.querySelector('[data-release-notice]')`),false);
 const before=await data();
 await evaluate(`localStorage.removeItem('spino.release-notice.v1')`);
 await send('Page.reload');await wait(`document.querySelector('[data-release-notice]')`);
 assert.match(await evaluate(`document.querySelector('[data-release-notice]').textContent`),/MusicXML/);
 await evaluate(`document.querySelector('[data-release-notice] [data-action=close-dialog]').click()`);
 await wait(`!document.querySelector('#cp-dialog').open`);assert.deepEqual(await data(),before);
 await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
 assert.equal(await evaluate(`!!document.querySelector('[data-release-notice]')`),false);
 // An upgraded installation does not interrupt an unfinished practice.
 await evaluate(`document.querySelector('[data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=free]').click();document.querySelector('#prepare-form').requestSubmit()`);
 await wait(`document.querySelector('[data-action=finish-session]') || document.querySelector('[data-action=session-finish]') || document.querySelector('.cp-session')`);
 await evaluate(`localStorage.removeItem('spino.release-notice.v1')`);await send('Page.reload');await wait(`document.querySelector('.cp-today')`);
 assert.equal(await evaluate(`!!document.querySelector('[data-release-notice]')`),false);
 await evaluate(`document.querySelector('.cp-nav [data-action=practice]').click()`);
 // Discard through the ordinary recovery control, retaining a disposable notebook.
 await evaluate(`document.querySelector('[data-action=resume-session]').click()`);
 await wait(`document.querySelector('.cp-session')`);
 await evaluate(`document.querySelector('[data-action=discard-session]').click();document.querySelector('#cp-confirm').click()`);
 await wait(`document.querySelector('.cp-today')`);
 await wait(`document.querySelector('[data-release-notice]')`);
 await evaluate(`window.openedStore=null;window.open=url=>{window.openedStore=url;};document.querySelector('[data-action=release-notice-rate]').click()`);
 assert.equal(await evaluate(`window.openedStore`),'https://play.google.com/store/apps/details?id=com.miguecoll.spino');
 await wait(`!document.querySelector('#cp-dialog').open`);
 assert.deepEqual(errors,[]);
});
