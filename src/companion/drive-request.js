// Bound each bridge call without abandoning a live serialized notebook operation.
// A lost write response is uncertain: the existing immutable outbox is re-read on retry.
export function createDriveRequestGate(native,{timeoutMs=150000}={}) {
 let operation=null;
 const cancelled=()=>Object.assign(Error('Synchronization paused. Pending changes are kept.'),{code:'CANCELLED'});
 async function run(invoke,{requestId=null}={}) {
  const current=operation;
  if(current?.error)throw current.error;
  let timer,abort;
  const cancelNative=()=>{if(requestId)try{Promise.resolve(native.cancel?.({requestId})).catch(()=>{});}catch{}};
  const interrupted=new Promise((_,reject)=>{
   abort=error=>{cancelNative();reject(error);};
   if(current)current.aborts.add(abort);
   timer=setTimeout(()=>abort(Object.assign(Error('Google Drive did not respond in time. Pending changes are kept. Retry synchronization.'),{code:'PROVIDER_ERROR'})),timeoutMs);
  });
  try{return await Promise.race([Promise.resolve().then(()=>{if(current?.error)throw current.error;return invoke();}),interrupted]);}
  finally{clearTimeout(timer);current?.aborts.delete(abort);}
 }
 return {
  async serialized(fn){
   if(operation)throw Object.assign(Error('Wait for the current connection operation.'),{code:'BUSY'});
   const current={error:null,aborts:new Set()};operation=current;
   try{const result=await fn();if(current.error)throw current.error;return result;}
   finally{if(operation===current)operation=null;}
  },
  run,
  cancel(){if(!operation)return;operation.error=cancelled();for(const abort of operation.aborts)abort(operation.error);},
  get busy(){return !!operation;}
 };
}
