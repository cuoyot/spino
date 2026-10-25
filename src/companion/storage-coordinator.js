// Manual setup and periodic checkpoints/backups share one storage reservation.
// Notebook synchronization stays eligible until its current work has settled.
export function createStorageCoordinator({cloud,media}){
 let locked=false,pending=false,background=null;
 return {
  get locked(){return locked;},
  async reserve(){
   if(pending||locked&&!background)throw Error('A backup operation is already running.');
   pending=true;
   try{
    if(background)await background;
    await cloud.resumeChecks();await media?.waitForIdle();await cloud.waitForIdle();
    if(cloud.state.status!=='saved')throw Error(cloud.state.error||'Synchronize the notebook before setting up backups.');
    locked=true;return ()=>{locked=false;};
   }finally{pending=false;}
  },
  async background(operation){
   if(locked||pending||background)return;
   locked=true;
   background=(async()=>{try{await operation();}finally{locked=false;}})();
   try{await background;}finally{background=null;}
  }
 };
}
