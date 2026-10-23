// Immutable recording copies, scoped to the connected account and notebook.
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const DRIVE_CHUNK = 256 * 1024;
export const MEDIA_LIMIT = 250 * 1024 * 1024;
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const fields = 'id,name,mimeType,size,sha256Checksum,appProperties,trashed';
const fail = (message, code) => Object.assign(new Error(message), {code});
const id = value => typeof value === 'string' && /^[\w-]{1,160}$/.test(value);
const checksum = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
// MediaRecorder and HTTP servers may serialize codec parameters differently.
// Keep the supported containers bounded, including quoted codec lists (RFC 6381).
const mime = value => value === 'audio/midi' || typeof value === 'string' && /^(audio|video)\/(webm|mp4|wav|ogg)(?:[ \t]*;[ \t]*[\w-]+=(?:[\w.,-]+|"[\w., -]+"))*[ \t]*$/i.test(value);
const mediaType = value => value.split(';',1)[0].trim().toLowerCase();
export const mediaHash = async blob => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('');
export function driveURL(value) {
  const url = new URL(value);
  if(url.origin !== 'https://www.googleapis.com' || url.username || url.password || url.hash || !/^\/(?:upload\/)?drive\/v3\//.test(url.pathname)) throw fail('Invalid Drive endpoint.', 'INVALID_URL');
  return url.href;
}
export const recordingChecksum = file => file.sha256Checksum || file.appProperties.sha256;
export function validateRemote(file, notebookId) {
  const p=file?.appProperties;
  const invalid=message=>{throw fail(message,'INVALID_MEDIA');};
  if(!id(file?.id)||file.trashed)invalid('The Drive recording is unavailable. Local files are kept.');
  if(!p||p.notebookId!==notebookId)invalid('The Drive recording belongs to a different notebook. Local files are kept.');
  if(!id(p.takeId))invalid('The Drive recording has no valid recording identity. Local files are kept.');
  if(!((p.spinoMedia==='spino-media-v1'&&id(p.workId))||(p.spinoMedia==='spino-media-free-v1'&&p.workId==='')))invalid('The Drive recording has an invalid piece association. Local files are kept.');
  if(!checksum(p.sha256))invalid('The Drive recording has no valid checksum. Local files are kept.');
  if(!mime(file.mimeType))invalid('The Drive recording format is not supported. Local files are kept.');
  if(!Number.isSafeInteger(Number(file.size))||Number(file.size)<=0||Number(file.size)>MEDIA_LIMIT)invalid('The Drive recording is empty or exceeds 250 MB. Local files are kept.');
  if(file.sha256Checksum!=null&&file.sha256Checksum!==p.sha256)invalid('The Drive recording checksum does not match. Local files are kept.');
  return {...file,mimeType:mediaType(file.mimeType)};
}
export function createDriveMedia({request, state, accountId, notebookId, downloadFile,hashBlob=mediaHash,readChunk=(blob,start,end)=>blob.slice(start,end)}) {
  if(!id(accountId)||!id(notebookId))throw fail('Connect a Drive account and notebook first.','NOT_CONNECTED');
  // The account and notebook are immutable for this client. Reconnection creates a new client.
  const scoped = (url, options={}) => request({...options,url:driveURL(url),accountId});
  const key = takeId => `media1.${accountId}.${notebookId}.${takeId}`;
  const expect = (r, codes=[200]) => { if(!codes.includes(r.status))throw fail(r.status===401?'Reconnect Google Drive.':r.status===403?'Drive permission or storage quota prevents this operation.':`Drive transfer failed (${r.status}).`,String(r.status));return r; };
  const verifyUploaded = async file => {
    // Drive's SHA-256 metadata is optional. Verify actual bytes when it is absent.
    if(!file.sha256Checksum){const result=await downloadContent(file);try{if(!result.verified&&await mediaHash(result.blob)!==recordingChecksum(file))throw fail('Uploaded recording checksum differs.','INTEGRITY');}finally{await result.cleanup?.();}}
    return file;
  };
  const metadata = async fileId => {const r=expect(await scoped(`${API}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`));return validateRemote(r.json,notebookId);};
  async function upload({takeId,workId,title,blob,onProgress=()=>{},signal,createdAt=new Date().toISOString(),durationMs=0}) {
    if(!id(takeId)||!(workId===''||id(workId))||!(blob instanceof Blob)||!blob.size||blob.size>MEDIA_LIMIT||!mime(blob.type)||typeof title!=='string'||title.length>200||!Number.isFinite(durationMs)||durationMs<0||!Number.isFinite(Date.parse(createdAt)))throw fail('Invalid local recording.','INVALID_MEDIA');
    const aborted=()=>{if(signal?.aborted)throw fail('Transfer paused. Its progress is retained.','ABORTED');};
    aborted();const hash=await hashBlob(blob);aborted();if(!checksum(hash))throw fail('Invalid local recording checksum.','INTEGRITY');
    let saved=await state.get(key(takeId));
    if(saved&&(saved.sha256!==hash||saved.size!==blob.size))throw fail('This take already refers to different recording bytes.','IDENTITY_CONFLICT');
    if(!saved){
      const generated=expect(await scoped(`${API}/files/generateIds?count=1&space=drive`)).json?.ids?.[0];
      if(!id(generated))throw fail('Drive did not return a recording ID.','INVALID_RESPONSE');
      saved={fileId:generated,sha256:hash,size:blob.size};await state.set(key(takeId),saved);
    }
    // Check the preallocated ID first: a completed final PUT may have lost its response.
    const existing=await scoped(`${API}/files/${encodeURIComponent(saved.fileId)}?fields=${encodeURIComponent(fields)}`);
    if(existing.status===200){const found=validateRemote(existing.json,notebookId);if(found.appProperties.takeId!==takeId||recordingChecksum(found)!==hash)throw fail('Recording identity conflict.','IDENTITY_CONFLICT');return verifyUploaded(found);}
    expect(existing,[404]);aborted();
    const start=async()=>{
      const properties={spinoMedia:workId===''?'spino-media-free-v1':'spino-media-v1',notebookId,takeId,workId,sha256:hash,createdAt,durationMs:String(Math.max(0,Math.round(durationMs)))};
      const type=mediaType(blob.type);
      const r=expect(await scoped(`${UPLOAD}?uploadType=resumable&fields=${encodeURIComponent(fields)}`,{method:'POST',headers:{'X-Upload-Content-Type':type,'X-Upload-Content-Length':String(blob.size)},json:{id:saved.fileId,name:title,mimeType:type,appProperties:properties}}),[200,201]);
      saved.session=driveURL(r.headers?.location);await state.set(key(takeId),saved);
    };
    if(!saved.session)await start();
    let offset=0;
    const probe=await scoped(saved.session,{method:'PUT',headers:{'Content-Range':`bytes */${blob.size}`}});
    if(probe.status===200||probe.status===201){const found=await metadata(saved.fileId);if(recordingChecksum(found)!==hash)throw fail('Uploaded recording checksum differs.','INTEGRITY');return verifyUploaded(found);}
    if(probe.status===404||probe.status===410)await start();
    else {expect(probe,[308]);offset=confirmed(probe,blob.size);}
    onProgress(offset,blob.size);
    while(offset<blob.size){
      aborted();const end=Math.min(blob.size,offset+DRIVE_CHUNK);
      const r=await scoped(saved.session,{method:'PUT',headers:{'Content-Type':mediaType(blob.type),'Content-Range':`bytes ${offset}-${end-1}/${blob.size}`},body:await readChunk(blob,offset,end)});
      if(r.status===200||r.status===201){const found=await metadata(saved.fileId);if(recordingChecksum(found)!==hash||found.appProperties.takeId!==takeId)throw fail('Uploaded recording checksum differs.','INTEGRITY');onProgress(blob.size,blob.size);return verifyUploaded(found);}
      expect(r,[308]);const next=confirmed(r,blob.size);if(next<=offset||next>end)throw fail('Drive returned an invalid upload offset.','INVALID_RESPONSE');offset=next;onProgress(offset,blob.size);
    }
    throw fail('Drive has not confirmed the completed upload. Retry to verify it.','INCOMPLETE');
  }
  async function list({onInvalid}={}){
    let page='',files=[],count=0;
    do {
      const q=`trashed = false and (appProperties has { key='spinoMedia' and value='spino-media-v1' } or appProperties has { key='spinoMedia' and value='spino-media-free-v1' }) and appProperties has { key='notebookId' and value='${notebookId}' }`;
      const r=expect(await scoped(`${API}/files?q=${encodeURIComponent(q)}&pageSize=100&fields=${encodeURIComponent(`nextPageToken,files(${fields})`)}${page?'&pageToken='+encodeURIComponent(page):''}`));
      if(!Array.isArray(r.json?.files))throw fail('Invalid Drive recording list.','INVALID_RESPONSE');
      for(const file of r.json.files){
        try{files.push(validateRemote(file,notebookId));}
        catch(error){if(error.code!=='INVALID_MEDIA'||!onInvalid)throw error;onInvalid(file,error);}
      }
      page=r.json.nextPageToken||'';count+=r.json.files.length;
      if(count>10000)throw fail('Recording list exceeds the supported limit.','LIMIT');
    }while(page);
    return files;
  }
  async function downloadContent(file){
    const fileId=file.id;
    if(downloadFile)return downloadFile({fileId,accountId,notebookId,bytes:Number(file.size),sha256:recordingChecksum(file),mimeType:file.mimeType});
    const chunks=[];for(let offset=0;offset<Number(file.size);offset+=DRIVE_CHUNK){
      const end=Math.min(Number(file.size)-1,offset+DRIVE_CHUNK-1);
      const r=expect(await scoped(`${API}/files/${encodeURIComponent(fileId)}?alt=media`,{headers:{Range:`bytes=${offset}-${end}`},binary:true}),[206,200]);
      if(!(r.body instanceof Uint8Array)||r.body.length!==end-offset+1||(r.status===200&&Number(file.size)>DRIVE_CHUNK))throw fail('Drive returned incomplete recording bytes.','INTEGRITY');chunks.push(r.body);
    }
    const blob=new Blob(chunks,{type:file.mimeType});if(await mediaHash(blob)!==recordingChecksum(file))throw fail('Downloaded recording checksum differs.','INTEGRITY');return {blob};
  }
  async function download(fileId){if(!id(fileId))throw fail('Invalid recording ID.','INVALID_MEDIA');return downloadContent(await metadata(fileId));}
  async function repairFormat({fileId,takeId,workId,blob,signal}) {
    if(!id(fileId)||!(blob instanceof Blob)||!mime(blob.type))throw fail('Invalid local recording.','INVALID_MEDIA');
    const check=()=>{if(signal?.aborted)throw fail('Transfer paused. Its progress is retained.','ABORTED');};
    check();
    const response=expect(await scoped(`${API}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`));
    // Only the MIME label may change; all identity and integrity checks still apply.
    const file=validateRemote({...response.json,mimeType:mediaType(blob.type)},notebookId);
    if(file.appProperties.takeId!==takeId||file.appProperties.workId!==workId||Number(file.size)!==blob.size||await hashBlob(blob)!==recordingChecksum(file))throw fail('Recording identity conflict.','IDENTITY_CONFLICT');
    const downloaded=await downloadContent(file);
    try{if(!downloaded.verified&&await mediaHash(downloaded.blob)!==recordingChecksum(file))throw fail('Downloaded recording checksum differs.','INTEGRITY');}
    finally{await downloaded.cleanup?.();}
    check();
    expect(await scoped(`${API}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`,{method:'PATCH',json:{mimeType:file.mimeType}}));
    return metadata(fileId);
  }
  return {upload,list,download,repairFormat};
}
function confirmed(response,size){
  const range=response.headers?.range;if(!range)return 0;
  const match=/^bytes=0-(\d+)$/.exec(range);const offset=match?Number(match[1])+1:NaN;
  if(!Number.isSafeInteger(offset)||offset<1||offset>size)throw fail('Drive returned an invalid upload offset.','INVALID_RESPONSE');return offset;
}
