// Bound each bridge call without abandoning a live serialized notebook operation.
// A lost write response is uncertain: the existing immutable outbox is re-read on retry.
export function createDriveRequestGate(native,{timeoutMs=150000,operationTimeoutMs=180000}={}) {
 let operation=null;
 const now=()=>performance.now();
 const cancelled=()=>Object.assign(Error('Synchronization paused. Pending changes are kept.'),{code:'CANCELLED'});
 const expired=()=>Object.assign(Error('Synchronization took too long and was stopped. Pending changes are kept. Retry synchronization.'),{code:'SYNC_TIMEOUT'});
 const stop=(current,error)=>{if(current.error)return;current.error=error;for(const abort of current.aborts)abort(error);};
 const check=current=>{if(current&&!current.error&&now()>=current.deadline)stop(current,expired());if(current?.error)throw current.error;};
 async function run(invoke,{requestId=null,timeoutCode='PROVIDER_ERROR',timeoutMessage='Google Drive did not respond in time. Pending changes are kept. Retry synchronization.'}={}) {
  const current=operation;
  check(current);
  let timer,abort;
  const cancelNative=()=>{if(requestId)try{Promise.resolve(native.cancel?.({requestId})).catch(()=>{});}catch{}};
  const interrupted=new Promise((_,reject)=>{
   abort=error=>{cancelNative();reject(error);};
   if(current)current.aborts.add(abort);
   timer=setTimeout(()=>abort(Object.assign(Error(timeoutMessage),{code:timeoutCode})),timeoutMs);
  });
  try{const result=await Promise.race([Promise.resolve().then(()=>{check(current);return invoke();}),interrupted]);check(current);return result;}
  finally{clearTimeout(timer);current?.aborts.delete(abort);}
 }
 return {
  async serialized(fn){
   if(operation)throw Object.assign(Error('Wait for the current connection operation.'),{code:'BUSY'});
   const current={error:null,aborts:new Set(),deadline:now()+operationTimeoutMs};operation=current;
   const timer=setTimeout(()=>stop(current,expired()),operationTimeoutMs);
   // Let the operation unwind before releasing its slot; a whole-function race
   // would let late continuations mutate the next operation's notebook state.
   try{const result=await fn();check(current);return result;}
   finally{clearTimeout(timer);if(operation===current)operation=null;}
  },
  run,
  cancel(){if(operation)stop(operation,cancelled());},
  get busy(){return !!operation;}
 };
}
