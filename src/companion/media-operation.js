export function assertMediaOperationActive(signal) {
  if(signal?.aborted)throw new DOMException('Media operation cancelled.','AbortError');
}

// UI cancellation must not depend on a native/OS callback arriving later.
export function waitForMediaOperation(operation,signal) {
  if(!signal)return Promise.resolve(operation);
  return new Promise((resolve,reject)=>{
    const clear=()=>signal.removeEventListener('abort',abort);
    const abort=()=>{clear();reject(new DOMException('Media operation cancelled.','AbortError'));};
    signal.addEventListener('abort',abort,{once:true});
    Promise.resolve(operation).then(value=>{clear();if(signal.aborted)abort();else resolve(value);},error=>{clear();reject(error);});
    if(signal.aborted)abort();
  });
}
