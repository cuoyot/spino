import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorageUI} from '../src/companion/storage-ui.js';
function fixture(options={}){
 const values=new Map([['spino.storage.review.v1','shown']]),calls=[],dialog={open:false,contains:n=>n===dialog.lastElementChild};let screen;
 const showDialog=(title,body,accept)=>{dialog.open=true;dialog.lastElementChild={querySelector:()=>({textContent:''})};screen={title,body,accept};};dialog.close=()=>dialog.open=false;
 const state={config:{name:'Existing.json'},status:'idle'},manager={state,refresh:async()=>{},folders:async()=>[{id:'folder',name:'My folder'}],link:()=>({folderId:'folder'}),folderName:async()=> 'My folder',organize:async options=>{calls.push(options);Object.assign(state.config,{...options,storageVersion:'1',storageFolder:options.folderId,principalId:'phone'});},daily:async options=>{calls.push(options);state.status='wifi';}};
 const ui=createStorageUI({manager,showDialog,dialog,formEnd:()=>'<button>Save</button>',cloud:{state:{transport:'drive',name:'Existing.json',notebookId:'book'}},deviceName:'Phone',refresh:async()=>{},...options,storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}});
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
 const f=fixture();let release;f.manager.folders=()=>new Promise(r=>release=r);const running=f.ui.actions['storage-setup']();for(let n=0;n<5&&!release;n++)await Promise.resolve();f.dialog.close();release([]);await running;assert.equal(f.dialog.open,false);assert.equal(f.calls.length,0);
});
test('configured notebooks do not receive the setup notification',async()=>{
 const f=fixture();Object.assign(f.manager.state.config,{storageVersion:'1',storageFolder:'folder',principalId:'phone'});await f.ui.notify();assert.equal(f.screen(),undefined);assert.equal(f.ui.entryMarkup(),'');
});

test('setup waits for synchronization and closing its wait prevents any storage changes',async()=>{
 let finish;const gate=new Promise(resolve=>finish=resolve),f=fixture({prepareSetup:()=>gate});const opening=f.ui.actions['storage-setup']();assert.match(f.screen().body,/data-drive-progress/);assert.equal(f.calls.length,0);f.dialog.close();finish();await opening;assert.equal(f.dialog.open,false);assert.equal(f.calls.length,0);
});
test('activation waits for notebook synchronization instead of failing while it is busy',async()=>{
 let prepare=0,finish;const f=fixture({prepareSetup:()=>++prepare===1?Promise.resolve():new Promise(resolve=>finish=resolve)});await f.ui.actions['storage-setup']();await f.screen().accept(new Map([['name','After sync']]));const activating=f.screen().accept(new Map());assert.equal(f.calls.length,0);assert.match(f.screen().body,/Finishing notebook synchronization/);finish();await activating;assert.equal(f.calls[0].name,'After sync');
});
test('storage reservation is released after both successful preparation and a late close',async()=>{
 let released=0;const f=fixture({prepareSetup:async()=>()=>{released++;}});await f.ui.actions['storage-setup']();assert.equal(released,1);
 await f.screen().accept(new Map([['name','Reserved']]));await f.screen().accept(new Map());assert.equal(released,2);
});
