import {stableJSON,mergeNotebooks,notebookContent} from './cloud-merge.js';

export const ATOMIC_FORMAT='spino-notebook-v2';
export const atomicFailure=(message,code='INVALID_NOTEBOOK')=>Object.assign(new Error(message),{code});
export const hashPattern=/^[a-f0-9]{64}$/;
const own=(o,k)=>Object.hasOwn(o,k);
const same=(a,b)=>stableJSON(a)===stableJSON(b);
const safeKey=k=>{try{return typeof k==='string'&&k.length<=2048&&k.split('/').every(part=>!['__proto__','prototype','constructor'].includes(decodeURIComponent(part)))&&/^(header|order\/[^/]+|data\/[^/]+\/[^/]+|preference\/[^/]+|asset\/[^/]+|execution\/[^/]+|legacy\/[^/]+)$/.test(k);}catch{return false;}};
const encode=value=>encodeURIComponent(value);
const decode=value=>decodeURIComponent(value);

// The portable backup stays intact locally. Only transport records replace large content with references.
export async function notebookRecords(backup,putContent){
 const value=notebookContent(backup),records={};
 delete value.data.preferences.theme;delete value.data.preferences.wifiOnly;
 for(const [key,list] of Object.entries(value.data)){
  if(!Array.isArray(list))continue;
  const idKey=['downloads','downloadJobs'].includes(key)?'catalogId':'id';
  if(list.some(v=>!v||typeof v[idKey]!=='string'))continue;
  records['order/'+encode(key)]={idKey,ids:list.map(v=>v[idKey])};
  for(const record of list)records['data/'+encode(key)+'/'+encode(record[idKey])]=record;
  delete value.data[key];
 }
 for(const [key,item] of Object.entries(value.data.preferences))records['preference/'+encode(key)]=item;
 delete value.data.preferences;
 for(const asset of value.assets){
  const {base64,...metadata}=asset,parts=[];
  // Each immutable piece has a bounded request and its own durable retry checkpoint.
  for(let offset=0;offset<base64.length;offset+=524288)parts.push(await putContent({kind:'score-bytes',value:base64.slice(offset,offset+524288)}));
  records['asset/'+encode(asset.id)]={...metadata,content:{parts,length:base64.length}};
 }
 delete value.assets;
 if(value.library?.executions){
  for(const [key,item] of Object.entries(value.library.executions))records['execution/'+encode(key)]=item;
  delete value.library.executions;
 }
 if(value.legacy){for(const [key,item] of Object.entries(value.legacy))records['legacy/'+encode(key)]=item;delete value.legacy;}
 records.header=value;
 return records;
}
export async function recordsNotebook(records,getContent){
 if(!records.header)throw atomicFailure('The incremental notebook is incomplete. Retry synchronization.','INCOMPLETE');
 const backup=structuredClone(records.header);backup.assets=[];backup.data.preferences={};
 const grouped={},orders={};
 for(const [key,value] of Object.entries(records)){
  const [kind,a,b]=key.split('/');
  if(kind==='preference')backup.data.preferences[decode(a)]=value;
  if(kind==='order')orders[decode(a)]=value;
  if(kind==='data'){const collection=decode(a);(grouped[collection]??=[]).push(value);}
  if(kind==='execution'){backup.library??={};backup.library.executions??={};backup.library.executions[decode(a)]=value;}
  if(kind==='legacy'){backup.legacy??={};backup.legacy[decode(a)]=value;}
  if(kind==='asset'){
   const {content,...metadata}=value;
   if(metadata.id!==decode(a)||!content||!Array.isArray(content.parts)||content.parts.length>1000||!content.parts.every(h=>hashPattern.test(h))||!Number.isSafeInteger(content.length)||content.length<0||content.length>34000000)throw atomicFailure('Invalid incremental score reference.');
   const pieces=[];for(const hash of content.parts){const part=await getContent(hash);if(part.kind!=='score-bytes'||typeof part.value!=='string'||part.value.length>524288)throw atomicFailure('Invalid incremental score content.');pieces.push(part.value);}
   const base64=pieces.join('');if(base64.length!==content.length)throw atomicFailure('The downloaded score is incomplete.','INTEGRITY');backup.assets.push({...metadata,base64});
  }
 }
 for(const key of new Set([...Object.keys(orders),...Object.keys(grouped)])){
  const order=orders[key]||{idKey:'id',ids:[]},items=grouped[key]||[],positions=new Map(order.ids.map((id,n)=>[id,n]));
  backup.data[key]=items.sort((a,b)=>(positions.get(a[order.idKey])??Infinity)-(positions.get(b[order.idKey])??Infinity)||String(a[order.idKey]).localeCompare(String(b[order.idKey])));
 }
 if(backup.library)backup.library.executions??={};
 return backup;
}
export function recordChanges(before,after,force=[]){
 return [...new Set([...Object.keys(before),...Object.keys(after),...force])].sort().filter(key=>force.includes(key)||!same(before[key],after[key])).map(key=>own(after,key)?{key,value:after[key]}:{key,deleted:true});
}
export function validateCommit(commit,rootId,notebookId){
 if(commit?.format!==ATOMIC_FORMAT||commit.rootId!==rootId||commit.notebookId!==notebookId||!Array.isArray(commit.parents)||commit.parents.length>1000||!commit.parents.every(p=>hashPattern.test(p))||new Set(commit.parents).size!==commit.parents.length||!Array.isArray(commit.parts)||commit.parts.length>2000||!commit.parts.every(p=>hashPattern.test(p)))throw atomicFailure('Invalid incremental notebook commit.');
 return commit;
}
export function validateChanges(value){
 if(value?.kind!=='record-changes'||!Array.isArray(value.changes)||value.changes.length>5000)throw atomicFailure('Invalid incremental notebook changes.');
 const keys=new Set();for(const change of value.changes){if(!safeKey(change.key)||keys.has(change.key)||!Array.isArray(change.previous)||change.previous.length>1000||!change.previous.every(p=>hashPattern.test(p))||new Set(change.previous).size!==change.previous.length||(!own(change,'value')&&change.deleted!==true)||own(change,'value')&&own(change,'deleted'))throw atomicFailure('Invalid incremental notebook record.');keys.add(change.key);}
 return value.changes;
}

