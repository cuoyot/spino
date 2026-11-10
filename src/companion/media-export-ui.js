import {ui} from './locale.js';

export function waitForExportVisibility(signal) {
  if(signal?.aborted)return Promise.reject(new DOMException('Export cancelled.','AbortError'));
  if(!document.hidden)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const clear=()=>{document.removeEventListener('visibilitychange',visible);signal?.removeEventListener('abort',abort);};
    const visible=()=>{if(!document.hidden){clear();resolve();}};
    const abort=()=>{clear();reject(new DOMException('Export cancelled.','AbortError'));};
    document.addEventListener('visibilitychange',visible);signal?.addEventListener('abort',abort,{once:true});
  });
}

export async function exportChoice(title, choices, signal) {
  const dialog=document.createElement('dialog');dialog.className='cp-media-export-dialog';dialog.dataset.mediaExport='true';
  const heading=document.createElement('h2');heading.textContent=title;dialog.append(heading);
  return new Promise(resolve=>{
    let settled=false;const abort=()=>done(null);
    const done=value=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);dialog.close();dialog.remove();resolve(value);};
    for(const [value,label,description] of [...choices,[null,ui('Cancel','Cancelar')]]) {
      const button=document.createElement('button');button.type='button';button.dataset.exportChoice=value||'cancel';
      const name=document.createElement('strong');name.textContent=label;button.append(name);
      if(description){const hint=document.createElement('small');hint.textContent=description;button.append(hint);}
      button.onclick=()=>done(value);dialog.append(button);
    }
    dialog.addEventListener('cancel',event=>{event.preventDefault();done(null);});document.body.append(dialog);dialog.showModal();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
}

export function exportProgress(message, externalSignal) {
  const controller=new AbortController(),dialog=document.createElement('dialog');dialog.className='cp-media-export-dialog';dialog.dataset.mediaExport='true';
  const label=document.createElement('p'),progress=document.createElement('progress'),detail=document.createElement('p'),cancel=document.createElement('button');
  label.textContent=message;label.setAttribute('role','status');progress.max=100;progress.value=0;
  detail.className='muted';detail.textContent=ui('Your original recording is kept. If you lock the screen, return to SPino to continue.','Se conserva tu grabación original. Si bloqueas la pantalla, vuelve a SPino para continuar.');
  cancel.textContent=ui('Cancel','Cancelar');cancel.type='button';cancel.onclick=()=>controller.abort();
  dialog.append(label,progress,detail,cancel);dialog.addEventListener('cancel',event=>{event.preventDefault();controller.abort();});
  document.body.append(dialog);dialog.showModal();
  window.dispatchEvent(new CustomEvent('spino:media-export',{detail:true}));
  let wakeLock,closed=false;
  const keepAwake=()=>{if(!document.hidden&&!wakeLock)void navigator.wakeLock?.request('screen').then(lock=>{if(!dialog.isConnected){void lock.release();return;}wakeLock=lock;lock.addEventListener('release',()=>{wakeLock=null;},{once:true});}).catch(()=>{});};
  document.addEventListener('visibilitychange',keepAwake);keepAwake();
  const abort=()=>controller.abort();
  const close=()=>{if(closed)return;closed=true;externalSignal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',close);document.removeEventListener('visibilitychange',keepAwake);void wakeLock?.release().catch(()=>{});dialog.close();dialog.remove();window.dispatchEvent(new CustomEvent('spino:media-export',{detail:false}));};
  controller.signal.addEventListener('abort',close,{once:true});externalSignal?.addEventListener('abort',abort,{once:true});if(externalSignal?.aborted)abort();
  return {signal:controller.signal,progress,label,close};
}
