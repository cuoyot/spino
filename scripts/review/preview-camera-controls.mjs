import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {emptyData} from '../../src/companion/model.js';
import {syntheticCameraSource} from '../../tests/fixtures/camera-controls.js';

const fixture=emptyData();fixture.preferences.language='es';fixture.preferences.theme='light';
const root=resolve('dist');
const injection=`window.__SPINO_DISABLE_TOUR=true;
const originalOpen=indexedDB.open.bind(indexedDB);
indexedDB.open=(name,...args)=>originalOpen('spino-camera-review-20261018-'+name,...args);
await new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite'),s=tx.objectStore('state');s.get('current').onsuccess=e=>{if(!e.target.result)s.put(${JSON.stringify(fixture)},'current')};tx.oncomplete=()=>{db.close();resolve()}}});
${syntheticCameraSource}
let opened=false,started=false;
const observer=new MutationObserver(()=>{const entry=document.querySelector('[data-action=record-media]');if(entry&&!opened){opened=true;entry.click();}const video=document.querySelector('[data-media=video]');if(video&&!started){started=true;observer.disconnect();video.click();}document.title='SPino · synthetic camera controls review';});
observer.observe(document.body,{childList:true,subtree:true});`;

createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
    let body=await readFile(path);
    if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">${injection}\nawait import(${JSON.stringify(src)});</script>`);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end();}
}).listen(Number(process.env.SPINO_CAMERA_PORT||5295),'127.0.0.1',()=>console.log('Synthetic camera review: http://127.0.0.1:'+(process.env.SPINO_CAMERA_PORT||5295)+'/'));
