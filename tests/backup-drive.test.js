import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createBackupDrive,backupFolderConflicts,suggestedBackupFolder,validateBackupFolder} from '../src/companion/backup-drive.js';
function fixture(){
 const accounts=new Map(),files=new Map(),journal=new Map(),calls=[];let sequence=1,selected='archives-A',loseResponse=false;
 const native={status:async({accountId}={})=>({account:accounts.get(accountId||selected)}),connect:async()=>{const account={id:selected,email:selected+'@example.invalid'};accounts.set(selected,account);return account;},request:async args=>{
  calls.push(args);assert.ok(accounts.has(args.accountId));const u=new URL('https://example.invalid'+args.path),reply=x=>({status:200,text:JSON.stringify(x)}),id=u.pathname.split('/').pop();
  if(id==='generateIds')return reply({ids:['archive-'+sequence++]});
  if(u.pathname==='/drive/v3/files'){
   if(args.method==='POST'){const data=JSON.parse(args.text);assert.equal(files.has(data.id),false);files.set(data.id,{...data,owner:args.accountId});if(loseResponse){loseResponse=false;throw Error('Lost response');}return reply(data);}
   return reply({files:[...files.values()].filter(f=>f.owner===args.accountId)});
  }
  const file=files.get(id);return !file||file.owner!==args.accountId?{status:404,text:'{}'}:reply(file);
 }};
 const provider=createBackupDrive({native,storage:{getItem:k=>journal.get(k),setItem:(k,v)=>journal.set(k,v)}});
 return {provider,files,calls,accounts,select:id=>selected=id,loseNextResponse:()=>loseResponse=true};
}
test('folder validation normalizes case/Unicode and suggests the entered notebook name with _backup',()=>{
 assert.equal(backupFolderConflicts('  CUADERNO ',['Cuaderno']),true);assert.equal(backupFolderConflicts('Cafe\u0301',['Café']),true);
 assert.throws(()=>validateBackupFolder('Cuaderno',['Cuaderno']),/matches/);assert.equal(suggestedBackupFolder('Cuaderno',['Cuaderno']),'Cuaderno_backup');assert.equal(suggestedBackupFolder('Cuaderno',['Cuaderno_backup']),'Cuaderno_backup_backup');
 for(const value of ['', 'a/b', 'a\\b', 'a\u0000b'])assert.throws(()=>validateBackupFolder(value),/folder name/);
});
test('an archive account must be explicitly connected and never falls back to notebook authorization',async()=>{
 const f=fixture();await assert.rejects(f.provider.requireAccount('notebook-owner'),/Connect Google Drive for backups/);assert.deepEqual(f.calls,[]);
 const account=await f.provider.connect();assert.equal(account.id,'archives-A');const folder=await f.provider.ensureFolder({accountId:account.id,sourceRoot:'notebook-root',name:'Cuaderno_backup',notebookNames:['Cuaderno']});assert.equal(folder.name,'Cuaderno_backup');
 assert.ok(f.calls.every(c=>c.accountId==='archives-A'));assert.equal(f.files.size,1);assert.deepEqual([...f.files.values()][0].parents,['root']);
 await assert.rejects(f.provider.ensureFolder({accountId:account.id,sourceRoot:'notebook-root',name:'Cuaderno',notebookNames:['Cuaderno']}),/matches/);assert.equal(f.files.size,1);
});
test('account changes retain older authorization and never share folders or journals across accounts',async()=>{
 const f=fixture();await f.provider.connect();const a=await f.provider.ensureFolder({accountId:'archives-A',sourceRoot:'root',name:'Piano_backup'});
 f.select('archives-B');await f.provider.connect();const b=await f.provider.ensureFolder({accountId:'archives-B',sourceRoot:'root',name:'Piano_backup'});
 assert.notEqual(a.id,b.id);assert.equal((await f.provider.account('archives-A')).id,'archives-A');assert.equal((await f.provider.account('archives-B')).id,'archives-B');
 const retry=await f.provider.ensureFolder({accountId:'archives-A',sourceRoot:'root',name:'Piano_backup'});assert.equal(retry.id,a.id);assert.equal(f.files.size,2);
});
test('an uncertain folder creation reuses its allocated ID and preserves the existing folder',async()=>{
 const f=fixture();await f.provider.connect();f.loseNextResponse();await assert.rejects(f.provider.ensureFolder({accountId:'archives-A',sourceRoot:'root',name:'Piano_backup'}),/Lost response/);
 assert.equal(f.files.size,1);const id=[...f.files.keys()][0],folder=await f.provider.ensureFolder({accountId:'archives-A',sourceRoot:'root',name:'Piano_backup'});assert.equal(folder.id,id);assert.equal(f.files.size,1);
});
test('ZIP upload uses the separate archive byte transport and the selected backup account',async()=>{
 const bytes=Buffer.from('A synthetic compressed archive'),digest=createHash('sha256').update(bytes).digest('hex'),calls=[],staged=[];
 const transfer={useBackupAccount:async args=>calls.push(['account',args]),useNotebookAccount:async()=>assert.fail('Archive cannot use the notebook session'),stageChunk:async args=>{staged.push(Buffer.from(args.base64,'base64'));return {sha256:digest};},request:async args=>{
  calls.push(['request',args]);assert.equal(args.accountId,'archive-owner');
  if(args.method==='POST'){assert.equal(args.json.parents[0],'archive-folder');return {status:200,headers:{location:'https://www.googleapis.com/upload/drive/v3/files/archive-zip'}};}
  if(args.method==='PUT')return {status:200};return {status:200,json:{size:bytes.length,sha256Checksum:digest}};
 },release:async()=>{}};
 const provider=createBackupDrive({native:{},transfer,storage:{}});const result=await provider.upload({blob:new Blob([bytes]),accountId:'archive-owner',folderId:'archive-folder',fileId:'archive-zip',name:'Notebook_2026-10-26.zip',properties:{},wifiOnly:true});
 assert.equal(result.sha256,digest);assert.deepEqual(Buffer.concat(staged),bytes);assert.equal(calls[0][0],'account');assert.equal(calls[0][1].accountId,'archive-owner');
});
