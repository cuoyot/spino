// Disposable browser preview. It never connects to Google or the installed notebook.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {driveNotebookBootstrap} from './drive-notebook-fixture.mjs';
import {cloudRecoveryFixture} from './cloud-recovery-fixture.mjs';
const root=resolve('dist'),port=Number(process.env.SPINO_MEDIA_TRIM_PORT||5398);
const take={id:'synthetic-local-copy',workId:'synthetic-work',title:'Synthetic local recording',workTitle:'Synthetic score',createdAt:'2026-10-21T10:00:00Z',durationMs:120000,kind:'audio',draft:false,base64:(await readFile('tests/fixtures/media/two-minute-stream.webm')).toString('base64')};
const bootstrap=driveNotebookBootstrap({remote:cloudRecoveryFixture(),localMedia:take,remoteMedia:{...take,id:'synthetic-remote-copy',title:'Synthetic recording needing attention',mimeType:'application/octet-stream'}});
createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
 let body=await readFile(path);
 if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
  window.__SPINO_DISABLE_TOUR=true;${bootstrap}
  await window.__cloudReady;await import(${JSON.stringify(src)});
  let opened=false,played=false;
  const show=()=>{
   if(!opened){const button=document.querySelector('.cp-nav [data-action=piano]');if(!button)return;opened=true;button.click();document.querySelector('[data-action=multimedia]').click();}
   if(!played){const button=document.querySelector('[data-action=media-play]');if(button){played=true;button.click();}}
   const trim=document.querySelector('[data-media=trim]');if(trim){observer.disconnect();trim.click();}
  };
  const observer=new MutationObserver(show);observer.observe(document.body,{childList:true,subtree:true});show();
 </script>`).replace('<body>','<body><aside style="position:relative;z-index:5000;padding:8px;text-align:center;background:#e7edff;color:#183567;font:14px system-ui">Synthetic browser review · simulated Google Drive · no personal recordings</aside>');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}}).listen(port,'127.0.0.1',()=>console.log(`Synthetic recording trim review: http://127.0.0.1:${port}/`));
