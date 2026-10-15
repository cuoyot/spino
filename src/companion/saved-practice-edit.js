import {copy} from './model.js';
import {ui} from './locale.js';

export function updateSavedPractice(session, results, works, now=Date.now()) {
  if(!results.length || results.length>30)throw Error(ui('Use between 1 and 30 blocks.','Usa entre 1 y 30 bloques.'));
  const next=copy(session), previous=new Map(session.results.map(r=>[r.block.id,r]));
  let total=0;
  next.results=results.map(result=>{
    const r=copy(result),old=previous.get(r.block.id);
    if(!Number.isFinite(r.elapsedMs)||r.elapsedMs<0||r.elapsedMs>720*60000)throw Error(ui('Enter a valid block duration.','Indica una duración válida para el bloque.'));
    if(r.block.workId && r.block.workId!==old?.block.workId && !works.some(w=>w.id===r.block.workId&&!w.trashedAt))throw Error(ui('Choose an available piece.','Elige una obra disponible.'));
    if(old?.block.workId!==r.block.workId){r.measurement=null;r.material=null;}
    total+=r.elapsedMs;return r;
  });
  if(total>720*60000)throw Error(ui('Practice time cannot exceed 720 minutes.','El tiempo de práctica no puede superar 720 minutos.'));
  const edits=new Map(next.results.map(r=>[r.block.id,r.block]));
  next.blocks=next.blocks.map(b=>copy(edits.get(b.id)||b));
  for(const r of next.results)if(!next.blocks.some(b=>b.id===r.block.id))next.blocks.push(copy(r.block));
  const oldWorkIds=new Set(session.results.map(r=>r.block.workId).filter(Boolean));
  next.workIds=[...new Set([...(session.workIds||[]).filter(id=>!oldWorkIds.has(id)),...next.results.map(r=>r.block.workId).filter(Boolean)])];
  if(total!==session.elapsedMs)next.recordedElapsedMs ??= session.elapsedMs;
  if(session.blockIndex===session.blocks.length)next.blockIndex=next.blocks.length;
  next.elapsedMs=total;next.updatedAt=now;
  return next;
}
