import {cloudRecoveryBootstrap} from './cloud-recovery-fixture.mjs';
import {syntheticNotebookDrive} from '../../tests/fixtures/drive/notebook-server.js';
export function driveNotebookBootstrap({legacy=false,remote=null}={}){
 const seed=cloudRecoveryBootstrap('ok');
 return (legacy?seed:seed.replace('linked:true','linked:false'))+`\n{
  const server=(${syntheticNotebookDrive.toString()})();
  const saved=sessionStorage.getItem('synthetic-drive-files');
  if(saved)server.files=new Map(JSON.parse(saved));
  else if(${JSON.stringify(remote)}){const remote=${JSON.stringify(remote)};server.files.set('synthetic-existing-drive',{id:'synthetic-existing-drive',owner:'synthetic-owner',name:'Synthetic Drive notebook.json',mimeType:'application/json',appProperties:{spinoType:'spino-notebook-v1',notebookId:remote.cloudBackup.sharedNotebookId,ready:'1'},text:JSON.stringify(remote),revision:1});}
  const persist=()=>sessionStorage.setItem('synthetic-drive-files',JSON.stringify([...server.files]));persist();
  window.__driveFixture=server;
  const drive=server.native(),legacy=window.Capacitor.nativePromise;
  window.Capacitor.PluginHeaders.push({name:'DriveNotebook',methods:['status','connect','request','disconnect'].map(name=>({name,rtype:'promise'}))});
  window.Capacitor.nativePromise=async(plugin,method,args)=>{if(plugin!=='DriveNotebook')return legacy(plugin,method,args);try{return await drive[method](args);}finally{persist();}};
 }`;
}
