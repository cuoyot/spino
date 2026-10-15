import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {scorePDF} from '../../tests/pdf-fixture.js';
const root=resolve('dist');
const fixture=JSON.parse(await readFile('docs/quality-review/captures/multimedia/2026-10-15-local-01/notebook.fixture.json','utf8'));
fixture.preferences.language='es';
fixture.works[0].assetId='synthetic-media-pdf';
const pdfAsset={id:'synthetic-media-pdf',name:'Synthetic practice score.pdf',type:'application/pdf',base64:scorePDF(),annotations:{version:1,marks:[]}};
const storeSource=await readFile('src/companion/media-store.js','utf8');
const server=createServer(async(req,res)=>{
 try {
  const pathname=new URL(req.url,'http://localhost').pathname;
  const path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  let body=await readFile(path);
  if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
window.__SPINO_DISABLE_TOUR=true;
// This dedicated review origin seeds only a previously empty notebook.
await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite'),state=tx.objectStore('state'),get=state.get('current');get.onsuccess=()=>{if(!get.result){state.put(${JSON.stringify(fixture).replaceAll('<','\\u003c')},'current');tx.objectStore('assets').put(${JSON.stringify(pdfAsset).replaceAll('<','\\u003c')})}};tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error)}});
const sourceURL=URL.createObjectURL(new Blob([${JSON.stringify(storeSource).replaceAll('<','\\u003c')}],{type:'text/javascript'}));
const {openMediaStore}=await import(sourceURL);URL.revokeObjectURL(sourceURL);
const media=await openMediaStore();
if(!(await media.index()).length){
 const count=44100*2,buffer=new ArrayBuffer(44+count*2),v=new DataView(buffer),text=(offset,value)=>[...value].forEach((c,i)=>v.setUint8(offset+i,c.charCodeAt(0)));
 text(0,'RIFF');v.setUint32(4,36+count*2,true);text(8,'WAVE');text(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,44100,true);v.setUint32(28,88200,true);v.setUint16(32,2,true);v.setUint16(34,16,true);text(36,'data');v.setUint32(40,count*2,true);
 for(let i=0;i<count;i++)v.setInt16(44+i*2,Math.sin(i*2*Math.PI*440/44100)*1600*Math.sin(Math.PI*i/count),true);
 await media.put({id:'synthetic-audio-preview',workId:'media-work-a',workTitle:'Synthetic étude',title:'Synthetic audio — first take',kind:'audio',createdAt:new Date().toISOString(),durationMs:2000,draft:false,blob:new Blob([buffer],{type:'audio/wav'})});
}
media.close();
const observer=new MutationObserver(openMedia);
function openMedia(){const library=document.querySelector('.cp-nav [data-action=piano]');if(library){observer.disconnect();if(new URL(location.href).searchParams.get('review')==='pdf'){const resume=document.querySelector('[data-action=resume-session]');if(resume){resume.click();document.querySelector('[data-action=open-score-practice]')?.click();}}else{library.click();document.querySelector('[data-action=multimedia]').click();}document.title='SPino — synthetic multimedia review'}}
observer.observe(document.body,{childList:true,subtree:true});
await import(${JSON.stringify(src)});openMedia();
</script>`);
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
 }catch(error){console.error(error.message);res.writeHead(404).end();}
});
const port=Number(process.env.SPINO_MEDIA_PREVIEW_PORT||5193);
server.listen(port,'127.0.0.1',()=>console.log(`Synthetic multimedia review: http://127.0.0.1:${port}/`));
