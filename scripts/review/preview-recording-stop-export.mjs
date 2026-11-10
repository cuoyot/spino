// Disposable browser review: synthetic video/PDF, no camera or personal notebook access.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {emptyData,block,beginSession} from '../../src/companion/model.js';
import {scorePDF} from '../../tests/pdf-fixture.js';
import {syntheticCameraSource} from '../../tests/fixtures/camera-controls.js';
const root=resolve('dist'),port=Number(process.env.SPINO_RECORDING_REVIEW_PORT||5342),fixture=emptyData();
Object.assign(fixture.preferences,{language:'es',theme:'light'});
fixture.works=[{id:'review-recording-work',title:'Synthetic practice score',composer:'Review composer',onStand:true,stage:'En estudio',notes:'Disposable review',passage:'',target:null,bpm:60,assetId:'review-recording-pdf'}];
fixture.active=beginSession({title:'Synthetic repertoire practice',context:'piano',blocks:[block('repertoire',{workId:fixture.works[0].id,minutes:40})]});
const asset={id:'review-recording-pdf',name:'Synthetic review.pdf',type:'application/pdf',base64:scorePDF(),annotations:{version:1,marks:[]}};
const take={id:'review-export-video',workId:fixture.works[0].id,workTitle:fixture.works[0].title,title:'Synthetic video take',createdAt:new Date().toISOString(),durationMs:3000,kind:'video',draft:false,installation:'review-recording-installation'};
const base64=(await readFile('tests/fixtures/media/bookends-portrait.webm')).toString('base64');
const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const injection=`
window.__SPINO_DISABLE_TOUR=true;
const originalOpen=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>originalOpen('spino-recording-review-20261110-'+name,...args);
const reviewMode=new URL(location.href).searchParams.get('review'),exporting=['export','share'].includes(reviewMode);
if(reviewMode==='share'){Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});Object.defineProperty(navigator,'share',{configurable:true,value:()=>new Promise(()=>{})});}
const fixture=${safe(fixture)};if(exporting)fixture.active=null;
await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'});};q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(fixture,'current');tx.objectStore('assets').put(${safe(asset)});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
await new Promise((resolve,reject)=>{const q=indexedDB.open('spino-local-media',1);q.onupgradeneeded=()=>{q.result.createObjectStore('meta');q.result.createObjectStore('recordings',{keyPath:'id'});};q.onsuccess=()=>{const db=q.result,tx=db.transaction(['meta','recordings'],'readwrite');tx.objectStore('meta').put('review-recording-installation','installation');tx.objectStore('recordings').put({...${safe(take)},blob:new Blob([Uint8Array.from(atob(${safe(base64)}),c=>c.charCodeAt(0))],{type:'video/webm'})});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
localStorage.setItem('spino.release-notice.v1','6.2.2-beta.3');
${syntheticCameraSource}
`;
createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
 let body=await readFile(path);
 if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">${injection}
 await import(${safe(src)});
 const wait=fn=>new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{const result=fn();if(result){clearInterval(timer);resolve(result);}else if(++n>800){clearInterval(timer);reject(Error('Review setup timeout'));}},20);});
 await wait(()=>document.querySelector('.cp-today'));
 if(exporting){document.querySelector('.cp-nav [data-action=piano]').click();document.querySelector('[data-action=multimedia]').click();
 if(reviewMode==='share'){(await wait(()=>document.querySelector('[data-action=media-play]'))).click();await wait(()=>document.querySelector('#cp-media-capture video')?.readyState>=2);document.querySelector('[data-media=share]').click();(await wait(()=>document.querySelector('[data-export-choice=original]'))).click();}
 else (await wait(()=>document.querySelector('[data-action=media-share]'))).click();}
 else {document.querySelector('[data-action=resume-session]').click();(await wait(()=>document.querySelector('[data-action=open-score-practice]'))).click();await wait(()=>document.querySelector('.pdf-paper')?.getAttribute('aria-busy')==='false');document.querySelector('[data-pdf=record]').click();document.querySelector('[data-media=video]').click();(await wait(()=>document.querySelector('[data-media=start-video]:not(:disabled)'))).click();}
 document.title='SPino · synthetic recording review';
 </script>`);
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
}catch{res.writeHead(404).end();}}).listen(port,'127.0.0.1',()=>console.log('Synthetic recording review: http://127.0.0.1:'+port+'/ · ?review=export'));
