import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {driveNotebookBootstrap} from '../scripts/review/drive-notebook-fixture.mjs';

test('optional explanations use keyboard-accessible Info while actions, warnings and notebook data remain available',{timeout:120000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:driveNotebookBootstrap()});await send('Page.navigate',{url});
 const wait=condition=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>700){clearInterval(timer);reject(Error('Missing '+${JSON.stringify(condition)}))}},25)})`);
 const click=action=>evaluate(`document.querySelector('[data-action="${action}"]').click()`);
 await wait(`document.querySelector('.cp-profile-nav')`);await click('settings');await click('profile-backup');await click('drive-connect');await wait(`document.querySelector('[data-drive-picker]')`);await evaluate(`document.querySelector('[data-drive-picker]').requestSubmit()`);await wait(`document.querySelector('#cloud-backup[data-cloud-status=saved]')`);
 const snapshot=()=>evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets']),data=tx.objectStore('state').get('current'),assets=tx.objectStore('assets').getAll();tx.oncomplete=()=>{db.close();resolve({data:data.result,assets:assets.result})}}})`);
 const before=await snapshot(),folder=process.env.SPINO_COMPACT_HELP_EVIDENCE,frames=[];
 const capture=async(state,selector)=>{
  await wait(`document.querySelector(${JSON.stringify(selector)})?.querySelector('.cp-more-info')`);
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('.cp-more-info').open`),false);
  if(folder){await mkdir(folder,{recursive:true});for(const theme of ['light','dark'])for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[320,640]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await evaluate(`document.documentElement.dataset.theme='${theme}';document.querySelector(${JSON.stringify(selector)}).querySelector('.cp-more-info summary').scrollIntoView({block:'center'})`);
   const geometry=await evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(selector)}),d=root.querySelector('.cp-more-info'),r=d.querySelector('summary').getBoundingClientRect();return{noOverflow:root.scrollWidth<=root.clientWidth+1,closed:!d.open,bodyHidden:!d.querySelector('.cp-more-info-content').checkVisibility(),target:r.width>=44&&r.height>=44,width:r.width,height:r.height,minHeight:getComputedStyle(d.querySelector('summary')).minHeight}})()`);
   for(const key of ['noOverflow','closed','bodyHidden','target'])assert.equal(geometry[key],true,JSON.stringify({state,width,geometry}));
   const file=state+'-'+theme+'-'+width+'x'+height+'.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({state,file,theme,width,height,geometry});
  }}
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('.cp-more-info summary').focus()`);
  for(const type of ['keyDown','keyUp'])await send('Input.dispatchKeyEvent',{type,key:'Enter',code:'Enter',windowsVirtualKeyCode:13,...(type==='keyDown'?{text:'\r',unmodifiedText:'\r'}:{})});
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('.cp-more-info').open`),true,'Enter opens explanation without submitting forms');
  assert.ok(await evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('.cp-more-info-content').textContent.trim().length`)>20);
  assert.equal(await evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(selector)});return root.scrollWidth<=root.clientWidth+1})()`),true);
  if(folder){const file=state+'-expanded.png',shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({state,file,expanded:true});}
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).querySelector('.cp-more-info').open=false`);
 };
 await capture('recording-sync','#cloud-media');
 await evaluate(`document.querySelector('#cloud-media .cp-more-info').open=true`);await click('media-sync');await wait(`document.querySelector('#cloud-media .cp-media-sync-status').textContent.includes('al día')`);assert.equal(await evaluate(`document.querySelector('#cloud-media .cp-more-info').open`),true,'Background progress preserves an open explanation');await evaluate(`document.querySelector('#cloud-media .cp-more-info').open=false`);
 await click('cloud-manage');await capture('sync-management','#cp-dialog');await click('close-dialog');
 await click('export-backup');await capture('export-copy','#cp-dialog');await evaluate(`document.querySelector('[name=format]').value='2';document.querySelector('[name=format]').dispatchEvent(new Event('change',{bubbles:true}))`);assert.equal(await evaluate(`!document.querySelector('[data-format-warning]').hidden&&document.querySelector('[name=compatibility]').required`),true);await click('close-dialog');
 await click('settings');await click('profile-edit');await capture('profile-level','#cp-dialog');assert.equal(await evaluate(`document.querySelector('#cp-dialog').open`),true);await click('close-dialog');
 await click('profile-files');await wait(`document.querySelector('[data-action=downloads]')`);await click('downloads');await capture('downloads','.cp-content');
 await click('progress');for(const section of ['repertoire','technique']){await evaluate(`document.querySelector('[data-action=progress-section][data-id=${section}]').click()`);await capture('progress-'+section,'.cp-progress-page');}
 assert.deepEqual(await snapshot(),before);assert.deepEqual(errors,[]);
 if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser-synthetic-notebook-and-Drive',frames,checks:['Seven surfaces, both themes, phone/tablet orientations and 320 px','Info is closed initially and opens with Enter','Transfer progress preserves open help','Format compatibility warning remains visible and required','Original notebook, PDF and annotations unchanged'],sources:Object.fromEntries(await Promise.all(['src/companion/more-info.js','src/companion/app.js','src/companion/app.css','src/companion/drive-sync-view.js','src/companion/download-view.js','src/companion/profile-view.js','src/companion/progress-learning.js','src/companion/library-view.js','src/companion/drive-notebook-view.js'].map(async file=>[file,createHash('sha256').update(await readFile(file)).digest('hex')]))),buildIndexSha256:createHash('sha256').update(await readFile('dist/index.html')).digest('hex')},null,2));
});
