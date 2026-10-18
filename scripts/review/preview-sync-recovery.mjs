import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {block,beginSession,emptyData,saveSession} from '../../src/companion/model.js';
import {driveNotebookBootstrap} from './drive-notebook-fixture.mjs';
const root=resolve('dist'),port=Number(process.env.SPINO_SYNC_PREVIEW_PORT||5303);
const pending=beginSession({title:'Phone pending practice',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});pending.elapsedMs=pending.blockElapsedMs=60000;
const example=emptyData(),done=beginSession({title:'Tablet completed practice',context:'piano',blocks:[block('repertoire',{workId:'synthetic-work'})]});done.elapsedMs=done.blockElapsedMs=31*60000;const saved=saveSession(example,done,{mood:4,notes:'Synthetic tablet result retained independently'});
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}let body=await readFile(path);
 if(path.endsWith('/index.html')){const theme=url.searchParams.get('theme')==='dark'?'dark':'light';const bootstrap=driveNotebookBootstrap().replace('fixture.data.preferences.language=',`fixture.data.preferences.theme=${JSON.stringify(theme)};fixture.data.sessions=[${JSON.stringify(saved)}];fixture.data.preferences.language=`);body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
 window.__SPINO_DISABLE_TOUR=true;
 ${bootstrap}
 const native=Capacitor.nativePromise;Capacitor.PluginHeaders.find(p=>p.name==='DriveNotebook').methods.push({name:'cancel',rtype:'promise'});Capacitor.nativePromise=async(plugin,method,args)=>{if(plugin==='DriveNotebook'&&method==='cancel'){window.__driveStall=false;window.__releaseDrive?.();return{}}return native(plugin,method,args)};
 await __cloudReady;await import(${JSON.stringify(src)});
 const wait=condition=>new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(condition()){clearInterval(timer);resolve()}else if(++n>700){clearInterval(timer);reject(Error('Synthetic sync preview did not initialize'))}},20)});
 await wait(()=>document.querySelector('.cp-today'));document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-backup]').click();
 if(!JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')||'{}').enabled){document.querySelector('[data-action=drive-connect]').click();await wait(()=>document.querySelector('[data-drive-picker]'));document.querySelector('[data-drive-picker]').requestSubmit()}
 await wait(()=>document.querySelector('#cloud-backup[data-cloud-status=saved]'));
 if(!sessionStorage.getItem('synthetic-phone-pending-seeded')){await new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano');q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),r=store.get('current');r.onsuccess=()=>store.put({...r.result,active:${JSON.stringify(pending)}},'current');tx.oncomplete=()=>{db.close();resolve()}}});sessionStorage.setItem('synthetic-phone-pending-seeded','1');location.reload();await new Promise(()=>{});}
 window.__driveStall=true;document.querySelector('[data-action=cloud-sync]').click();document.title='SPino · synthetic Drive pause and pending practice review';
 </script>`)}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch{res.writeHead(404).end()}}).listen(port,'127.0.0.1',()=>console.log('Synthetic Drive sync review: http://127.0.0.1:'+port+'/?theme=light or ?theme=dark'));
