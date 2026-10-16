import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,copyFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openBrowser} from './browser.js';
test('durable Drive identity claims are atomic across journal connections and survive reopening',{timeout:45000},async t=>{
 const root=await mkdtemp(join(tmpdir(),'spino-journal-'));await copyFile('src/companion/drive-journal.js',join(root,'drive-journal.js'));await writeFile(join(root,'index.html'),'<!doctype html><title>Disposable journal test</title>');t.after(()=>rm(root,{recursive:true,force:true}));
 const {send,evaluate,url}=await openBrowser(t,{rootDirectory:root});await send('Page.navigate',{url:url.replace('#reader','')});
 const result=await evaluate(`(async()=>{const {createDriveJournal}=await import('/drive-journal.js'),a=createDriveJournal(),b=createDriveJournal();const claims=await Promise.all(Array.from({length:40},(_,n)=>(n%2?a:b).claim('pending',{id:'candidate-'+n,text:'same immutable payload'})));const reopened=createDriveJournal(),saved=await reopened.get('pending');await a.set('cursor',{token:'acknowledged'});const cursor=await b.get('cursor');await reopened.clear();return {ids:[...new Set(claims.map(c=>c.id))],saved,cursor,cleared:await b.get('pending')===undefined};})()`);
 assert.equal(result.ids.length,1);assert.equal(result.saved.id,result.ids[0]);assert.equal(result.saved.text,'same immutable payload');assert.deepEqual(result.cursor,{token:'acknowledged'});assert.equal(result.cleared,true);
});
