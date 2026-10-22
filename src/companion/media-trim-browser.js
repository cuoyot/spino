import {createBookendCards,fadeOpacity,BOOKENDS} from './media-bookends.js';
import {finalizeMediaDuration} from './media-duration.js';

// The browser fallback encodes the selected playback, without microphone/camera access.
// Android uses the native exporter so long clips do not have to play in real time.
export async function trimBrowserRecording(record,{startMs,endMs,durationMs},{signal,onProgress=()=>{},bookends}={}){
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
    let canvas,draw=()=>{},cards,pixels;const totalMs=durationMs+(bookends?5000:0);
    if(record.kind==='video'){
      canvas=document.createElement('canvas');canvas.width=element.videoWidth;canvas.height=element.videoHeight;
      if(!canvas.width||!canvas.height)throw Error('Could not read the video dimensions.');
      pixels=canvas.getContext('2d',{alpha:false});if(bookends)cards=await createBookendCards(record,canvas.width,canvas.height);draw=()=>pixels.drawImage(element,0,0,canvas.width,canvas.height);draw();
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
    let phase=bookends?'intro':'body',phaseStart=performance.now();
    const paint=(image,ms,length)=>{pixels.fillStyle='#000';pixels.fillRect(0,0,canvas.width,canvas.height);pixels.globalAlpha=fadeOpacity(ms,length);pixels.drawImage(image,0,0,canvas.width,canvas.height);pixels.globalAlpha=1;};
    if(bookends)paint(cards[0],0,BOOKENDS.introMs);
    recorder.start(250);if(!bookends)await element.play();
    const tick=()=>{
      if(recorder.state==='inactive')return;
      const elapsed=performance.now()-phaseStart;
      if(phase==='intro'){
        paint(cards[0],elapsed,BOOKENDS.introMs);
        if(elapsed>=BOOKENDS.introMs){phase='body';element.play().catch(error=>{failed=error;if(recorder.state!=='inactive')recorder.stop();});}
      }else if(phase==='body'){
        if(bookends)paint(element,element.currentTime*1000-startMs,durationMs);else draw();
        if(element.currentTime*1000>=endMs||element.ended){element.pause();if(bookends){phase='outro';phaseStart=performance.now();}else {recorder.stop();return;}}
      }else{
        paint(cards[1],elapsed,BOOKENDS.outroMs);if(elapsed>=BOOKENDS.outroMs){recorder.stop();return;}
      }
      const progress=phase==='intro'?elapsed:phase==='body'?(bookends?3000:0)+element.currentTime*1000-startMs:3000+durationMs+elapsed;
      onProgress(Math.min(99,Math.max(0,Math.floor(progress/totalMs*100))));frame=requestAnimationFrame(tick);
    };tick();
    watchdog=setTimeout(()=>{failed=Error('Export stopped before completion.');if(recorder.state!=='inactive')recorder.stop();},totalMs*2+15000);
    await finished;cancelled();onProgress(100);
    return finalizeMediaDuration(new Blob(chunks,{type:recorder.mimeType}),totalMs);
  }finally{
    clearTimeout(watchdog);cancelAnimationFrame(frame);signal?.removeEventListener('abort',abort);element.pause();
    if(recorder&&recorder.state!=='inactive')recorder.stop();stream?.getTracks().forEach(t=>t.stop());source?.disconnect();
    element.removeAttribute('src');element.load();element.remove();URL.revokeObjectURL(url);await context.close().catch(()=>{});
  }
}
