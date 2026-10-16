import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {driveNotebookBootstrap} from './drive-notebook-fixture.mjs';
const root=resolve('dist'),port=Number(process.env.SPINO_DRIVE_PREVIEW_PORT||5204);
createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
 let body=await readFile(path);
 if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
  window.__SPINO_DISABLE_TOUR=true;${driveNotebookBootstrap()}
  await window.__cloudReady;await import(${JSON.stringify(src)});
  const observer=new MutationObserver(()=>{const button=document.querySelector('[data-action=settings]');if(!button)return;observer.disconnect();button.click();document.querySelector('[data-action=profile-backup]').click();});observer.observe(document.body,{childList:true,subtree:true});
 </script>`).replace('<body>','<body><aside style="position:relative;z-index:5000;padding:8px;text-align:center;background:#e7edff;color:#183567;font:14px system-ui">Synthetic browser review · simulated Google Drive · no Google account connected</aside>');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}}).listen(port,'127.0.0.1',()=>console.log(`Synthetic Drive notebook review: http://127.0.0.1:${port}/`));
