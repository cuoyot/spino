import {ui} from './locale.js';

export const AUDIO_VISUAL_STYLES = ['silk', 'orbit', 'mixer'];
const styleName = style => ({silk:ui('Silk waves','Ondas de seda'),orbit:ui('Orbit','Órbita'),mixer:ui('Mixer','Mixer')})[style];
const clamp = value => Math.max(0, Math.min(1, value));
const alpha = (hex, opacity) => {
  const n = parseInt(hex.trim().slice(1), 16);
  return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${opacity})`;
};

export function audioVisualizerMarkup() {
  return `<div class="cp-media-audio-feedback" data-audio-style="silk"><div class="cp-audio-art"><canvas data-audio-canvas aria-hidden="true"></canvas><meter class="cp-audio-level" data-audio-level min="0" max="100" value="0" aria-label="${ui('Microphone level','Nivel del micrófono')}"></meter></div><div class="cp-audio-footer"><button type="button" class="quiet cp-audio-style" data-audio-next aria-label="${ui('Change animation','Cambiar animación')} · ${styleName('silk')}"><span data-audio-style-name aria-live="polite">${styleName('silk')}</span><span class="cp-audio-dots" aria-hidden="true">${AUDIO_VISUAL_STYLES.map((style,i)=>`<span data-audio-dot="${style}" ${i===0?'class="is-current"':''}></span>`).join('')}</span></button><span class="cp-audio-swipe">${ui('Swipe to change','Desliza para cambiar')}</span></div><p data-audio-signal role="status">${ui('Listening…','Escuchando…')}</p></div>`;
}

// These marks reflect microphone amplitude/frequency, without changing the recorded stream.
export function drawAudioVisualization(c, {width:w,height:h,style,level,bands,time,palette:p}) {
  c.clearRect(0,0,w,h);
  c.lineCap='round';
  const energy=clamp(level),phase=time;
  if(style==='silk') {
    for(let k=0;k<5;k++) {
      const gradient=c.createLinearGradient(0,0,w,h);
      gradient.addColorStop(0,alpha(p.cyan,.2));gradient.addColorStop(.3,alpha(k===1?p.cyan:p.blue,.4));gradient.addColorStop(.67,alpha(k===2?p.pink:p.purple,.45));gradient.addColorStop(1,alpha(p.pink,.25));
      const amplitude=Math.min(h*.28,w*.32)*energy;
      const yAt=u=>h*.48+Math.pow(Math.sin(Math.PI*u),1.2)*(Math.sin(u*6.4+phase+k*.5)*amplitude*.7+Math.sin(u*13.2-phase*.6+k*.3)*amplitude*.3);
      c.beginPath();for(let i=0;i<=100;i++){const u=i/100,y=yAt(u);i?c.lineTo(w*u,y):c.moveTo(0,y);}
      for(let i=100;i>=0;i--){const u=i/100;c.lineTo(w*u,yAt(u)+Math.sin(Math.PI*u)*(2+energy*(8+k*2)));}
      c.closePath();c.fillStyle=gradient;c.fill();
    }
    c.beginPath();for(let i=0;i<=110;i++){const u=i/110,y=h*.48+Math.sin(Math.PI*u)*Math.sin(u*9-phase)*Math.min(h*.14,40)*energy;i?c.lineTo(w*u,y):c.moveTo(0,y);}
    c.strokeStyle=alpha(p.blue,.65);c.lineWidth=1.3;c.stroke();
  } else if(style==='orbit') {
    const x=w/2,y=h/2,r=Math.min(w*.27,h*.29),gradient=c.createLinearGradient(x-r,y-r,x+r,y+r);
    gradient.addColorStop(0,p.cyan);gradient.addColorStop(.4,p.blue);gradient.addColorStop(.7,p.purple);gradient.addColorStop(1,p.pink);
    const glow=c.createRadialGradient(x,y,r*.25,x,y,r*1.65);glow.addColorStop(0,alpha(p.purple,0));glow.addColorStop(.7,alpha(p.purple,.09*energy));glow.addColorStop(1,alpha(p.purple,0));c.fillStyle=glow;c.fillRect(x-r*1.65,y-r*1.65,r*3.3,r*3.3);
    for(let k=0;k<4;k++) {
      c.beginPath();for(let i=0;i<=180;i++){const a=i/180*Math.PI*2,mod=(Math.sin(a*5+phase+k*.4)*.65+Math.sin(a*9-phase*.7)*.35)*energy,rad=r+k*4+mod*r*.2,px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;i?c.lineTo(px,py):c.moveTo(px,py);}
      c.closePath();c.strokeStyle=gradient;c.globalAlpha=.85-k*.17;c.lineWidth=k===0?2:1.3;c.stroke();
    }
    c.globalAlpha=1;c.fillStyle=alpha(p.blue,.4);c.beginPath();c.arc(x,y,2+energy*3,0,Math.PI*2);c.fill();
  } else {
    const count=bands.length,gap=w<320?3:4,bw=(w-32-gap*(count-1))/count,step=Math.min(9,h*.032),base=h*.5+step*10;
    for(let i=0;i<count;i++) {
      const value=clamp(bands[i]),lit=Math.round(value*19),x=16+i*(bw+gap);
      for(let j=0;j<20;j++) {
        const color=j>16?p.pink:i<count*.34?p.cyan:i<count*.7?p.blue:p.purple;
        c.fillStyle=j<=lit?alpha(color,.85):p.track;c.beginPath();c.roundRect(x,base-j*step,bw,Math.max(2,step*.58),1);c.fill();
      }
      if(lit>0){c.fillStyle=alpha(p.pink,.6);c.fillRect(x,base-(lit+1)*step,bw,2);}
    }
  }
}

export function createAudioVisualizer({element,gestureTarget=element,analyser,sampleRate=48000}) {
  const canvas=element.querySelector('[data-audio-canvas]'),context=canvas.getContext('2d'),meter=element.querySelector('[data-audio-level]'),signal=element.querySelector('[data-audio-signal]'),button=element.querySelector('[data-audio-next]');
  if(!context)throw new Error('Canvas unavailable');
  const samples=new Float32Array(analyser.fftSize),frequencies=new Uint8Array(analyser.frequencyBinCount),bands=new Float32Array(32),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let style='silk',disposed=false,frame=0,lastFrame=0,lastSound=0,phase=0,level=0,width=0,height=0,palette;
  const css=()=>{const values=getComputedStyle(element);palette=Object.fromEntries(['cyan','blue','purple','pink','track'].map(key=>[key,values.getPropertyValue('--audio-'+key).trim()]));};
  const paint=()=>{if(width&&height&&!disposed)drawAudioVisualization(context,{width,height,style,level,bands,time:phase,palette});};
  const resize=()=>{const box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);width=box.width;height=box.height;canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0);paint();};
  function change(direction=1) {
    style=AUDIO_VISUAL_STYLES[(AUDIO_VISUAL_STYLES.indexOf(style)+direction+AUDIO_VISUAL_STYLES.length)%AUDIO_VISUAL_STYLES.length];
    element.dataset.audioStyle=style;element.querySelector('[data-audio-style-name]').textContent=styleName(style);button.setAttribute('aria-label',ui('Change animation','Cambiar animación')+' · '+styleName(style));
    for(const dot of element.querySelectorAll('[data-audio-dot]'))dot.classList.toggle('is-current',dot.dataset.audioDot===style);
    paint();
  }
  const next=()=>change();
  button.addEventListener('click',next);
  const touches=new Set();let gesture=null;
  const down=event=>{
    if(event.pointerType==='mouse'&&event.button!==0)return;
    touches.add(event.pointerId);
    if(touches.size!==1){gesture=null;return;}
    if(event.target.closest('button,input,a,select,textarea'))return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
    try{gestureTarget.setPointerCapture(event.pointerId);}catch{}
  };
  const up=event=>{
    touches.delete(event.pointerId);const start=gesture;gesture=null;
    if(!start||event.pointerId!==start.id||touches.size)return;
    const x=event.clientX-start.x,y=event.clientY-start.y;
    if(Math.max(Math.abs(x),Math.abs(y))>=40)change((Math.abs(x)>=Math.abs(y)?x:y)>0?1:-1);
  };
  const cancel=event=>{touches.delete(event.pointerId);gesture=null;};
  gestureTarget.addEventListener('pointerdown',down);gestureTarget.addEventListener('pointerup',up);gestureTarget.addEventListener('pointercancel',cancel);
  const tick=now=>{
    if(disposed)return;
    if(now-lastFrame>=(motion.matches?100:33)) {
      const delta=lastFrame?Math.min((now-lastFrame)/1000,.15):0;lastFrame=now;
      analyser.getFloatTimeDomainData(samples);analyser.getByteFrequencyData(frequencies);
      let sum=0;for(const sample of samples)sum+=sample*sample;
      const rms=Math.sqrt(sum/samples.length),target=clamp((20*Math.log10(Math.max(rms,.001))+60)/60);
      level+=(target-level)*.32;meter.value=target*100;
      if(rms>.008)lastSound=now;
      const text=lastSound&&now-lastSound<650?ui('Sound detected','Sonido detectado'):ui('Listening…','Escuchando…');if(signal.textContent!==text)signal.textContent=text;
      for(let i=0;i<bands.length;i++) {
        const low=Math.max(1,Math.floor(45*Math.pow(240,i/bands.length)/sampleRate*analyser.fftSize)),high=Math.min(frequencies.length,Math.max(low+1,Math.ceil(45*Math.pow(240,(i+1)/bands.length)/sampleRate*analyser.fftSize)));
        let max=0;for(let j=low;j<high;j++)max=Math.max(max,frequencies[j]||0);
        const value=rms>.004?max/255:0;bands[i]+=(value-bands[i])*.3;
      }
      if(!motion.matches&&rms>.004)phase+=delta*(.35+level*.9);
      paint();
    }
    frame=requestAnimationFrame(tick);
  };
  css();resize();
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  const themeObserver=new MutationObserver(()=>{css();paint();});themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','class','style']});
  frame=requestAnimationFrame(tick);
  return {dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();themeObserver.disconnect();button.removeEventListener('click',next);gestureTarget.removeEventListener('pointerdown',down);gestureTarget.removeEventListener('pointerup',up);gestureTarget.removeEventListener('pointercancel',cancel);touches.clear();gesture=null;}};
}
