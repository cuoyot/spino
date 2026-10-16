import {Capacitor,registerPlugin} from '@capacitor/core';
import {CloudBackup} from './cloud-backup.js';
import {APP_VERSION} from './app-version.js';
import {createDriveNotebookAdapter} from './drive-notebook.js';

export const driveNotebookAvailable=()=>Capacitor.getPlatform()==='android'&&APP_VERSION.includes('-beta.')&&Capacitor.isPluginAvailable('DriveNotebook');
const key='spino.drive-notebook.device.v1',selectionKey='spino.notebook-transport.device.v1';
const settings={read:()=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}},save:value=>localStorage.setItem(key,JSON.stringify(value))};
export function createNotebookTransport({legacy=CloudBackup,drive=createDriveNotebookAdapter({native:registerPlugin('DriveNotebook'),recovery:legacy,settings}),storage=localStorage}={}){
  const current=()=>storage.getItem(selectionKey)==='drive'?drive:legacy;
  return {
    drive,
    get transport(){return current()===drive?'drive':'provider';},
    get info(){return current()===drive?drive.info:{transport:'provider',account:drive.info?.account||null,needsMigration:true};},
    useDrive(){storage.setItem(selectionKey,'drive');},
    useProvider(){storage.setItem(selectionKey,'provider');},
    clearLegacyLink:()=>legacy.disconnect(),
    pendingNotebookId:()=>current().pendingNotebookId?.(),
    status:()=>current().status(),create:options=>current().create(options),pickBackup:options=>current().pickBackup(options),
    readLinked:()=>current().readLinked(),write:options=>current().write(options),
    saveRecovery:options=>legacy.saveRecovery(options),readRecovery:()=>legacy.readRecovery(),
    acknowledgeSetup:()=>current().acknowledgeSetup?.(),disconnect:()=>current().disconnect(),
  };
}

// Keep presentation and network preferences on their own device; manual JSON copies remain complete.
export function driveNotebookContent(backup){
  const value=structuredClone(backup);
  if(value?.data?.preferences)for(const key of ['theme','wifiOnly'])delete value.data.preferences[key];
  return value;
}
