import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {emptyData} from '../src/companion/model.js';

const until = expression => `new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{clearInterval(timer);reject(Error('Timed out: '+${JSON.stringify(expression)}));},15000);const timer=setInterval(()=>{if(${expression}){clearInterval(timer);clearTimeout(timeout);resolve(true);}},20);})`;
test('two-minute legacy WebM has a full timeline before playback and keeps its original stored take', async t => {
  let closePageSend;
  t.after(async()=>{if(closePageSend){await closePageSend('Page.handleJavaScriptDialog',{accept:true}).catch(()=>{});await closePageSend('Page.close').catch(()=>{});}});
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});
  closePageSend=send;
  const fixture=emptyData();fixture.preferences.language='en';
  fixture.works=[{id:'duration-work',title:'Synthetic duration test',composer:'',stage:'En estudio',notes:'',passage:'',bpm:60,target:null,tags:[],favorite:false}];
  const encoded=(await readFile('tests/fixtures/media/two-minute-stream.webm')).toString('base64');
  const storeSource=await readFile('src/companion/media-store.js','utf8');
  await send('Page.navigate',{url});await evaluate(until("document.querySelector('.cp-today')"));
  const original=await evaluate(`(async()=>{
    const blob=new Blob([Uint8Array.from(atob(${JSON.stringify(encoded)}),c=>c.charCodeAt(0))],{type:'audio/webm'});
    const player=document.createElement('audio'),url=URL.createObjectURL(blob);
    const loaded=new Promise((resolve,reject)=>{player.onloadedmetadata=resolve;player.onerror=reject;});player.src=url;await loaded;
    const rawDurationFinite=Number.isFinite(player.duration);player.removeAttribute('src');player.load();URL.revokeObjectURL(url);
    const {openMediaStore}=await import(URL.createObjectURL(new Blob([${JSON.stringify(storeSource)}],{type:'text/javascript'})));
    const media=await openMediaStore();await media.put({id:'legacy-two-minute',workId:'duration-work',workTitle:'Synthetic duration test',title:'Two-minute legacy take',kind:'audio',createdAt:'2026-10-15T12:00:00Z',durationMs:120000,draft:false,blob});media.close();
    await new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano');r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture)},'current');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
    return {rawDurationFinite,bytes:blob.size};
  })()`);
  assert.equal(original.rawDurationFinite,false,'The legacy fixture must reproduce missing duration metadata');
  await send('Page.reload');await evaluate(until("document.querySelector('.cp-today')"));
  const click=selector=>send('Runtime.evaluate',{expression:`document.querySelector(${JSON.stringify(selector)}).click()`,userGesture:true,awaitPromise:true});
  await click('.cp-nav [data-action=piano]');await click('[data-action=multimedia]');await evaluate(until("document.querySelector('[data-action=media-play]')"));await click('[data-action=media-play]');
  await evaluate(until("document.querySelector('#cp-media-capture audio')?.readyState>=1"));
  assert.equal(await evaluate(`document.querySelector('#cp-media-capture audio').duration`),120);
  await send('Runtime.evaluate',{expression:`document.querySelector('#cp-media-capture audio').play()`,userGesture:true,awaitPromise:true});
  await evaluate(until("document.querySelector('#cp-media-capture audio').currentTime>=5"));
  await evaluate(`document.querySelector('#cp-media-capture audio').pause()`);
  const atFive=await evaluate(`(()=>{const p=document.querySelector('#cp-media-capture audio');return {elapsed:p.currentTime,duration:p.duration,fraction:p.currentTime/p.duration};})()`);
  assert.ok(atFive.fraction>0.04&&atFive.fraction<0.06,JSON.stringify(atFive));
  const folder=process.env.SPINO_MEDIA_DURATION_EVIDENCE;
  const frames=[];
  const layouts=[['phone-portrait',390,844],['phone-landscape',844,390],['tablet-portrait',768,1024],['tablet-landscape',1024,768]];
  async function capture(state) {
    if(!folder)return;
    for(const theme of ['light','dark'])for(const [name,width,height] of layouts){
      await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
      const file=`${theme}-${state}-${name}.png`,shot=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+file,Buffer.from(shot.data,'base64'));frames.push({file,theme,state,width,height});
    }
  }
  if(folder){
    await mkdir(folder,{recursive:true});await writeFile(folder+'/notebook.fixture.json',JSON.stringify(fixture,null,2));
    await capture('viewer');
  }
  await evaluate(`new Promise((resolve,reject)=>{const p=document.querySelector('#cp-media-capture audio');p.addEventListener('seeked',resolve,{once:true});p.addEventListener('error',reject,{once:true});p.currentTime=60;})`);
  await send('Runtime.evaluate',{expression:`document.querySelector('#cp-media-capture audio').play()`,userGesture:true,awaitPromise:true});
  await evaluate(until("document.querySelector('#cp-media-capture audio').currentTime>60.2"));
  await click('[data-media=close]');await click('[data-action=media-play]');
  await evaluate(until("document.querySelector('#cp-media-capture audio')?.readyState>=1"));
  assert.deepEqual(await evaluate(`(()=>{const p=document.querySelector('#cp-media-capture audio');return [p.currentTime,p.duration];})()`),[0,120]);
  const retained=await evaluate(`new Promise(resolve=>{const r=indexedDB.open('spino-local-media');r.onsuccess=()=>{const q=r.result.transaction('recordings').objectStore('recordings').getAll();q.onsuccess=()=>{resolve(q.result.map(r=>({id:r.id,bytes:r.blob.size,durationMs:r.durationMs,title:r.title})));r.result.close();};};})`);
  assert.deepEqual(retained,[{id:'legacy-two-minute',bytes:original.bytes,durationMs:120000,title:'Two-minute legacy take'}]);
  // Saved takes have no persistent Save action. Editing and a failed/retried rename
  // must keep the same player and playback position.
  assert.equal(await evaluate(`!!document.querySelector('#media-title,[data-media=save]')`),false);
  assert.equal(await evaluate(`document.querySelector('[data-media=delete]').textContent`),'Delete');
  await evaluate(`window.titlePlayer=document.querySelector('#cp-media-capture audio')`);
  await send('Runtime.evaluate',{expression:`titlePlayer.play()`,userGesture:true,awaitPromise:true});
  await evaluate(until('titlePlayer.currentTime>0.2'));
  await click('[data-media=edit-title]');
  assert.equal(await evaluate(`titlePlayer===document.querySelector('#cp-media-capture audio')&&!titlePlayer.paused&&titlePlayer.currentTime>0.2`),true);
  await evaluate(`document.querySelector('#media-title').value='Renamed practice take'`);
  await capture('editing');
  await evaluate(`window.originalTitlePut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...args){if(this.name==='recordings')throw new DOMException('Synthetic quota failure','QuotaExceededError');return originalTitlePut.call(this,value,...args);}`);
  await click('[data-media=save-title]');
  await evaluate(until("document.querySelector('[data-media-error]').textContent.includes('Could not save')"));
  assert.equal(await evaluate(`document.querySelector('#media-title').value`),'Renamed practice take');
  assert.equal(await evaluate(`titlePlayer===document.querySelector('#cp-media-capture audio')&&!titlePlayer.paused`),true);
  await evaluate(`IDBObjectStore.prototype.put=originalTitlePut`);
  await click('[data-media=save-title]');await evaluate(until("document.querySelector('.cp-media-title span')?.textContent==='Renamed practice take'"));
  assert.equal(await evaluate(`titlePlayer===document.querySelector('#cp-media-capture audio')&&!titlePlayer.paused`),true);
  await click('[data-media=edit-title]');
  await evaluate(`document.querySelector('#media-title').value='Unsaved title';document.querySelector('#media-title').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`);
  assert.equal(await evaluate(`document.querySelector('.cp-media-title span').textContent`),'Renamed practice take');
  assert.equal(await evaluate(`document.querySelector('#cp-media-capture').hidden`),false);
  await click('[data-media=close]');await click('[data-action=media-play]');await evaluate(until("document.querySelector('.cp-media-title span')?.textContent==='Renamed practice take'"));
  await click('[data-media=close]');
  assert.deepEqual(errors,[]);
  if(folder)await writeFile(folder+'/verification.json',JSON.stringify({date:new Date().toISOString(),kind:'responsive-browser',nativeAcceptance:false,original,atFive,retained,checks:['Full two-minute playback timeline, five-second progress, seek/resume/reopen','Saved viewer offers red-link Delete and Close; pencil/check title editing','Rename persists; failed write retains edited text for retry','Title editing, retry, save and Escape preserve mounted player and playback','Draft Save/Discard behavior checked separately in media.browser.test.js'],frames,sourceHashes:Object.fromEntries(await Promise.all(['src/companion/media-duration.js','src/companion/media-view.js','src/companion/media.css','src/companion/locale-ca.js','tests/media-duration.browser.test.js','tests/fixtures/media/two-minute-stream.webm','package-lock.json','dist/index.html'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')]))),runtimeErrors:errors},null,2));
});
