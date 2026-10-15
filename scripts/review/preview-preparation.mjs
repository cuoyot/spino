// A dedicated local origin with a disposable notebook for preparation/PDF review.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {emptyData} from '../../src/companion/model.js';
import {scorePDF} from '../../tests/pdf-fixture.js';
const root=resolve('dist'),fixture=emptyData();
fixture.preferences={...fixture.preferences,language:'es',theme:'light',warmup:{enabled:false,minutes:2,exercise:'hanon-1'}};
fixture.works=[['review-ballade','Ballade — synthetic score','Review composer',true],['review-prelude','Prelude in C major BWV 846 — Well Tempered Clavier First Book','J. S. Bach',true],['review-satie','Gymnopédie No. 1','Erik Satie',true],['review-elise','Für Elise','Ludwig van Beethoven',true],['review-shelf','Été','Review composer',false]].map(([id,title,composer,onStand])=>({id,title,composer,onStand,stage:'En estudio',notes:'Disposable synthetic review',passage:'',target:null,bpm:60,...(id==='review-ballade'?{assetId:'review-pdf'}:{})}));
const asset={id:'review-pdf',name:'Synthetic review score.pdf',type:'application/pdf',base64:scorePDF(),annotations:{version:1,marks:[]}};
const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
createServer(async(req,res)=>{
 try{
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  let body=await readFile(path);
  if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
window.__SPINO_DISABLE_TOUR=true;
await new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('assets',{keyPath:'id'});};r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite'),store=tx.objectStore('state'),q=store.get('current');q.onsuccess=()=>{if(!q.result){store.put(${safe(fixture)},'current');tx.objectStore('assets').put(${safe(asset)});}};tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
await import(${safe(src)});
const wait=fn=>new Promise(resolve=>{const timer=setInterval(()=>{const value=fn();if(value){clearInterval(timer);resolve(value);}},30);});
await wait(()=>document.querySelector('.cp-today'));
document.querySelector('.cp-nav [data-action=practice]').click();
document.querySelector('[data-action=prepare][data-id=repertoire]').click();
document.querySelector('.cp-practice-stand button').click();
if(new URL(location.href).searchParams.get('review')==='pdf')document.querySelector('#prepare-form').requestSubmit();
document.title='SPino — synthetic preparation review';
</script>`);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch(error){res.writeHead(404).end();console.error(error.message);}
}).listen(Number(process.env.SPINO_PREPARATION_PORT||5196),'127.0.0.1',()=>console.log('Synthetic review: http://127.0.0.1:'+Number(process.env.SPINO_PREPARATION_PORT||5196)));
