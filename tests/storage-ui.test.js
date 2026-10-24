import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorageUI} from '../src/companion/storage-ui.js';
function fixture(){
 const values=new Map([['spino.storage.review.v1','shown']]),calls=[],dialog={open:false,contains:n=>n===dialog.lastElementChild};let screen;
 const showDialog=(title,body,accept)=>{dialog.open=true;dialog.lastElementChild={querySelector:()=>({textContent:''})};screen={title,body,accept};};dialog.close=()=>dialog.open=false;
 const state={config:{name:'Existing.json'},status:'idle'},manager={state,refresh:async()=>{},folders:async()=>[{id:'folder',name:'My folder'}],link:()=>({folderId:'folder'}),folderName:async()=> 'My folder',organize:async options=>{calls.push(options);Object.assign(state.config,{...options,storageVersion:'1',storageFolder:options.folderId,principalId:'phone'});},daily:async options=>{calls.push(options);state.status='wifi';}};
 const ui=createStorageUI({manager,showDialog,dialog,formEnd:()=>'<button>Save</button>',cloud:{state:{transport:'drive',name:'Existing.json',notebookId:'book'}},deviceName:'Phone',refresh:async()=>{},storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}});
 return {ui,manager,dialog,calls,values,screen:()=>screen};
}
test('old dismissed notice cannot hide unfinished setup; entry stays visible after Later',async()=>{
 const f=fixture();await f.ui.notify();assert.ok(f.screen());assert.equal(f.ui.pending,true);f.ui.actions['storage-review-later']();assert.equal(f.dialog.open,false);assert.match(f.ui.entryMarkup(),/storage-setup/);assert.notEqual(f.values.get('spino.storage.review.v1'),'done');
});
test('guided setup writes only after final confirmation and reports first copy still pending',async()=>{
 const f=fixture();await f.ui.actions['storage-setup']();assert.match(f.screen().body,/data-storage-step="location"/);assert.equal(f.calls.length,0);
 await f.screen().accept(new Map([['name','My practice']]));assert.match(f.screen().body,/data-storage-step="backups"/);assert.equal(f.calls.length,0);
 await f.screen().accept(new Map());assert.deepEqual(f.calls[0],{folderId:'folder',name:'My practice',enabled:true,wifiOnly:true});assert.deepEqual(f.calls[1],{manual:true});assert.equal(f.values.get('spino.storage.review.v1'),'done');assert.equal(f.ui.pending,false);assert.match(f.screen().body,/first copy will start with Wi-Fi/);assert.doesNotMatch(f.screen().body,/saved and verified/);
});
test('closing during setup preparation never reopens a late wizard',async()=>{
 const f=fixture();let release;f.manager.folders=()=>new Promise(r=>release=r);const running=f.ui.actions['storage-setup']();await Promise.resolve();f.dialog.close();release([]);await running;assert.equal(f.dialog.open,false);assert.equal(f.calls.length,0);
});
test('configured notebooks do not receive the setup notification',async()=>{
 const f=fixture();Object.assign(f.manager.state.config,{storageVersion:'1',storageFolder:'folder',principalId:'phone'});await f.ui.notify();assert.equal(f.screen(),undefined);assert.equal(f.ui.entryMarkup(),'');
});
