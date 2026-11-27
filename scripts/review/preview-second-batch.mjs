// Disposable before/after review. Application code and personal storage are not patched by this harness.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';

const before=resolve(process.env.SPINO_REVIEW_BEFORE||'/private/tmp/spino-ux-batch2-before-20261127');
const after=resolve('dist');
const fixtures=JSON.parse(await readFile(process.env.SPINO_REVIEW_FIXTURES||'docs/quality-review/captures/interface/2026-11-27-second-batch-01/fixtures.json','utf8'));
const safe=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const port=Number(process.env.SPINO_REVIEW_PORT||5382);
const beforeLabel=process.env.SPINO_REVIEW_BEFORE_LABEL||'beta131';
const reviewTitle=process.env.SPINO_REVIEW_TITLE||'Four usability priorities';
function comparison(url) {
  const screen=['duration','finish','selection','touch','progress','preferences'].includes(url.searchParams.get('screen'))?url.searchParams.get('screen'):'duration';
  const lang=['en','es','ca','de','hu'].includes(url.searchParams.get('lang'))?url.searchParams.get('lang'):'es';
  const theme=url.searchParams.get('theme')==='dark'?'dark':'light';
  const query=new URLSearchParams({ux:{duration:11,finish:13,selection:12,touch:3,progress:14,preferences:15}[screen],lang,theme});
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SPino · ${reviewTitle}</title><style>body{margin:0;background:#eef1f7;color:#263244;font:15px system-ui}header{padding:20px}h1{font-size:22px;margin:0 0 8px}a{color:inherit;margin-right:12px}main{display:flex;flex-wrap:wrap;gap:20px;padding:0 20px 24px}h2{font-size:16px}iframe{width:min(390px,calc(100vw - 42px));height:844px;border:1px solid #c7d1df;background:white}p{max-width:900px}</style><header><h1>${reviewTitle} · Before / After</h1><p>Synthetic responsive browser review; not a new beta. Reloading resets the test notebook.</p><nav>${['duration','finish','selection','touch','progress','preferences'].map(name=>`<a href="?screen=${name}&theme=${theme}&lang=${lang}">${name}</a>`).join('')}</nav><p><a href="/after/?${query}">Open current build</a><a href="?screen=${screen}&theme=${theme==='light'?'dark':'light'}&lang=${lang}">Switch theme</a></p></header><main><section><h2>Before · ${beforeLabel}</h2><iframe title="Before" src="/before/?${query}"></iframe></section><section><h2>After · current source</h2><iframe title="After" src="/after/?${query}"></iframe></section></main></html>`;
}

createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(comparison(url));return;}
  const match=url.pathname.match(/^\/(before|after)\/(.*)$/);
  if(!match){res.writeHead(404).end();return;}
  const [,version,relative]=match,root=version==='before'?before:after;
  const path=resolve(root,relative||'index.html');
  if(!path.startsWith(root+'/')){res.writeHead(403).end();return;}
  let body=await readFile(path);
  if(path.endsWith('/index.html')){
    const ux=Number(url.searchParams.get('ux'))||1;
    const fixture=structuredClone(fixtures.fixtures[url.searchParams.get('fixture')||(ux===13?'pending':'populated')]);
    fixture.preferences.language=url.searchParams.get('lang')||'es';
    fixture.preferences.theme=url.searchParams.get('theme')||'light';
    body=body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/,(_,src)=>`<script type="module">
    window.__SPINO_DISABLE_TOUR=true;
    const RealDate=Date,fixed=${Date.parse(fixtures.fixed)};window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[fixed]));}static now(){return fixed;}};
    const open=indexedDB.open.bind(indexedDB);indexedDB.open=(name,...args)=>open(${safe('ui-second-batch-20261127-'+version+'-'+ux+'-')}+name,...args);
    if(${url.searchParams.get('retain')!=='1'}) await new Promise((resolve,reject)=>{const request=indexedDB.open('cuaderno-piano',1);request.onupgradeneeded=()=>{request.result.createObjectStore('state');request.result.createObjectStore('assets',{keyPath:'id'});};request.onsuccess=()=>{const db=request.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${safe(fixture)},'current');for(const asset of ${safe(fixtures.assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});
    await import(${safe(src)});
    const wait=selector=>new Promise((resolve,reject)=>{let attempts=0;const timer=setInterval(()=>{const node=document.querySelector(selector);if(node){clearInterval(timer);resolve(node);}else if(++attempts>500){clearInterval(timer);reject(Error('Review state unavailable: '+selector));}},20);});
    const click=async selector=>(await wait(selector)).click();
    try{
      await wait('.cp-today');
      const ux=${ux};
      if(${url.searchParams.get('retain')==='1'}){}
      else if(ux===11||ux===12){await click('.cp-nav [data-action=practice]');await click('[data-action=prepare][data-id="'+(ux===11?'reading':'repertoire')+'"]');await wait('.cp-mode-choices');await click('[data-action=prepare-mode][data-id=piano]');await wait('#prepare-form');if(ux===12)await click('[data-action=prepare-browse-repertoire]');}
      else if(ux===13){await click('[data-action=resume-session]');await wait('[data-action=session-end]');await click('[data-action=session-end]');await wait('#cp-dialog form');}
      else if(ux===14){await click('.cp-nav [data-action=progress]');await click('[data-action=progress-section][data-id=repertoire]');}
      else if(ux===15){await click('.cp-app-header [data-action=settings]');await click('[data-action=profile-practice]');await wait('#preferences-form');}
      else if(ux===1||ux===4){await click('.cp-nav [data-action=practice]');await click('[data-action=prepare][data-id="'+(ux===1?'repertoire':'reading')+'"]');await wait('.cp-mode-choices');if(ux===1){await click('[data-action=prepare-mode][data-id=piano]');await wait('#prepare-form');}}
      else if(ux===2||ux===6||ux===7){await click('.cp-nav [data-action=calendar]');await wait('.cp-week-agenda');if(ux===2){await click('[data-action=calendar-mode][data-id=month]');await wait('[data-action=calendar-add]');}if(ux===7){await click('[data-action=weekly-planner]');await wait('#weekly-plan-form');}}
      else if(ux===3){await click('.cp-nav [data-action=piano]');await wait('.cp-repertoire-collection');}
      else if(ux===10){await click('.cp-nav [data-action=progress]');await wait('.cp-progress-page');}
      else if(ux===5){await click('[data-action=new-event]');await wait('#cp-dialog[open] form');}
      else if(ux===8){await click('.cp-app-header [data-action=midi-settings]');await wait(${safe(version==='before'?'#cp-toast':'.cp-page[data-view=instrument]')});}
      await document.fonts.ready;
      if(${url.searchParams.get('failSave')==='1'}){
        document.addEventListener('submit',()=>{const put=IDBObjectStore.prototype.put;let fail=true;
        IDBObjectStore.prototype.put=function(...args){if(fail&&this.name==='state'&&${ux!==13?'true':'args[0]?.active===null'}){fail=false;throw new DOMException('Synthetic save failure','QuotaExceededError');}return put.apply(this,args);};},{capture:true,once:true});
      }
      document.documentElement.dataset.reviewReady=String(ux);
      document.title='SPino · '+${safe(version)}+' · UX-'+String(ux).padStart(2,'0');
    }catch(error){document.documentElement.dataset.reviewError=error.message;console.error(error);}
    </script>`);
  }
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.pdf':'application/pdf','.wasm':'application/wasm','.mp4':'video/mp4'})[extname(path)]||'application/octet-stream');res.end(body);
}catch(error){res.writeHead(404).end(String(error));}}).listen(port,'127.0.0.1',()=>console.log('Before/after review: http://127.0.0.1:'+port+'/'));