// Causal ancestry, not device timestamps, determines which record versions supersede others.
export function mergeCommitGraph(commits){
 const heights=new Map(),children=new Map(),indegree=new Map(),ready=[];
 for(const [hash,commit] of commits){indegree.set(hash,commit.parents.length);if(!commit.parents.length)ready.push(hash);for(const parent of commit.parents){if(!commits.has(parent))throw atomicFailure('Some notebook changes have not arrived yet. Retry synchronization.','INCOMPLETE');const list=children.get(parent)||[];list.push(hash);children.set(parent,list);}}
 for(let n=0;n<ready.length;n++){const hash=ready[n],commit=commits.get(hash);heights.set(hash,commit.parents.length?1+Math.max(...commit.parents.map(p=>heights.get(p))):0);for(const child of children.get(hash)||[]){const left=indegree.get(child)-1;indegree.set(child,left);if(!left)ready.push(child);}}
 if(ready.length!==commits.size)throw atomicFailure('The incremental notebook contains a revision cycle.');
 const heads=[...commits.keys()].filter(h=>!children.has(h)).sort(),histories=new Map(),ancestryCache=new Map();
 const ancestor=(previous,current)=>{
  const key=previous+'/'+current;if(ancestryCache.has(key))return ancestryCache.get(key);
  const stack=[...commits.get(current).parents],seen=new Set();let found=false;
  while(stack.length){const hash=stack.pop();if(hash===previous){found=true;break;}if(seen.has(hash)||heights.get(hash)<=heights.get(previous))continue;seen.add(hash);stack.push(...commits.get(hash).parents);}
  ancestryCache.set(key,found);return found;
 };
 for(const [hash,commit] of commits)for(const change of commit.changes){const history=histories.get(change.key)||new Map();history.set(hash,{hash,...change});histories.set(change.key,history);}
 const records={},versions={},conflicts=[],conflictKeys=[];
 for(const [key,history] of histories){
  const superseded=new Set();
  for(const version of history.values())for(const previous of version.previous){if(!history.has(previous)||!ancestor(previous,version.hash))throw atomicFailure('An incremental record has an invalid predecessor.');superseded.add(previous);}
  const current=[...history.values()].filter(v=>!superseded.has(v.hash)).sort((a,b)=>a.hash.localeCompare(b.hash));
  versions[key]=current.map(v=>v.hash);
  const value=v=>v.deleted?undefined:v.value;let result=value(current[0]);
  if(current.length>1){
   const recordAncestors=version=>{const seen=new Set(),stack=[version.hash];while(stack.length){const hash=stack.pop();if(seen.has(hash))continue;seen.add(hash);stack.push(...history.get(hash).previous);}return seen;};
   const sets=current.map(recordAncestors),common=[...sets[0]].filter(h=>sets.every(set=>set.has(h))).sort((a,b)=>heights.get(b)-heights.get(a)||a.localeCompare(b)),base=common.length?value(history.get(common[0])):undefined;
   for(const candidate of current.slice(1)){
    if(key.startsWith('order/')){const next=value(candidate);if(result&&next&&result.idKey===next.idKey){result={idKey:result.idKey,ids:[...new Set([...result.ids,...next.ids])]};continue;}}
    const wrap=v=>v===undefined?{}:{record:v},merged=mergeNotebooks(common.length?wrap(base):null,wrap(result),wrap(value(candidate)));
    if(merged.conflicts.length){conflictKeys.push(key);for(const path of merged.conflicts)conflicts.push('/'+key+path.replace(/^\/record/,''));}result=merged.backup.record;
   }
  }
  if(result!==undefined)records[key]=result;
 }
 return {records,heads,versions,conflicts:[...new Set(conflicts)],conflictKeys:[...new Set(conflictKeys)]};
}
