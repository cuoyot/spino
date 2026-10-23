// Dedicated local origin with synthetic MIDI and a demo take; no personal notebook.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {encodeMidi} from '../../src/companion/midi-recording.js';
const events=[];for(let i=0;i<8;i++){events.push({time:i*500,data:[144,[60,64,67,72,71,67,64,60][i],90]},{time:i*500+400,data:[128,[60,64,67,72,71,67,64,60][i],0]});}
const base64=Buffer.from(await encodeMidi(events,4500).arrayBuffer()).toString('base64'),root=resolve('dist');
createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
 let body=await readFile(path);
 if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
 window.__SPINO_DISABLE_TOUR=true;await import(${JSON.stringify(src)});
 const wait=condition=>new Promise(resolve=>{const timer=setInterval(()=>{if(condition()){clearInterval(timer);resolve()}},50)});
 await wait(()=>document.querySelector('.cp-today'));__sr.midi.simulateDevices(['Synthetic review piano']);
 await new Promise((resolve,reject)=>{const q=indexedDB.open('spino-local-media');q.onsuccess=()=>{const db=q.result,tx=db.transaction(['meta','recordings'],'readwrite');const identity=tx.objectStore('meta').get('installation');identity.onsuccess=()=>tx.objectStore('recordings').put({id:'midi-review-demo',installation:identity.result,workId:'',title:'MIDI · Piano demo',kind:'midi',draft:false,createdAt:new Date().toISOString(),durationMs:4500,blob:new Blob([Uint8Array.from(atob('${base64}'),c=>c.charCodeAt(0))],{type:'audio/midi'})});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});
 document.querySelector('.cp-nav [data-action=piano]').click();document.querySelector('[data-action=multimedia]').click();
 </script>`);
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.mp3':'audio/mpeg','.png':'image/png','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}}).listen(5408,'127.0.0.1',()=>console.log('Synthetic MIDI browser review: http://127.0.0.1:5408/'));
