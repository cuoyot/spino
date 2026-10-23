// Event-driven feedback: no animation loop, audio monitoring or focusable piano keys.
export function createMidiFeedback() {
  const held=new Map(),sounding=new Map(),pedals=new Set();
  return {
    event([status,key,value]) {
      const channel=status&15,type=status&240,id=channel+':'+key;
      if(type===144&&value){held.set(id,{key,value});sounding.set(id,{key,value});}
      else if(type===128||type===144){held.delete(id);if(!pedals.has(channel))sounding.delete(id);}
      else if(type===176&&key===64){if(value>=64)pedals.add(channel);else{pedals.delete(channel);for(const id of sounding.keys())if(id.startsWith(channel+':')&&!held.has(id))sounding.delete(id);}}
      else if(type===176&&[120,121,123].includes(key)){pedals.delete(channel);for(const id of sounding.keys())if(id.startsWith(channel+':')){if(key!==121)held.delete(id);if(!held.has(id))sounding.delete(id);}}
    },
    paint(host) {
      if(!host)return;
      const notes=new Map();for(const {key,value} of sounding.values())notes.set(key,Math.max(value,notes.get(key)||0));
      for(const key of host.querySelectorAll('[data-midi-key]')){const velocity=notes.get(Number(key.dataset.midiKey))||0;key.classList.toggle('is-active',!!velocity);key.style.setProperty('--midi-strength',String(.35+velocity/127*.65));}
      host.querySelector('[data-midi-pedal]')?.classList.toggle('is-active',pedals.size>0);
    },
  };
}
export function midiFeedbackMarkup(pedalLabel) {
  let white=0;const whites=[],blacks=[];
  for(let midi=21;midi<=108;midi++){
    const black=[1,3,6,8,10].includes(midi%12);
    if(black)blacks.push(`<rect data-midi-key="${midi}" class="is-black" x="${white*10-3}" y="0" width="6" height="23" rx="1"/>`);
    else{whites.push(`<rect data-midi-key="${midi}" x="${white*10}" y="0" width="9" height="36" rx="1"/>`);white++;}
  }
  return `<div class="cp-midi-feedback" aria-hidden="true"><svg viewBox="0 0 520 36" preserveAspectRatio="none">${whites.join('')}${blacks.join('')}</svg><span data-midi-pedal>${pedalLabel}</span></div>`;
}
