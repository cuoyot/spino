import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';

const root=resolve('dist');
const fixture=JSON.parse(await readFile('docs/quality-review/captures/warmups/2026-10-20-score-spacing-01-baseline/fixture.json','utf8'));
const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const server=createServer(async(req,res)=>{
 try {
  const pathname=new URL(req.url,'http://localhost').pathname;
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  let body=await readFile(path);
  if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
window.__SPINO_DISABLE_TOUR=true;
await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state');store.get('current').onsuccess=e=>{if(!e.target.result)store.put(${safe(fixture)},'current')};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});
await import(${safe(src)});
const until=condition=>new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(condition()){clearInterval(timer);resolve()}else if(++n>750){clearInterval(timer);reject(Error('Hanon review timeout'))}},20)});
await until(()=>document.querySelector('[data-action=resume-session]'));
document.querySelector('[data-action=resume-session]').click();
await until(()=>document.querySelector('[data-action=open-reader]'));
document.querySelector('[data-action=open-reader]').click();
await until(()=>window.__sr?.layout);
document.querySelector('[data-warmup-start]')?.click();
await until(()=>__sr.timed);
__sr.settings.soundMode='off';__sr.settings.metronome=false;
if(__sr.timed.suspendedAt==null)document.querySelector('#start').click();
document.title='SPino — Hanon score spacing review';
</script>`);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[extname(path)]||'application/octet-stream');
  res.end(body);
 }catch(error){console.error(error.message);res.writeHead(404).end();}
});
const port=Number(process.env.HANON_REVIEW_PORT||5482);
server.listen(port,'127.0.0.1',()=>console.log('Synthetic Hanon score review: http://127.0.0.1:'+port+'/'));
