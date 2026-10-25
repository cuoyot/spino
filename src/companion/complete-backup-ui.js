import {ui,localizeMessage} from './locale.js';
import {escapeHTML as esc} from './views.js';

export function createCompleteBackupExport({showDialog,dialog,formEnd,prepare,save,setBusy,changed=()=>{},notify=()=>{},progress=()=>null,now=()=>new Date()}){
 let status='idle',error='',errorDetails='',blob=null,createdAt=null,node=null,started=0;
 const captureError=e=>{error=e.message;errorDetails=e.recordingError?(e.recordingTitle?e.recordingTitle+' · ':'')+localizeMessage(e.recordingError):'';};
 const ownsDialog=()=>dialog.open&&dialog.contains(node);
 const label=()=>status==='saving'?ui('Opening save options…','Abriendo opciones para guardar…'):ui('Preparing complete backup…','Preparando copia completa…');
 function update(){
  if(!ownsDialog())return;
  const target=node.querySelector('[role=status]'),p=progress();
  if(target)target.textContent=label()+(p?.total?` · ${p.completed}/${p.total}`:'')+' · '+Math.floor((Date.now()-started)/1000)+' s';
 }
 function showProgress(){showDialog(ui('Your ZIP copy','Tu copia ZIP'),`<div class="cp-drive-loading"><span class="cp-drive-spinner" aria-hidden="true"></span><p role="status">${esc(label())}</p></div><p>${ui('You can close this window and return from Backup & sync to see progress.','Puedes cerrar esta ventana y volver desde Copia y sincronización para ver el progreso.')}</p>`);node=dialog.lastElementChild;update();}
 function showError(){showDialog(ui('The copy could not be saved','No se ha podido guardar la copia'),`<form><p role="alert">${esc(localizeMessage(error))}</p>${errorDetails?`<p>${esc(errorDetails)}</p>`:''}<p>${ui('Your notebook and files are kept.','Se conservan tu cuaderno y tus archivos.')}</p>${formEnd(ui('Retry','Reintentar'))}</form>`,()=>blob?savePrepared():run());node=dialog.lastElementChild;}
 function showReady(){showDialog(ui('Your ZIP is ready','Tu ZIP está preparado'),`<form><p>${esc(createdAt.toLocaleString())} · ${(blob.size/1048576).toFixed(1)} MB</p><p>${ui('Choose where to save the ZIP. It stays available while Spino is open.','Elige dónde guardar el ZIP. Se conserva mientras Spino esté abierto.')}</p>${formEnd(ui('Choose where to save','Elegir dónde guardar'))}<button type="button" data-action="storage-export-new">${ui('Prepare a new copy','Preparar una copia nueva')}</button></form>`,savePrepared);node=dialog.lastElementChild;}
 async function savePrepared(){
  if(status==='preparing'||status==='saving')return;
  status='saving';started=Date.now();setBusy(true);showProgress();changed();
  const timer=setInterval(update,1000);
  try{await save(blob,'Spino-'+createdAt.toISOString().replace(/[:.]/g,'-')+'.zip');status='ready';if(ownsDialog())dialog.close();}
  catch(e){status='error';captureError(e);if(ownsDialog())showError();else notify(ui('The ZIP could not be saved. Review Backup & sync.','No se ha podido guardar el ZIP. Revisa Copia y sincronización.'));}
  finally{clearInterval(timer);setBusy(false);changed();}
 }
 async function run(){
  if(status==='preparing'||status==='saving')return;
  status='preparing';error='';errorDetails='';blob=null;started=Date.now();setBusy(true);showProgress();changed();
  const timer=setInterval(update,1000);let saveNow=false;
  try{blob=await prepare();createdAt=now();status='ready';saveNow=ownsDialog();if(!saveNow)notify(ui('Your ZIP is ready. Choose where to save it in Backup & sync.','Tu ZIP está preparado. Elige dónde guardarlo en Copia y sincronización.'));}
  catch(e){status='error';captureError(e);if(ownsDialog())showError();else notify(ui('The copy could not be prepared. Review Backup & sync.','No se ha podido preparar la copia. Revisa Copia y sincronización.'));}
  finally{clearInterval(timer);setBusy(false);changed();}
  if(saveNow)await savePrepared();
 }
 function open(){
  if(status==='preparing'||status==='saving')return showProgress();
  if(status==='error')return showError();
  if(blob)return showReady();
  showDialog(ui('Export complete ZIP','Exportar ZIP completo'),`<form><p>${ui('Includes notebook, scores and all available recordings. Missing files are downloaded from Drive. Mobile data may be used.','Incluye cuaderno, partituras y todas las grabaciones disponibles. Los archivos que falten se descargarán de Drive. Puede usar datos móviles.')}</p><p>${ui('You choose where to save it after preparation. Beta limit: 250 MB.','Elegirás dónde guardarlo al terminar la preparación. Límite de esta beta: 250 MB.')}</p>${formEnd(ui('Prepare ZIP','Preparar ZIP'))}</form>`,run);node=dialog.lastElementChild;
 }
 function markup(){
  if(status==='idle')return '';
  const busy=status==='preparing'||status==='saving';
  return `<section class="cp-card" data-zip-export-status><h2>${ui('Your ZIP copy','Tu copia ZIP')}</h2><p role="status">${esc(busy?label():status==='error'?localizeMessage(error):ui('ZIP prepared','ZIP preparado')+' · '+createdAt.toLocaleString())}</p><button type="button" data-action="storage-export" class="primary">${busy?ui('View progress','Ver progreso'):status==='error'?ui('Review problem','Revisar problema'):ui('Choose where to save','Elegir dónde guardar')}</button></section>`;
 }
 return {open,markup,startNew:()=>{if(!['preparing','saving'].includes(status)){blob=null;status='idle';open();changed();}},get state(){return {status,error,createdAt,bytes:blob?.size||0};}};
}
