// Dedicated local origin with a disposable synthetic notebook; no personal data.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {todayFixtures} from './today-fixtures.mjs';
const root=resolve('dist'),fixture=todayFixtures().pending;
fixture.preferences.theme='light';
const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
    let body=await readFile(path);
    if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
      window.__SPINO_DISABLE_TOUR=true;
      await new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('assets',{keyPath:'id'});};r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),q=store.get('current');q.onsuccess=()=>{if(!q.result)store.put(${safe(fixture)},'current');};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
      await import(${safe(src)});
      const timer=setInterval(()=>{if(document.querySelector('.cp-today')){clearInterval(timer);document.querySelector('.cp-nav [data-action=practice]').click();document.title='SPino · synthetic pending practice · responsive browser review';}},30);
    </script>`);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.mjs':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm'})[extname(path)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end();}
}).listen(5227,'127.0.0.1',()=>console.log('Responsive browser review with synthetic notebook: http://127.0.0.1:5227/'));
