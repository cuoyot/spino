async function pdfViewerChunk() {
  const names = (await readdir('dist/assets')).filter(name => /^pdf-viewer-.*\.js$/.test(name));
  for (const name of names) if (/\bas openScore\b/.test(await readFile(`dist/assets/${name}`, 'utf8'))) return name;
  throw new Error('The built PDF viewer export was not found.');
}
// Read-only app smoke check plus PDF rendering/gestures. Test annotations stay in memory.
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const adb = join(process.env.USERPROFILE, 'Android', 'sdk', 'platform-tools', 'adb.exe');
const run = args => execFileSync(adb, args, { encoding: 'utf8', windowsHide: true }).trim();
function twoPagePDF() {
  const stream = label => { const text = `BT /F1 24 Tf 60 700 Td (${label}) Tj ET`; return `<< /Length ${text.length} >>\nstream\n${text}\nendstream`; };
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', stream('Page one'), stream('Page two')];
  let pdf='%PDF-1.4\n';const offsets=[0];
  for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
  const start=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf).toString('base64');
}
const pid = run(['shell', 'pidof', 'com.miguelcoll.sightreader']);
assert.match(pid, /^\d+$/);
const port = run(['forward', 'tcp:0', `localabstract:webview_devtools_remote_${pid}`]);
let socket;
try {
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map(); let id = 0; const errors = [];
  socket.onmessage = ({data}) => {
    const message = JSON.parse(data);
    if(message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if(!message.id)return;
    const task = pending.get(message.id);pending.delete(message.id);
    if(message.error)task.reject(Error(JSON.stringify(message.error)));else task.resolve(message.result);
  };
  const call = (method,params={}) => new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
  const evaluate = async expression => {const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,timeout:45000});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value;};
  await call('Runtime.enable');
  const boot = await evaluate(`({title:document.title,home:document.querySelector('#app-shell h1')?.textContent==='Hoy',native:Capacitor.isNativePlatform(),navigation:[...document.querySelectorAll('.cp-nav button')].map(b=>b.textContent.trim())})`);
  assert.equal(boot.title,'SPino: Smart Piano Notebook');assert.ok(boot.home && boot.native);assert.deepEqual(boot.navigation,['Hoy','Calendario','Mi piano']);
  const branding = await evaluate(`({label:document.querySelector('.cp-brand')?.getAttribute('aria-label'),logoLoaded:document.querySelector('.cp-mark')?.complete&&document.querySelector('.cp-mark')?.naturalWidth===128})`);
  assert.equal(branding.label,'SPino: Smart Piano Notebook');assert.ok(branding.logoLoaded);
  await mkdir('artifacts/emulator',{recursive:true});
  await writeFile('artifacts/emulator/home.png',execFileSync(adb,['exec-out','screencap','-p'],{windowsHide:true}));
  await evaluate(`document.querySelector('[data-action="calendar"]').click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.cp-agenda-day').length`),14);
  await writeFile('artifacts/emulator/calendar.png',execFileSync(adb,['exec-out','screencap','-p'],{windowsHide:true}));
  await evaluate(`document.querySelector('[data-action="weekly-planner"]').click()`);
  assert.ok(await evaluate(`!!document.querySelector('#weekly-plan-form .cp-planner-preview')`));
  await writeFile('artifacts/emulator/planner.png',execFileSync(adb,['exec-out','screencap','-p'],{windowsHide:true}));
  await evaluate(`document.querySelector('[data-action="home"]').click()`);
  const network = await evaluate(`Capacitor.Plugins.Notebook.networkStatus()`);
  const file = await evaluate(`(async()=>{const progress=[];const listener=await Capacitor.Plugins.Notebook.addListener('downloadProgress',p=>progress.push(p.loaded));try{const r=await Capacitor.Plugins.Notebook.downloadPDF({id:'smoke-check',wifiOnly:true,url:'https://www.mutopiaproject.org/ftp/BachJS/BWVAnh114/anna-magdalena-04/anna-magdalena-04-a4.pdf'});window.smokePDF=r.base64;return {pdf:r.base64.startsWith('JVBERi0'),bytes:atob(r.base64).length,progressEvents:progress.length};}finally{await listener.remove();}})()`);
  assert.ok(file.pdf && file.bytes>1000);
  assert.ok(file.progressEvents>0);
  const permission = await evaluate(`Capacitor.Plugins.Notebook.checkPermissions()`);
  const bundled = await readdir('dist/assets');
  const pdfModule = await pdfViewerChunk();
  const pdfStyle = bundled.find(name => /^pdf-viewer-.*\.css$/.test(name));
  // Direct diagnostic imports bypass Vite's normal lazy CSS preloader.
  await evaluate(`new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href='/assets/${pdfStyle}';link.onload=()=>resolve(true);link.onerror=()=>reject(Error('PDF styles did not load'));document.head.append(link);})`);
  await evaluate(`(async()=>{window.scoreModule=await import('/assets/${pdfModule}');window.smokeScore=await scoreModule.openScore({asset:{name:'Minueto.pdf',base64:window.smokePDF},save:async marks=>{window.smokeMarks=marks;}});})()`);
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.querySelector('.pdf-paper').getAttribute('aria-busy')==='false'){clearInterval(timer);resolve(true);}else if(++n>200){clearInterval(timer);reject(Error(document.querySelector('.pdf-save-state').textContent));}},30);})`);
  assert.ok(await evaluate(`(()=>{const r=document.querySelector('.pdf-viewer').getBoundingClientRect();return Math.abs(r.width-innerWidth)<2&&Math.abs(r.height-innerHeight)<2;})()`),'PDF editor fills the available WebView');
  await writeFile('artifacts/emulator/score.png',execFileSync(adb,['exec-out','screencap','-p'],{windowsHide:true}));
  run(['shell','input','keyevent','4']);
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(!document.querySelector('.pdf-viewer')){clearInterval(timer);resolve(true);}else if(++n>100){clearInterval(timer);reject(Error('Android back did not close the PDF'));}},30);})`);
  await evaluate(`(async()=>{window.smokeScore=await scoreModule.openScore({asset:{name:'page-test.pdf',base64:${JSON.stringify(twoPagePDF())}},save:async marks=>{window.smokeMarks=marks;}});})()`);
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.querySelector('.pdf-paper').getAttribute('aria-busy')==='false'){clearInterval(timer);resolve(true);}else if(++n>200){clearInterval(timer);reject(Error(document.querySelector('.pdf-save-state').textContent));}},30);})`);
  const position=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return {x:r.right-3,y:r.top+r.height/2};})()`);
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...position,id:1}]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.querySelector('.pdf-page-count').textContent==='2 / 2'){clearInterval(timer);resolve(true);}else if(++n>100){clearInterval(timer);reject(Error('Margin tap did not advance the PDF'));}},30);})`);
  await evaluate(`document.querySelector('[data-pdf=tools]').click();document.querySelector('[data-tool=pen]').click()`);
  const point=await evaluate(`(()=>{const r=document.querySelector('.pdf-paper').getBoundingClientRect();return {x:r.left+r.width*.3,y:r.top+r.height*.3};})()`);
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});
  await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x+40,y:point.y+30,id:1}]});
  await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await evaluate(`window.smokeMarks?.marks.length`),1);
  assert.equal(await evaluate(`window.smokeMarks.marks[0].page`),2);
  await writeFile('artifacts/emulator/score-annotated.png',execFileSync(adb,['exec-out','screencap','-p'],{windowsHide:true}));
  run(['shell','input','keyevent','4']);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({boot,network,download:file,pdfMarginPageTurn:true,pdfAnnotation:true,pdfAndroidBack:true,notificationPermission:permission.notifications,frontendErrors:errors},null,2));
} finally {socket?.close();run(['forward','--remove',`tcp:${port}`]);}
