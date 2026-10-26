import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompleteBackupExport} from '../src/companion/complete-backup-ui.js';
function fixture(){
 let screen,busy=false,saved=0,failure=new Error('Drive transfer failed (403).'),prepareCount=0;
 const notices=[],dialog={open:false,close(){this.open=false;},contains:n=>n===dialog.lastElementChild};
 const options={dialog,showDialog:(title,body,accept)=>{dialog.open=true;dialog.lastElementChild={querySelector:()=>({textContent:''})};screen={title,body,accept};},formEnd:label=>`<button>${label}</button>`,setBusy:value=>{busy=value;},notify:message=>notices.push(message),prepare:async()=>{prepareCount++;if(failure)throw failure;return new Blob(['zip']);},save:async()=>{saved++;},now:()=>new Date('2026-10-24T21:00:00Z')};
 const controller=createCompleteBackupExport(options);
 return {controller,options,dialog,notices,screen:()=>screen,busy:()=>busy,saved:()=>saved,prepareCount:()=>prepareCount,succeed:()=>{failure=null;}};
}
test('ZIP preparation errors remain visible with Retry and no saved copy claim',async()=>{
 const f=fixture();f.controller.open();await f.screen().accept();assert.equal(f.dialog.open,true);assert.match(f.screen().body,/role="alert"/);assert.match(f.screen().body,/Drive transfer failed \(403\)/);assert.match(f.screen().body,/Retry/);assert.equal(f.busy(),false);assert.equal(f.saved(),0);
});
test('retry prepares and opens save options, then clears busy state',async()=>{
 const f=fixture();f.controller.open();await f.screen().accept();f.succeed();await f.screen().accept();assert.equal(f.saved(),1);assert.equal(f.dialog.open,false);assert.equal(f.busy(),false);assert.equal(f.controller.state.status,'ready');
});
test('closing progress retains the prepared ZIP and does not open an unsolicited chooser',async()=>{
 const f=fixture();let finish;f.options.prepare=()=>new Promise(resolve=>finish=resolve);const c=createCompleteBackupExport(f.options);c.open();const running=f.screen().accept();f.dialog.close();assert.match(c.markup(),/View progress/);finish(new Blob(['zip']));await running;
 assert.equal(f.saved(),0);assert.equal(c.state.status,'ready');assert.match(c.markup(),/Choose where to save/);assert.equal(f.dialog.open,false);assert.equal(f.notices.length,1);
 c.open();assert.match(f.screen().body,/stays available while Spino is open/);await f.screen().accept();assert.equal(f.saved(),1);
});
test('reopening progress does not start a second preparation',async()=>{
 const f=fixture();let finish,count=0;f.options.prepare=()=>{count++;return new Promise(resolve=>finish=resolve);};const c=createCompleteBackupExport(f.options);c.open();const running=f.screen().accept();f.dialog.close();c.open();assert.match(f.screen().body,/role="status"/);assert.equal(count,1);finish(new Blob(['zip']));await running;assert.equal(f.saved(),1);
});
test('closed preparation failures remain on the page and can be reviewed',async()=>{
 const f=fixture();let reject;f.options.prepare=()=>new Promise((_,fail)=>reject=fail);const c=createCompleteBackupExport(f.options);c.open();const running=f.screen().accept();f.dialog.close();reject(Error('Offline'));await running;assert.equal(f.dialog.open,false);assert.match(c.markup(),/Offline/);c.open();assert.match(f.screen().body,/Offline/);assert.equal(f.busy(),false);
});
test('save failure retains the ZIP so Retry does not download or prepare again',async()=>{
 const f=fixture();f.succeed();let attempts=0;f.options.save=async()=>{if(!attempts++)throw Error('No space <device>');};const c=createCompleteBackupExport(f.options);c.open();await f.screen().accept();assert.match(f.screen().body,/No space &lt;device&gt;/);assert.equal(f.prepareCount(),1);await f.screen().accept();assert.equal(f.prepareCount(),1);assert.equal(attempts,2);assert.equal(c.state.status,'ready');
});
test('a new copy discards the retained ZIP only when explicitly requested',async()=>{
 const f=fixture();f.succeed();f.controller.open();await f.screen().accept();f.controller.open();assert.match(f.screen().body,/Prepare a new copy/);f.controller.startNew();assert.match(f.screen().body,/Prepare ZIP/);assert.equal(f.controller.state.bytes,0);await f.screen().accept();assert.equal(f.prepareCount(),2);
});

test('cancelling the file picker retains the prepared ZIP and never claims it was saved',async()=>{
 const f=fixture();f.succeed();let cancel=true;f.options.save=async()=>cancel?{cancelled:true}:{saved:true};const c=createCompleteBackupExport(f.options);c.open();await f.screen().accept();
 assert.equal(c.state.saved,false);assert.equal(f.dialog.open,true);assert.match(f.screen().body,/Choose where to save/);assert.equal(f.notices.length,0);assert.equal(f.prepareCount(),1);
 cancel=false;await f.screen().accept();assert.equal(c.state.saved,true);assert.equal(f.dialog.open,false);assert.equal(f.prepareCount(),1);assert.deepEqual(f.notices,['Backup saved.']);
});
test('save remains pending until the document provider acknowledges completion',async()=>{
 const f=fixture();f.succeed();let finish;f.options.save=()=>new Promise(resolve=>finish=resolve);const c=createCompleteBackupExport(f.options);c.open();const saving=f.screen().accept();
 for(let n=0;n<5&&!finish;n++)await Promise.resolve();assert.equal(c.state.status,'saving');assert.equal(c.state.saved,false);assert.deepEqual(f.notices,[]);
 finish({saved:true});await saving;assert.equal(c.state.saved,true);assert.deepEqual(f.notices,['Backup saved.']);
});

test('acknowledged save shows a completed summary and reopening never offers the pending chooser',async()=>{
 const f=fixture();f.succeed();f.options.save=async()=>({saved:true});const c=createCompleteBackupExport(f.options);
 c.open();await f.screen().accept();assert.equal(c.state.status,'saved');assert.equal(c.state.saved,true);
 assert.match(c.markup(),/Backup saved/);assert.match(c.markup(),/data-action="storage-export-new"/);assert.doesNotMatch(c.markup(),/Choose where to save|ZIP prepared/);
 c.open();assert.match(f.screen().title,/Backup saved/);assert.doesNotMatch(f.screen().body,/Choose where to save|stays available/);
 c.startNew();assert.equal(c.state.saved,false);assert.equal(c.state.status,'idle');assert.match(f.screen().body,/Prepare ZIP/);
});
test('browser download cannot claim a provider-confirmed save',async()=>{
 const f=fixture();f.succeed();f.options.save=async()=>({downloaded:true});const c=createCompleteBackupExport(f.options);
 c.open();await f.screen().accept();assert.equal(c.state.saved,false);assert.equal(c.state.status,'ready');assert.doesNotMatch(c.markup(),/Backup saved/);
});
