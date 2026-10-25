import {createIncrementalNotebookAdapter} from '../../src/companion/drive-incremental.js';
import {syntheticNotebookDrive} from '../../tests/fixtures/drive/notebook-server.js';
import {cloudRecoveryFixture} from './cloud-recovery-fixture.mjs';
import {driveNotebookBootstrap} from './drive-notebook-fixture.mjs';

// Seed an existing modern notebook, so UI checks never rely on the retired implicit migration flow.
export async function connectedDriveBootstrap({language='es'}={}){
  const server=syntheticNotebookDrive(),entries=new Map();let settings={};
  const adapter=createIncrementalNotebookAdapter({native:server.native(),recovery:{saveRecovery:async()=>{}},settings:{read:()=>settings,save:value=>{settings=value;}},journal:{get:async key=>entries.get(key),set:async(key,value)=>entries.set(key,value)}});
  await adapter.create({text:JSON.stringify(cloudRecoveryFixture(language))});
  const snapshot={files:[...server.files],changes:server.changes,nextID:server.nextID};
  return driveNotebookBootstrap({language})+`\n{
    if(!sessionStorage.getItem('synthetic-modern-notebook')){
      const snapshot=${JSON.stringify(snapshot)};
      Object.assign(__driveFixture,{files:new Map(snapshot.files),changes:snapshot.changes,nextID:snapshot.nextID});
      sessionStorage.setItem('synthetic-drive-files',JSON.stringify(snapshot.files));
      sessionStorage.setItem('synthetic-drive-progress',JSON.stringify({changes:snapshot.changes,nextID:snapshot.nextID}));
      sessionStorage.setItem('synthetic-modern-notebook','1');
    }
  }`;
}
