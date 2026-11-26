// Disposable responsive review. No real Google account or notebook is used.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {connectedDriveBootstrap} from './drive-connected-fixture.mjs';
const root=resolve('dist'),port=Number(process.env.SPINO_STALL_PREVIEW_PORT||5394),bootstrap=await connectedDriveBootstrap({language:'es'});
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
 let body=await readFile(path);
 if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
  window.__SPINO_DISABLE_TOUR=true;
  ${bootstrap}
  const native=Capacitor.nativePromise,schedule=window.setTimeout.bind(window),waiting=[];
  let demonstrate=false;
  window.setTimeout=(fn,ms,...args)=>schedule(fn,demonstrate&&ms===180000?8000:ms,...args);
  Capacitor.PluginHeaders.find(p=>p.name==='DriveNotebook').methods.push({name:'cancel',rtype:'promise'});
  Capacitor.nativePromise=async(plugin,method,args)=>{
   if(plugin==='DriveNotebook'&&method==='cancel'){demonstrate=false;for(const resolve of waiting.splice(0))resolve();return {};}
   if(demonstrate&&plugin==='DriveNotebook'&&method==='request')await new Promise(resolve=>waiting.push(resolve));
   return native(plugin,method,args);
  };
  await __cloudReady;await import(${JSON.stringify(src)});
  const wait=condition=>new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(condition()){clearInterval(timer);resolve();}else if(++n>900){clearInterval(timer);reject(Error('Synthetic timeout review did not initialize'));}},20);});
  const click=action=>document.querySelector('[data-action="'+action+'"]').click();
  await wait(()=>document.querySelector('.cp-today')&&__cloudReview.statusCalls>0);
  click('settings');click('profile-backup');click('drive-connect');
  await wait(()=>document.querySelector('[data-drive-picker]'));document.querySelector('[data-drive-picker]').requestSubmit();
  await wait(()=>document.querySelector('[data-open-remote]')||document.querySelector('[data-sync-status=saved]'));
  document.querySelector('[data-open-remote]')?.closest('form').requestSubmit();
  await wait(()=>document.querySelector('#cloud-backup[data-cloud-status=saved]'));
  document.title='SPino · synthetic timeout recovery · responsive browser review';
  demonstrate=true;click('cloud-sync');
 </script>`);
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic timeout review: http://127.0.0.1:'+port+'/ (8-second demonstration of the 3-minute transport deadline; Retry completes normally)'));
