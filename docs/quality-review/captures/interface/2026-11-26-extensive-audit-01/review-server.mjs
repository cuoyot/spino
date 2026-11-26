import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {historyFixture} from './tests/progress-history-fixture.js';
import {todayCompactFixtures} from './scripts/review/today-compact-fixtures.mjs';
import {emptyData,addDays} from './src/companion/model.js';
const root=resolve('dist'), fixed='2026-11-26T10:00:00Z';
const history=historyFixture(), populated=todayCompactFixtures().current;
populated.works=history.data.works;
populated.sessions=history.data.sessions;
for(const w of populated.works){w.onStand=!w.trashedAt;w.addedAt='2026-10-01T10:00:00Z';}
for(const e of populated.events)e.date=addDays(e.date,16);
populated.preferences.name='Review pianist';
const fixtures={populated,empty:emptyData(),pending:todayCompactFixtures().pending};
fixtures.pending.works=populated.works;
await writeFile('review-fixtures.json',JSON.stringify({fixed,fixtures,assets:history.assets},null,2));
createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/review'){
  const width=Number(u.searchParams.get('w'))||390,height=Number(u.searchParams.get('h'))||844;
  const search=u.searchParams.toString();
  res.setHeader('Content-Type','text/html');res.end(`<html><head><title>SPino UI audit · responsive browser · synthetic notebook</title></head><body style="margin:0;background:#ddd;font:14px system-ui"><nav style="padding:6px">Responsive browser · synthetic notebook · ${width}×${height} · <a href="/review?${search}&w=390&h=844">Phone portrait</a> · <a href="/review?${search}&w=844&h=390">Phone landscape</a> · <a href="/review?${search}&w=768&h=1024">Tablet portrait</a> · <a href="/review?${search}&w=1024&h=768">Tablet landscape</a></nav><iframe title="SPino review" src="/?${search}" style="display:block;border:0;width:${width}px;height:${height}px;background:white"></iframe></body></html>`);return;
 }
 const path=resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
 let body=await readFile(path);
 if(path.endsWith('/index.html')){
  const fixture=structuredClone(fixtures[u.searchParams.get('fixture')]||populated),theme=u.searchParams.get('theme')||'light',route=u.searchParams.get('route')||'home';
  fixture.preferences.language=u.searchParams.get('lang')||'es';fixture.preferences.theme=theme;
  const safe=v=>JSON.stringify(v).replaceAll('<','\\u003c');
  body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
   window.__SPINO_DISABLE_TOUR=true;
   const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[${safe(fixed)}]));}static now(){return ${Date.parse(fixed)};}};
   const open=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>open('ui-audit-20261126-'+name,...args);
   await new Promise((resolve,reject)=>{const r=indexedDB.open('cuaderno-piano',1);r.onupgradeneeded=()=>{r.result.createObjectStore('state');r.result.createObjectStore('assets',{keyPath:'id'});};r.onsuccess=()=>{const db=r.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${safe(fixture)},'current');for(const asset of ${safe(history.assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
   await import(${safe(src)});
   const timer=setInterval(()=>{const node=document.querySelector(${safe(`[data-action="${route}"]`)});if(node&&document.querySelector('.cp-today')){clearInterval(timer);if(${safe(route)}!=='home')node.click();document.title='SPino · UI audit · synthetic notebook';}},40);
  </script>`);
 }
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.pdf':'application/pdf','.wasm':'application/wasm','.mp4':'video/mp4'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch(error){res.writeHead(404).end(String(error));}
}).listen(5376,'127.0.0.1',()=>console.log('http://127.0.0.1:5376/review'));
