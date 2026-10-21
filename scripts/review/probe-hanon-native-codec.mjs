// Decode bounded static atlas candidates in the installed Android WebView without opening notebook data.
import {execFileSync} from 'node:child_process';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const folder=process.argv[2],output=process.argv[3];if(!folder||!output)throw Error('Pass candidate folder and output JSON');
const adb='/Users/migue/Library/Android/sdk/platform-tools/adb',pkg='com.miguecoll.spino.beta';
const run=args=>execFileSync(adb,args,{encoding:'utf8',timeout:15000}).trim();
const pid=run(['shell','pidof',pkg]),port=run(['forward','tcp:0','localabstract:webview_devtools_remote_'+pid]);
const pages=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);assert.ok(page);
const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let seq=0;const pending=new Map();
ws.onmessage=({data})=>{const m=JSON.parse(data);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.equal(r.exceptionDetails,undefined,JSON.stringify(r.exceptionDetails));return r.result.value};
try{
 const before=await evaluate('location.href'),userAgent=await evaluate('navigator.userAgent'),results=[];
 for(const file of (await readdir(folder)).filter(f=>f.endsWith('.avif'))){
  const bytes=await readFile(folder+'/'+file);
  const result=await evaluate(`(async()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(bytes.toString('base64'))}),c=>c.charCodeAt(0)),start=performance.now(),bitmap=await createImageBitmap(new Blob([bytes],{type:'image/avif'})),ms=performance.now()-start,canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let transparent=0,visible=0,partial=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)transparent++;else{visible++;if(pixels[i]<255)partial++;}}const result={width:bitmap.width,height:bitmap.height,decodeMs:ms,transparent,partial,visible};bitmap.close();return result})()`);
  assert.ok(result.visible>0);results.push({file,bytes:bytes.length,...result});
 }
 assert.ok(results.length>0);assert.equal(await evaluate('location.href'),before);
 await writeFile(output,JSON.stringify({date:new Date().toISOString(),kind:'Installed Android WebView createImageBitmap AVIF decode and canvas readback; no navigation or storage access',userAgent,results},null,2)+'\n');console.log(JSON.stringify({passed:results.length,userAgent,decodeMs:results.map(r=>r.decodeMs)}));
}finally{ws.close();run(['forward','--remove','tcp:'+port]);}
