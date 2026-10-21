import {finalizeMediaDuration} from './media-duration.js';

// The browser fallback encodes the selected playback, without microphone/camera access.
// Android uses the native exporter so long clips do not have to play in real time.
export async function trimBrowserRecording(record,{startMs,endMs,durationMs},{signal,onProgress=()=>{}}={}){
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Context||!globalThis.MediaRecorder)throw Error('Trimming is not supported on this device.');
  const context=new Context(),element=document.createElement(record.kind==='video'?'video':'audio');
  const url=URL.createObjectURL(record.blob),chunks=[];let recorder,frame,watchdog,stream,source,failed;
  const cancelled=()=>{if(signal?.aborted)throw new DOMException('Trim cancelled.','AbortError');};
  const wait=event=>new Promise((resolve,reject)=>{
    const clean=()=>{clearTimeout(timeout);element.removeEventListener(event,ready);element.removeEventListener('error',error);signal?.removeEventListener('abort',abort);};
    const ready=()=>{clean();resolve();},error=()=>{clean();reject(Error('Could not read the recording.'));},abort=()=>{clean();reject(new DOMException('Trim cancelled.','AbortError'));};
    const timeout=setTimeout(error,15000);element.addEventListener(event,ready,{once:true});element.addEventListener('error',error,{once:true});signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
  const abort=()=>{failed=new DOMException('Trim cancelled.','AbortError');if(recorder?.state!=='inactive')recorder?.stop();};
  try{
    cancelled();await context.resume();element.playsInline=true;element.preload='auto';element.style.cssText='position:fixed;left:-10000px;width:2px;height:2px';document.body.append(element);
    const loaded=wait('loadeddata');element.src=url;await loaded;cancelled();
    if(startMs>0){const seek=wait('seeked');element.currentTime=startMs/1000;await seek;}
    const destination=context.createMediaStreamDestination();source=context.createMediaElementSource(element);source.connect(destination);
    let canvas,draw=()=>{};
    if(record.kind==='video'){
      canvas=document.createElement('canvas');canvas.width=element.videoWidth;canvas.height=element.videoHeight;
      if(!canvas.width||!canvas.height)throw Error('Could not read the video dimensions.');
      const pixels=canvas.getContext('2d',{alpha:false});draw=()=>pixels.drawImage(element,0,0,canvas.width,canvas.height);draw();
      stream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...destination.stream.getAudioTracks()]);
    }else stream=destination.stream;
    const types=record.kind==='video'?['video/webm;codecs=vp8,opus','video/mp4']:['audio/webm;codecs=opus','audio/mp4'];
    const type=types.find(t=>MediaRecorder.isTypeSupported(t));if(!type)throw Error('Trimming is not supported on this device.');
    recorder=new MediaRecorder(stream,{mimeType:type,audioBitsPerSecond:192000,...(record.kind==='video'?{videoBitsPerSecond:8000000}:{})});
    const finished=new Promise((resolve,reject)=>{
      let size=0;recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);size+=event.data.size;if(size>250*1024*1024){failed=Error('The trimmed recording is too large.');if(recorder.state!=='inactive')recorder.stop();}}};
      recorder.onerror=()=>{failed=Error('Could not encode the trimmed recording.');reject(failed);};
      recorder.onstop=()=>failed?reject(failed):resolve();
    });
    // Observe rejection immediately, including an abort while play() is pending.
    finished.catch(()=>{});signal?.addEventListener('abort',abort,{once:true});cancelled();
    recorder.start(250);await element.play();
    const tick=()=>{
      if(recorder.state==='inactive')return;
      if(element.currentTime*1000>=endMs||element.ended){element.pause();recorder.stop();return;}
      draw();onProgress(Math.min(99,Math.max(0,Math.floor((element.currentTime*1000-startMs)/durationMs*100))));frame=requestAnimationFrame(tick);
    };tick();
    watchdog=setTimeout(()=>{failed=Error('Trimming stopped before completion.');if(recorder.state!=='inactive')recorder.stop();},durationMs*2+15000);
    await finished;cancelled();onProgress(100);
    return finalizeMediaDuration(new Blob(chunks,{type:recorder.mimeType}),durationMs);
  }finally{
    clearTimeout(watchdog);cancelAnimationFrame(frame);signal?.removeEventListener('abort',abort);element.pause();
    if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());source?.disconnect();
    element.removeAttribute('src');element.load();element.remove();URL.revokeObjectURL(url);await context.close().catch(()=>{});
  }
}
