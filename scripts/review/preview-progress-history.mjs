import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { historyFixture } from '../../tests/progress-history-fixture.js';

const root = resolve('dist'), fixture = historyFixture(), port = Number(process.env.HISTORY_PORT || 5287);
const safe = value => JSON.stringify(value).replaceAll('<', '\\u003c');
createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    let body = await readFile(path);
    if (path.endsWith('/index.html')) body = body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, (_, src) => `<script type="module">
      window.__SPINO_DISABLE_TOUR=true;
      await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').get('current').onsuccess=e=>{if(!e.target.result){tx.objectStore('state').put(${safe(fixture.data)},'current');for(const asset of ${safe(fixture.assets)})tx.objectStore('assets').put(asset)}};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});
      const observer=new MutationObserver(openHistory);
      function openHistory(){const button=document.querySelector('.cp-nav [data-action=progress]');if(button){observer.disconnect();button.click();document.querySelector('.cp-history')?.previousElementSibling.scrollIntoView({block:'start'});document.title='SPino — synthetic history review'}}
      observer.observe(document.body,{childList:true,subtree:true});await import(${safe(src)});openHistory();
    </script>`);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml' })[extname(path)] || 'application/octet-stream');
    res.end(body);
  } catch (error) { console.error(error.message); res.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log('Synthetic history review: http://127.0.0.1:' + port + '/'));
