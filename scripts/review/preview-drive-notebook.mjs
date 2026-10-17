import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {driveNotebookBootstrap} from './drive-notebook-fixture.mjs';
const root=resolve('dist'),port=Number(process.env.SPINO_DRIVE_PREVIEW_PORT||5204);
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),pathname=url.pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname)),mediaNetwork=url.searchParams.get('review')==='media-network';
 if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
 let body=await readFile(path);
 if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
  window.__SPINO_DISABLE_TOUR=true;${driveNotebookBootstrap({network:mediaNetwork?{type:'cellular',saveData:true}:{type:'wifi',saveData:false}})}
  await window.__cloudReady;await import(${JSON.stringify(src)});
  let opened=false,submitted=false;
  const show=()=>{
    if(!opened){const button=document.querySelector('[data-action=settings]');if(!button)return;opened=true;button.click();document.querySelector('[data-action=profile-backup]').click();if(${mediaNetwork})document.querySelector('[data-action=drive-connect]').click();else observer.disconnect();}
    if(${mediaNetwork}){const picker=document.querySelector('[data-drive-picker]');if(picker&&!submitted){submitted=true;picker.requestSubmit();}const media=document.querySelector('#cloud-media');if(media){media.scrollIntoView({block:'center'});observer.disconnect();}}
  };
  const observer=new MutationObserver(show);observer.observe(document.body,{childList:true,subtree:true});show();
 </script>`).replace('<body>','<body><aside style="position:relative;z-index:5000;padding:8px;text-align:center;background:#e7edff;color:#183567;font:14px system-ui">Synthetic browser review · simulated Google Drive · no Google account connected</aside>');
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}}).listen(port,'127.0.0.1',()=>console.log(`Synthetic Drive notebook review: http://127.0.0.1:${port}/`));
