// Disposable fake Drive for the clearly labeled browser review and protocol tests.
import {DRIVE_CHUNK,mediaHash} from './drive-media.js';
export function syntheticDrive(){
  const files=new Map(),sessions=new Map();let count=0,interrupt=false;
  return {
    files,sessions,interruptNextChunk(){interrupt=true;},
    async request({url,method='GET',json,body,headers={},accountId}){
      const u=new URL(url),ok=(json,status=200,headers={})=>({status,json,headers});
      if(u.pathname.endsWith('/generateIds'))return ok({ids:['synthetic-'+(++count)]});
      if(u.pathname==='/upload/drive/v3/files'&&method==='POST'){
        const session='https://www.googleapis.com/upload/drive/v3/files?upload_id='+count;
        sessions.set(session,{metadata:structuredClone(json),bytes:[],size:0,total:Number(headers['X-Upload-Content-Length']),accountId});return ok({},200,{location:session});
      }
      if(u.searchParams.has('upload_id')){
        const s=sessions.get(url);if(!s||s.accountId!==accountId)return ok(null,404);
        if(headers['Content-Range']?.startsWith('bytes */')){
          if(s.size===s.total)return ok(files.get(s.metadata.id));
          return ok(null,308,s.size?{range:`bytes=0-${s.size-1}`}:{})
        }
        const bytes=new Uint8Array(await body.arrayBuffer());
        if(bytes.length>DRIVE_CHUNK||!headers['Content-Range'].startsWith('bytes '+s.size+'-'))return ok(null,400);
        s.bytes.push(bytes);s.size+=bytes.length;
        if(s.size===s.total){const blob=new Blob(s.bytes,{type:s.metadata.mimeType});files.set(s.metadata.id,{...s.metadata,size:String(blob.size),sha256Checksum:await mediaHash(blob),blob,accountId});}
        if(interrupt){interrupt=false;throw new Error('Synthetic interrupted connection after accepted chunk.');}
        return s.size===s.total?ok(files.get(s.metadata.id)):ok(null,308,{range:`bytes=0-${s.size-1}`});
      }
      if(u.pathname.endsWith('/files')){
        const q=u.searchParams.get('q'),notebook=/key='notebookId' and value='([^']+)'/.exec(q)?.[1];
        return ok({files:[...files.values()].filter(f=>f.accountId===accountId&&f.appProperties.notebookId===notebook).map(({blob,accountId,...f})=>f)});
      }
      const f=files.get(u.pathname.split('/').at(-1));if(!f||f.accountId!==accountId)return ok(null,404);
      if(u.searchParams.get('alt')==='media'){
        const [,start,end]=/^bytes=(\d+)-(\d+)$/.exec(headers.Range);
        return {status:206,body:new Uint8Array(await f.blob.slice(Number(start),Number(end)+1).arrayBuffer()),headers:{'content-range':`bytes ${start}-${end}/${f.size}`}};
      }
      const {blob,accountId:owner,...metadata}=f;return ok(metadata);
    }
  };
}
