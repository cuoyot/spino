// Synthetic microphone only: this fixture never requests device permissions or plays sound.
export const syntheticAudioSource = `
window.reviewAudioContexts=[];window.reviewAudioTracks=[];window.reviewAudioRecorders=[];
const ReviewContext=window.AudioContext;
Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{
  const context=new ReviewContext(),gain=context.createGain(),destination=context.createMediaStreamDestination();gain.gain.value=0;
  for(const [index,frequency] of [110,220,440,880,1760,3520].entries()){const oscillator=context.createOscillator(),volume=context.createGain();oscillator.frequency.value=frequency;volume.gain.value=1/(index+2);oscillator.connect(volume);volume.connect(gain);oscillator.start();}
  gain.connect(destination);await context.resume();reviewAudioContexts.push(context);reviewAudioTracks.push(...destination.stream.getTracks());window.reviewAudioGain=gain;return destination.stream;
}});
window.MediaRecorder=new Proxy(MediaRecorder,{construct(target,args){const recorder=new target(...args);reviewAudioRecorders.push(recorder);return recorder;}});
`;
