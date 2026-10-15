import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist');
const fixturePath=process.env.SPINO_CALENDAR_FIXTURE||'docs/quality-review/captures/calendar/2026-10-15-session-circles/fixture.json';
const server=createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  let body=await readFile(path);
  if(path.endsWith('/index.html')){
   const fixture=await readFile(fixturePath,'utf8');
   body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
window.__SPINO_DISABLE_TOUR=true;
if(!sessionStorage.getItem('calendar-circle-fixture')){
 await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${fixture},'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});
 sessionStorage.setItem('calendar-circle-fixture','1');
}
await import(${JSON.stringify(src)});
const observer=new MutationObserver(()=>{const b=document.querySelector('.cp-nav [data-action=calendar]');if(b){observer.disconnect();b.click();document.querySelector('[data-action=calendar-mode][data-id=week]')?.click();document.querySelector('.cp-agenda-week')?.scrollIntoView({block:'start'})}});observer.observe(document.body,{childList:true,subtree:true});
</script>`);
  }
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');
  res.end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(5187,'127.0.0.1',()=>console.log('Synthetic calendar review: http://127.0.0.1:5187/'));
