// Disposable synthetic preview; never connects to Google or the installed notebook.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {connectedDriveBootstrap} from './drive-connected-fixture.mjs';

const root=resolve('dist'),port=Number(process.env.SPINO_SYNC_PREVIEW_PORT||5216);
const reviewLabel=process.env.SPINO_SYNC_PREVIEW_LABEL||'Responsive browser review · simulated Drive · ';
const bootstrap=await connectedDriveBootstrap({language:'es'});
createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
    let body=await readFile(path);
    if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
      window.__SPINO_DISABLE_TOUR=true;
      ${bootstrap}
      await window.__cloudReady;
      await import(${JSON.stringify(src)});
      const wait=fn=>new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(fn()){clearInterval(timer);resolve();}else if(++n>500){clearInterval(timer);reject(Error('Synthetic preview did not initialize'));}},20);});
      const click=action=>document.querySelector('[data-action="'+action+'"]').click();
      await wait(()=>document.querySelector('.cp-today')&&__cloudReview.statusCalls>0);
      click('settings');click('profile-backup');click('drive-connect');
      await wait(()=>document.querySelector('[data-drive-picker]'));
      document.querySelector('[data-drive-picker]').requestSubmit();
      await wait(()=>document.querySelector('[data-open-remote]')||document.querySelector('[data-sync-status=saved]'));
      document.querySelector('[data-open-remote]')?.closest('form').requestSubmit();
      await wait(()=>document.querySelector('[data-sync-status=saved]'));
      window.__driveStall=true;click('cloud-sync');click('home');
      document.title='SPino · synthetic synchronization animation review';
      const banner=document.createElement('aside');
      banner.style='position:fixed;z-index:5000;bottom:80px;right:12px;max-width:calc(100vw - 24px);padding:10px;border-radius:8px;background:#e7edff;color:#183567;font:12px system-ui;box-shadow:0 2px 12px #0003';
      banner.textContent=${JSON.stringify(reviewLabel)};
      const resume=document.createElement('button');resume.textContent='Complete simulated transfer';
      resume.addEventListener('click',()=>{window.__driveStall=false;window.__releaseDrive?.();resume.disabled=true;});
      banner.append(resume);document.body.append(banner);
    </script>`);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');
    res.end(body);
  }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic synchronization animation review: http://127.0.0.1:'+port+'/'));
