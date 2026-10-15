import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist');
const fixturePath='docs/quality-review/captures/progress/2026-10-15-time-chart/fixture.json';
const server=createServer(async(req,res)=>{
 try {
  const pathname=new URL(req.url,'http://localhost').pathname;
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  let body=await readFile(path);
  if(path.endsWith('/index.html')){
   const fixture=JSON.parse(await readFile(fixturePath,'utf8'));
   Object.assign(fixture.preferences,{language:'es',theme:'light'});
   body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
window.__SPINO_DISABLE_TOUR=true;
if(!sessionStorage.getItem('progress-time-fixture')){
 await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite');tx.objectStore('state').put(${JSON.stringify(fixture).replaceAll('<','\\u003c')},'current');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});
 sessionStorage.setItem('progress-time-fixture','1');
}
const observer=new MutationObserver(openProgress);
function openProgress(){const b=document.querySelector('.cp-nav [data-action=progress]');if(b){observer.disconnect();b.click();document.title='SPino — synthetic Progress review'}}
observer.observe(document.body,{childList:true,subtree:true});
await import(${JSON.stringify(src)});
openProgress();
</script>`);
  }
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch{res.writeHead(404).end();}
});
server.listen(5192,'127.0.0.1',()=>console.log('Synthetic Progress review: http://127.0.0.1:5192/'));
