import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {driveNotebookBootstrap} from './drive-notebook-fixture.mjs';

const root=resolve('dist'),port=Number(process.env.SPINO_PRACTICE_PREVIEW_PORT||5292);
createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
    let body=await readFile(path);
    if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
      window.__SPINO_DISABLE_TOUR=true;
      ${driveNotebookBootstrap()}
      await window.__cloudReady;
      await import(${JSON.stringify(src)});
      const wait=condition=>new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(condition()){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Synthetic practice preview did not initialize'))}},20)});
      await wait(()=>document.querySelector('.cp-today')&&window.__cloudReview.statusCalls>0);
      document.querySelector('[data-action=settings]').click();document.querySelector('[data-action=profile-backup]').click();
      const linked=JSON.parse(localStorage.getItem('spino.cloud-sync.device.v1')||'{}');
      if(!linked.enabled||linked.mode!=='sync'){
        document.querySelector('[data-action=drive-connect]').click();await wait(()=>document.querySelector('[data-drive-picker]'));document.querySelector('[data-drive-picker]').requestSubmit();
      }
      await wait(()=>document.querySelector('#cloud-backup[data-cloud-status=saved]'));
      window.__driveStall=true;document.querySelector('[data-action=cloud-sync]').click();await wait(()=>window.__releaseDrive);
      document.querySelector('.cp-nav [data-action=practice]').click();document.querySelector('[data-action=prepare][data-id=reading]').click();document.title='SPino — synthetic practice with stalled Drive';
    </script>`);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`Synthetic practice review (simulated stalled Drive, no Google account): http://127.0.0.1:${port}/`));
