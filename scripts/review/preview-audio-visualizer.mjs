import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {emptyData} from '../../src/companion/model.js';
import {syntheticAudioSource} from '../../tests/fixtures/audio-visualizer.js';

const root=resolve('dist'),port=Number(process.env.SPINO_AUDIO_PORT||5300);
const injection=theme=>{
  const fixture=emptyData();fixture.preferences.language='es';fixture.preferences.theme=theme;
  return `window.__SPINO_DISABLE_TOUR=true;
const open=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>open('spino-audio-art-review-20261018-${theme}-'+name,...args);
const storage=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k),clear:()=>storage.clear()}});
await new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'})};q.onsuccess=()=>{const db=q.result,tx=db.transaction('state','readwrite'),s=tx.objectStore('state');s.get('current').onsuccess=e=>{if(!e.target.result)s.put(${JSON.stringify(fixture)},'current')};tx.oncomplete=()=>{db.close();resolve()}}});
${syntheticAudioSource}
let opened=false;const observer=new MutationObserver(()=>{const entry=document.querySelector('[data-action=record-media]');if(entry&&!opened){opened=true;entry.click();}if(document.querySelector('[data-media=audio]'))observer.disconnect();document.title='SPino · synthetic audio animation review';});observer.observe(document.body,{childList:true,subtree:true});
setInterval(()=>{const gain=window.reviewAudioGain,context=reviewAudioContexts.at(-1);if(!gain||!context||context.state==='closed')return;const t=performance.now()/1000,phrase=(Math.sin(t*.43)+1)/2,attack=Math.pow(Math.max(0,Math.sin(t*2.2)),3);gain.gain.setTargetAtTime(.015+phrase*.2+attack*.3,context.currentTime,.06);},80);`;
};
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost'),pathname=url.pathname,path=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
    let body=await readFile(path);
    if(path.endsWith('/index.html'))body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">${injection(url.searchParams.get('theme')==='dark'?'dark':'light')}\nawait import(${JSON.stringify(src)});</script>`);
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png'})[extname(path)]||'application/octet-stream');res.end(body);
  }catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log('Synthetic audio animation review: http://127.0.0.1:'+port+'/?theme=light and ?theme=dark'));
