// Presentation summaries never contain score bytes or complete notebook snapshots.
const decode=value=>{try{return decodeURIComponent(value);}catch{return value;}};
function logicalPath(path,encoded=false) {
  const parts=path.split('/').filter(Boolean);
  if(parts[0]==='header')return parts.slice(1);
  if(parts[0]==='preference')return ['data','preferences',decode(parts[1]),...parts.slice(2)];
  if(parts[0]==='asset')return ['assets',decode(parts[1]),...parts.slice(2)];
  if(parts[0]==='execution')return ['library','executions',decode(parts[1]),...parts.slice(2)];
  if(encoded&&parts[0]==='data'&&parts[2])parts[2]=decode(parts[2]);
  return parts;
}
const at=(value,path)=>path.reduce((item,key)=>Array.isArray(item)?item.find(row=>row?.id===key||row?.catalogId===key):item&&Object.hasOwn(item,key)?item[key]:undefined,value);
function preview(value,field,notebook) {
  if(value===undefined)return {kind:'removed'};
  if(value===null||value==='')return {kind:'empty'};
  if(field==='sessionId'){
    const session=notebook.data?.sessions?.find(s=>s.id===value);
    return session?{kind:'practice',title:session.title,date:session.date,elapsedMs:session.elapsedMs}:{kind:'details'};
  }
  if(field==='elapsedMs'&&typeof value==='number')return {kind:'duration',elapsedMs:value};
  if(typeof value==='object')return value.title?{kind:'text',text:value.title.slice(0,240)}:{kind:'details'};
  if(typeof value==='boolean')return {kind:value?'yes':'no'};
  return {kind:'text',text:String(value).startsWith('data:image/')?'':String(value).slice(0,240)};
}
export function notebookConflictReview(local,remote,merged,conflicts,remoteConflicts=[]) {
  const encoded=new Set(remoteConflicts),canonical=path=>logicalPath(path,encoded.has(path));
  const values=conflicts.map(path=>{
    const parts=canonical(path),group=parts[0]==='data'?parts[1]:parts[0],recordPath=parts[0]==='data'?parts.slice(0,3):parts.slice(0,2),record=at(local,recordPath)||at(remote,recordPath);
    const field=parts.length>recordPath.length?parts.at(-1):group==='preferences'?parts.at(-1):'record';
    return {path,group,title:record?.title||'',field,local:preview(at(local,parts),field,local),remote:preview(at(remote,parts),field,remote)};
  });
  const contested=new Set(conflicts.map(canonical).filter(p=>p[0]==='data'&&p[1]==='sessions').map(p=>p[2]));
  const kept=(merged.data?.sessions||[]).filter(s=>!contested.has(s.id)).slice().sort((a,b)=>String(b.startedAt||b.date||'').localeCompare(String(a.startedAt||a.date||'')));
  return {practiceCount:kept.length,practices:kept.slice(0,6).map(({id,title,date,elapsedMs})=>({id,title,date,elapsedMs})),values:values.slice(0,50)};
}
export function notebookConflictValues(local,remote,conflicts,remoteConflicts=[]) {
  const encoded=new Set(remoteConflicts),value=item=>item===undefined?{absent:true}:{value:item};
  return [...conflicts].sort().map(path=>{const parts=logicalPath(path,encoded.has(path));return {path,local:value(at(local,parts)),remote:value(at(remote,parts))};});
}
