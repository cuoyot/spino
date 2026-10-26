import test from 'node:test';
import assert from 'node:assert/strict';
import {createStorageUI} from '../src/companion/storage-ui.js';
function fixture(config={},options={}){
 const calls=[],dialog={open:false,contains:n=>n===dialog.lastElementChild,querySelector:()=>null};let screen;
 const showDialog=(title,body,accept)=>{dialog.open=true;dialog.lastElementChild={querySelector:()=>({textContent:''})};screen={title,body,accept};};dialog.close=()=>dialog.open=false;
 const state={loaded:true,deviceId:'phone',config:{name:'Original musical title.json',...config}},manager={state,refresh:async()=>{},link:()=>({folderId:'notebook'}),folders:async()=>[{id:'notebook',name:'Notebook'},{id:'container',name:'Notebook folder'},{id:'archives',name:'Archives'}],folderName:async()=> 'Archives',backupAccount:async id=>({id,email:'backups@example.invalid'}),connectBackupAccount:async()=>{calls.push('connect-backup');return {id:'archive-account',email:'backups@example.invalid'};},configureAutomatic:async options=>calls.push(options),claimPrincipal:async()=>{calls.push('claim');state.config.principalId='phone';}};
 const ui=createStorageUI({...options,manager,showDialog,dialog,formEnd:label=>`<div class="cp-actions"><button data-action="close-dialog">Cancel</button><button type="submit">${label}</button></div>`,toast:message=>calls.push(message),cloud:{state:{transport:'drive',name:'Original musical title.json',notebookId:'book'}},deviceName:'Phone'});
 return {ui,manager,dialog,calls,screen:()=>screen};
}
test('optional automatic settings open directly with local destination off by default and no manual archive actions',async()=>{
 const f=fixture();await f.ui.overview();assert.match(f.screen().body,/data-backup-settings/);assert.match(f.screen().body,/value="local" selected/);assert.doesNotMatch(f.screen().body,/name="enabled" checked/);
 assert.doesNotMatch(f.screen().body,/data-action="storage-(export|import|copies|problem)"|<label>Notebook name|Step 1/);assert.match(f.screen().body,/Original musical title_\d{4}-\d{2}-\d{2}\.zip/);assert.deepEqual(f.calls,[]);
 await f.screen().accept(new Map([['enabled','on'],['destination','local']]));assert.deepEqual(f.calls[0],{enabled:true,destination:'local',folderName:'Original musical title_backup',accountId:'',wifiOnly:true});assert.equal(f.dialog.open,false);
});
test('the other principal is named and only an explicit takeover replaces it',async()=>{
 const f=fixture({principalId:'other',principalName:'My tablet'});await f.ui.overview();assert.match(f.screen().body,/My tablet/);assert.match(f.screen().body,/storage-principal/);assert.deepEqual(f.calls,[]);
 await f.ui.actions['storage-principal']();assert.deepEqual(f.calls,['claim']);assert.match(f.screen().body,/This device/);assert.doesNotMatch(f.screen().body,/storage-principal/);
});
test('Drive asks for its own account and an editable folder name without listing existing folders',async()=>{
 const f=fixture({storageFolder:'container'});await f.ui.overview();assert.match(f.screen().body,/name="backupFolderName"/);assert.doesNotMatch(f.screen().body,/name="folder"|storage-folder"/);assert.match(f.screen().body,/Original musical title_backup/);
 await f.ui.actions['storage-backup-connect']();assert.deepEqual(f.calls,['connect-backup']);assert.match(f.screen().body,/backups@example.invalid/);
 await f.screen().accept(new Map([['enabled','on'],['destination','drive'],['backupFolderName','My archives'],['mobile','on']]));assert.deepEqual(f.calls[1],{enabled:true,destination:'drive',folderName:'My archives',accountId:'archive-account',wifiOnly:false});
});
test('a matching folder name is rejected before saving and the suggested name fixes it',async()=>{
 const f=fixture();await f.ui.overview();await assert.rejects(f.screen().accept(new Map([['enabled','on'],['destination','drive'],['backupFolderName','Original musical title']])),/matches the notebook folder/);assert.deepEqual(f.calls,[]);
 f.ui.actions['storage-folder-suggestion']();assert.match(f.screen().body,/Original musical title_backup/);
});
test('existing enabled remote settings retain their explicit destination',async()=>{
 const f=fixture({backupEnabled:'1',copiesFolder:'archives',principalId:'phone'});await f.ui.overview();assert.match(f.screen().body,/value="drive" selected/);assert.match(f.screen().body,/name="enabled" checked/);assert.match(f.ui.summary(),/Last automatic backup.*Not created yet[\s\S]*Folder: Google Drive/);
});
test('unknown settings produce no setup prompt and a late read cannot reopen a closed dialog',async()=>{
 const f=fixture();f.manager.state.loaded=false;assert.equal(f.ui.entryMarkup(),'');await f.ui.notify();assert.equal(f.screen(),undefined);assert.equal(f.ui.pending,false);
 let finish;f.manager.refresh=()=>new Promise(resolve=>finish=resolve);const opening=f.ui.overview();f.dialog.close();finish();await opening;assert.equal(f.dialog.open,false);assert.deepEqual(f.calls,[]);
});


test('enabled automatic row names the last archive and destination, with real phase progress while busy',()=>{
 const f=fixture({backupEnabled:'1',backupDestination:'drive',backupFolderName:'Piano archives',lastBackupAt:'2026-10-26T12:00:00Z'});
 assert.match(f.ui.summary(),/Last automatic backup:/);assert.match(f.ui.summary(),/Google Drive \/ Piano archives/);assert.match(f.ui.statusMarkup(),/One ZIP a day/);
 f.manager.state.busy=true;f.manager.state.progress={stage:'files',completed:2,total:4};let html=f.ui.statusMarkup();assert.match(html,/data-backup-phase="preparing"/);assert.match(html,/value="50"/);assert.match(html,/2\/4 files/);
 f.manager.state.progress={stage:'saving',completed:0,total:0};html=f.ui.statusMarkup();assert.match(html,/data-backup-phase="saving"/);assert.doesNotMatch(html,/<progress[^>]*value=/);
 f.manager.state.progress={stage:'upload',completed:1024,total:4096};assert.match(f.ui.statusMarkup(),/value="25"/);
 f.manager.state.busy=false;assert.match(f.ui.statusMarkup(),/One ZIP a day/);f.manager.state.config.backupEnabled='0';assert.equal(f.ui.summary(),'Disabled');
});


test('the full existing folder name is loaded from the backup account before editing',async()=>{
 const full='A complete original folder name '.repeat(4),f=fixture({backupAccount:'archive-account',backupFolder:'folder',backupFolderLabel:'A shortened display label',backupEnabled:'1',backupDestination:'drive'});
 f.manager.backupFolderName=async()=>full;await f.ui.overview();assert.ok(f.screen().body.includes('value="'+full+'"'));assert.deepEqual(f.calls,[]);
});
test('choosing an account in a draft and cancelling never changes configured archive account',async()=>{
 const f=fixture({backupAccount:'previous-account',backupFolder:'folder',backupDestination:'drive'});await f.ui.overview();await f.ui.actions['storage-backup-connect']();f.dialog.close();assert.equal(f.manager.state.config.backupAccount,'previous-account');assert.deepEqual(f.calls,['connect-backup']);
});

test('copy now is on the enabled principal summary and uses the saved destination under a reservation',async()=>{
 let locked=false,release,received;const f=fixture({backupEnabled:'1',principalId:'phone'},{prepareSetup:async()=>{locked=true;return ()=>locked=false;}});
 assert.match(f.ui.statusMarkup(),/storage-backup-now/);assert.match(f.ui.statusMarkup(),/One ZIP a day/);
 f.manager.daily=async options=>{assert.equal(locked,true);received=options;await new Promise(resolve=>release=resolve);f.manager.state.status='saved';return 'saved';};
 const first=f.ui.actions['storage-backup-now']();for(let n=0;n<5&&!release;n++)await Promise.resolve();await f.ui.actions['storage-backup-now']();
 assert.deepEqual(received,{manual:true,force:true});release();await first;assert.equal(locked,false);assert.deepEqual(f.calls,['Backup saved.']);
 f.manager.state.config.principalId='other';assert.doesNotMatch(f.ui.statusMarkup(),/storage-backup-now/);
 f.manager.state.config.backupEnabled='0';assert.equal(f.ui.statusMarkup(),'');
});
test('a skipped copy cannot claim success from an earlier completed copy',async()=>{
 const f=fixture({backupEnabled:'1',principalId:'phone'});f.manager.state.status='saved';f.manager.daily=async()=> 'busy';
 await f.ui.actions['storage-backup-now']();assert.deepEqual(f.calls,['A backup is already running.']);assert.equal(f.dialog.open,false);
});
