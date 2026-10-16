import test from 'node:test';import assert from 'node:assert/strict';import {openBrowser} from './browser.js';import {cloudApplyBlocker} from '../src/companion/cloud-policy.js';
test('closed retained forms no longer prevent applying cloud changes',{timeout:60000},async t=>{
 const {send,evaluate,url,errors}=await openBrowser(t,{companion:true,language:'en'});await send('Page.navigate',{url});await evaluate(`new Promise(r=>{const i=setInterval(()=>{if(document.querySelector('.cp-app-header')){clearInterval(i);r()}},20)})`);
 await evaluate(`document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-backup]').click();document.querySelector('[data-action=export-backup]').click()`);
 const policy=()=>evaluate(`(${cloudApplyBlocker.toString()})({active:null,dialog:document.querySelector('#cp-dialog'),scoreViewer:null,openingScore:false,document})`);
 assert.equal(await policy(),'dialog');await evaluate(`document.querySelector('[data-action=close-dialog]').click()`);assert.equal(await evaluate(`!!document.querySelector('form')`),true);assert.equal(await policy(),null);
 await evaluate(`const f=document.createElement('form');f.id='sync-test-editor';f.innerHTML='<input>';document.querySelector('.cp-content').append(f)`);assert.equal(await policy(),'editor');await evaluate(`document.querySelector('#sync-test-editor').hidden=true`);assert.equal(await policy(),null);
 assert.deepEqual(errors,[]);
});
