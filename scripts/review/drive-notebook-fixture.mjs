import {syntheticDrive} from '../../src/companion/drive-media-fixture.js';
import {mediaHash} from '../../src/companion/drive-media.js';
import {cloudRecoveryBootstrap} from './cloud-recovery-fixture.mjs';
import {syntheticNotebookDrive} from '../../tests/fixtures/drive/notebook-server.js';
export function driveNotebookBootstrap({legacy=false,remote=null,localMedia=null,remoteMedia=null,language='es',network={type:'wifi',saveData:false}}={}){
 const seed=cloudRecoveryBootstrap(language==='ca'?'catalan':'ok').replace('window.__cloudReview=',`fixture.data.preferences.language=${JSON.stringify(language)};window.__cloudReview=`);
 return (legacy?seed:seed.replace('linked:true','linked:false'))+`\n{
  const server=(${syntheticNotebookDrive.toString()})();
  const saved=sessionStorage.getItem('synthetic-drive-files');
  if(saved){server.files=new Map(JSON.parse(saved));const progress=JSON.parse(sessionStorage.getItem('synthetic-drive-progress')||'null');if(progress){server.changes=progress.changes;server.nextID=progress.nextID;}else server.nextID=1+server.files.size;}
  else if(${JSON.stringify(remote)}){const remote=${JSON.stringify(remote)};server.files.set('synthetic-existing-drive',{id:'synthetic-existing-drive',owner:'synthetic-owner',name:'Synthetic Drive notebook.json',mimeType:'application/json',appProperties:{spinoType:'spino-notebook-v1',notebookId:remote.cloudBackup.sharedNotebookId,ready:'1'},text:JSON.stringify(remote),revision:1});}
  const persist=()=>{sessionStorage.setItem('synthetic-drive-files',JSON.stringify([...server.files]));sessionStorage.setItem('synthetic-drive-progress',JSON.stringify({changes:server.changes,nextID:server.nextID}));};persist();
  window.__driveFixture=server;
  Object.defineProperty(navigator,'connection',{configurable:true,value:${JSON.stringify(network)}});
  const DRIVE_CHUNK=262144,mediaHash=(${mediaHash.toString()});
  const mediaServer=(${syntheticDrive.toString()})(),staging=new Map(),sources=new Map(),progress=new Map();window.__mediaFixture=mediaServer;
  const fromBase64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),toBase64=b=>btoa(Array.from(b,v=>String.fromCharCode(v)).join(''));
  const mediaReady=(async()=>{
    if(${JSON.stringify(remoteMedia)}){const r=${JSON.stringify(remoteMedia)},blob=new Blob([fromBase64(r.base64)],{type:r.kind+'/webm'}),sha256=await mediaHash(blob);mediaServer.files.set('synthetic-remote-take',{id:'synthetic-remote-take',name:r.title,mimeType:blob.type,size:String(blob.size),sha256Checksum:sha256,blob,accountId:'synthetic-owner',appProperties:{spinoMedia:'spino-media-v1',notebookId:${JSON.stringify(remote?.cloudBackup?.sharedNotebookId||'713f8775-9831-4e98-957e-d53ad5ff8807')},takeId:r.id,workId:r.workId,sha256,createdAt:r.createdAt,durationMs:String(r.durationMs)}});}
  })();
  const previousReady=window.__cloudReady;window.__cloudReady=(async()=>{await previousReady;await mediaReady;if(${JSON.stringify(localMedia)}&&!sessionStorage.getItem('synthetic-media-seeded')){const r=${JSON.stringify(localMedia)};await new Promise((resolve,reject)=>{const q=indexedDB.open('spino-local-media',1);q.onupgradeneeded=()=>{q.result.createObjectStore('meta');q.result.createObjectStore('recordings',{keyPath:'id'});};q.onsuccess=()=>{const db=q.result,tx=db.transaction(['meta','recordings'],'readwrite');tx.objectStore('meta').put('synthetic-installation','installation');const {base64,...record}=r;tx.objectStore('recordings').put({...record,installation:'synthetic-installation',blob:new Blob([fromBase64(base64)],{type:r.kind+'/webm'})});tx.oncomplete=()=>{db.close();sessionStorage.setItem('synthetic-media-seeded','1');resolve();};tx.onerror=()=>reject(tx.error);};});}})();
  const drive=server.native(),legacy=window.Capacitor.nativePromise;
  window.Capacitor.PluginHeaders.push({name:'DriveMedia',methods:['useNotebookAccount','pause','stageChunk','request','readState','writeState','download','release'].map(name=>({name,rtype:'promise'}))});
  const mediaNative=async(method,args={})=>{await mediaReady;if(method==='useNotebookAccount'){window.__mediaWifiOnly=args.wifiOnly;return {};}if(method==='pause'||method==='release')return {};if(method==='readState')return {value:progress.get(args.key)};if(method==='writeState'){progress.set(args.key,args.value);return {};}
    if(method==='stageChunk'){const bytes=staging.get(args.key)||[];bytes.push(fromBase64(args.base64));staging.set(args.key,bytes);const blob=new Blob(bytes);if(blob.size===args.total){const sha256=await mediaHash(blob);sources.set(sha256,blob);staging.delete(args.key);return {bytes:blob.size,sha256};}return {bytes:blob.size};}
    if(method==='request'){const response=await mediaServer.request({...args,...(args.fileKey?{body:sources.get(args.fileKey).slice(args.offset,args.offset+args.length)}:{})});return response;}
    if(method==='download'){const f=mediaServer.files.get(args.fileId);return {path:'data:'+f.mimeType+';base64,'+toBase64(new Uint8Array(await f.blob.arrayBuffer())),sha256:f.sha256Checksum,bytes:Number(f.size)};}
    throw Error('Unsupported synthetic media method');
  };
  window.Capacitor.PluginHeaders.push({name:'DriveNotebook',methods:['status','connect','request','disconnect'].map(name=>({name,rtype:'promise'}))});
  window.Capacitor.nativePromise=async(plugin,method,args)=>{if(plugin==='DriveMedia')return mediaNative(method,args);if(plugin!=='DriveNotebook')return legacy(plugin,method,args);try{if(window.__driveStall&&method==='request')await new Promise(resolve=>window.__releaseDrive=resolve);return await drive[method](args);}finally{persist();}};
 }`;
}
