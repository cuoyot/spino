import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve('dist'),evidence='docs/quality-review/captures/progress/2026-10-16-beta15-rhythm';
const fixture=JSON.parse(await readFile(evidence+'/fixture.json','utf8'));
const records=JSON.parse(await readFile(evidence+'/recordings.json','utf8'));
const source=await readFile('src/companion/media-store.js','utf8');
const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const server=createServer(async(req,res)=>{
 try {
  const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  let body=await readFile(path);
  if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
window.__SPINO_DISABLE_TOUR=true;
let synthetic=false;
await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite'),state=tx.objectStore('state');state.get('current').onsuccess=e=>{if(!e.target.result){state.put(${safe(fixture)},'current');synthetic=true}};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});
// Seed media only when this origin's notebook was created by this review.
if(synthetic){
 const sourceURL=URL.createObjectURL(new Blob([${safe(source)}],{type:'text/javascript'})),{openMediaStore}=await import(sourceURL);URL.revokeObjectURL(sourceURL);const media=await openMediaStore();
 const count=44100,buffer=new ArrayBuffer(44+count*2),v=new DataView(buffer),text=(offset,value)=>[...value].forEach((c,i)=>v.setUint8(offset+i,c.charCodeAt(0)));
 text(0,'RIFF');v.setUint32(4,36+count*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,44100,true);v.setUint32(28,88200,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,count*2,true);for(let i=0;i<count;i++)v.setInt16(44+i*2,Math.sin(i*2*Math.PI*440/44100)*1200,true);
 const audio=new Blob([buffer],{type:'audio/wav'});
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle='#174da6';ctx.fillRect(0,0,320,180);ctx.fillStyle='white';ctx.font='18px sans-serif';ctx.fillText('Synthetic practice recording',24,90);
 const stream=canvas.captureStream(10),recorder=new MediaRecorder(stream,{mimeType:'video/webm'}),chunks=[];recorder.ondataavailable=e=>chunks.push(e.data);const stopped=new Promise(resolve=>recorder.onstop=resolve);recorder.start();await new Promise(resolve=>setTimeout(resolve,1000));recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());const video=new Blob(chunks,{type:'video/webm'});
 for(const record of ${safe(records)})await media.put({...record,blob:record.kind==='audio'?audio:video});media.close();
}
const observer=new MutationObserver(openProgress);
function openProgress(){const button=document.querySelector('.cp-nav [data-action=progress]');if(button){observer.disconnect();button.click();document.querySelector('.cp-progress-highlights')?.scrollIntoView({block:'center'});document.title='SPino — synthetic rhythm & recordings review'}}
observer.observe(document.body,{childList:true,subtree:true});await import(${safe(src)});openProgress();
</script>`);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch(error){console.error(error.message);res.writeHead(404).end();}
});
server.listen(Number(process.env.RHYTHM_PORT||5201),'127.0.0.1',()=>console.log('Synthetic rhythm review: http://127.0.0.1:'+(process.env.RHYTHM_PORT||5201)+'/'));
