// Disposable account selection and archive metadata; never uses a personal Google session.
export function backupAccountBootstrap({interactive=false}={}){
 return `(${installBackupAccount.toString()})(${JSON.stringify({interactive})});`;
}
function installBackupAccount({interactive}){
 const previous=Capacitor.nativePromise,key='spino-review-independent-backup-drive';
 const state=JSON.parse(sessionStorage.getItem(key)||'null')||{accounts:{},files:{},next:1};
 const choices=[{id:'synthetic-archive-owner',email:'backups@example.invalid',name:'Synthetic backup account'},{id:'synthetic-owner',email:'synthetic-owner@example.invalid',name:'Synthetic notebook account'}];
 const persist=()=>sessionStorage.setItem(key,JSON.stringify(state));
 window.__backupReview={state,connections:0,requests:[]};
 for(const name of ['DriveBackupAccount','DriveArchive'])Capacitor.PluginHeaders.push({name,methods:['status','connect','request','cancel','useBackupAccount','stageChunk','download','release','pause'].map(name=>({name,rtype:'promise'}))});
 const selectAccount=async()=>{
  __backupReview.connections++;
  if(!interactive)return choices[0];
  const dialog=document.createElement('dialog');dialog.dataset.reviewBackupAccount='true';dialog.innerHTML='<form><h2>Google Drive · cuenta de las copias</h2><p>Vista previa con cuentas de prueba.</p><label>Cuenta<select name="account" required><option value="">Elige una cuenta…</option>'+choices.map(c=>'<option value="'+c.id+'">'+c.email+'</option>').join('')+'</select></label><div class="row"><button type="button" data-cancel>Cancelar</button><button type="submit">Continuar</button></div></form>';
  document.body.append(dialog);dialog.showModal();
  return new Promise((resolve,reject)=>{const cancel=()=>{dialog.close();dialog.remove();reject(Error('Connect Google Drive for backups.'));};dialog.querySelector('[data-cancel]').onclick=cancel;dialog.oncancel=e=>{e.preventDefault();cancel();};dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const account=choices.find(c=>c.id===dialog.querySelector('select').value);if(!account)return;dialog.close();dialog.remove();resolve(account);};});
 };
 Capacitor.nativePromise=async(plugin,method,args={})=>{
  if(plugin==='DriveBackupAccount'){
   if(method==='status')return {account:state.accounts[args.accountId||state.current]||{}};
   if(method==='connect'){const account=await selectAccount();state.accounts[account.id]=account;state.current=account.id;persist();return account;}
   if(method==='cancel')return {};
   if(method==='request'){
    __backupReview.requests.push(args);if(!state.accounts[args.accountId])return {status:403,text:'{}'};
    const u=new URL('https://example.invalid'+args.path),id=u.pathname.split('/').pop(),response=value=>({status:200,text:JSON.stringify(value)});
    if(id==='generateIds')return response({ids:['synthetic-archive-'+state.next++]});
    if(u.pathname==='/drive/v3/files'){
     if(args.method==='POST'){const file=JSON.parse(args.text);state.files[file.id]={...file,owner:args.accountId,parents:file.parents||[]};persist();return response(file);}
     const q=u.searchParams.get('q')||'',match=/name = '((?:\\.|[^'])*)'/.exec(q),name=match?.[1].replace(/\\'/g,"'").replace(/\\\\/g,'\\');
     return response({files:Object.values(state.files).filter(f=>f.owner===args.accountId&&!f.trashed&&(!name||f.name===name))});
    }
    const file=state.files[id];if(!file||file.owner!==args.accountId)return {status:404,text:'{}'};
    if(args.method==='PATCH'){const patch=JSON.parse(args.text);Object.assign(file,{...patch,appProperties:{...file.appProperties,...patch.appProperties}});persist();}
    return response(file);
   }
  }
  if(plugin==='DriveArchive'){
   if(method==='pause'||method==='release')return {};
   if(method==='useBackupAccount'){if(!state.accounts[args.accountId])throw Error('Connect Google Drive for backups.');return {};}
   throw Error('Automatic archive upload is verified separately from this responsive preview.');
  }
  return previous(plugin,method,args);
 };
}
