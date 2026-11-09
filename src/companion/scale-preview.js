import { targetById } from './curriculum.js';
import { ui } from './locale.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const pitch = {c:0,d:2,e:4,f:5,g:7,a:9,b:11};
const alteration = {'':0,n:0,'#':1,b:-1,'##':2,bb:-2};
const degrees = ['I','II','III','IV','V','VI','VII'];

export function scalePianoKeys(targetId) {
  const target=targetById(targetId), root='cdefgab'.indexOf(target.notes[0].letter);
  const selected=new Map([...target.notes,target.notes[0]].map((note,i)=>[
    60 + Math.floor((root+i)/7)*12 + pitch[note.letter] + alteration[note.acc], {label:note.label,degree:degrees[i%7]},
  ]));
  return Array.from({length:25},(_,i)=>{
    const midi=60+i, black=[1,3,6,8,10].includes(i%12);
    return {midi,black,marked:selected.has(midi),label:selected.get(midi)?.label||'',degree:selected.get(midi)?.degree||''};
  });
}

function pianoMarkup(targetId) {
  const keys=scalePianoKeys(targetId), whites=keys.filter(k=>!k.black);
  const shape = (key,x,width,height) => `<g data-scale-key="${key.midi}" data-marked="${key.marked}" class="${key.black?'scale-black-key':'scale-white-key'}${key.marked?' is-marked':''}"><rect x="${x}" y="1" width="${width}" height="${height}" rx="2"/>${key.marked?`<text class="scale-degree" x="${x+width/2}" y="${height-23}" text-anchor="middle">${key.degree}</text><text class="scale-note" x="${x+width/2}" y="${height-8}" text-anchor="middle">${esc(key.label)}</text>`:''}</g>`;
  return `<svg class="cp-scale-piano" viewBox="0 0 420 110" role="img" aria-label="${esc(ui('Piano keys in the scale','Teclas de piano de la escala')+': '+keys.filter(k=>k.marked).map(k=>k.degree+' '+k.label).join(' · '))}">${whites.map((key,i)=>shape(key,i*28,28,106)).join('')}${keys.filter(k=>k.black).map(key=>shape(key,whites.filter(k=>k.midi<key.midi).length*28-8.5,17,65)).join('')}</svg>`;
}

export function scalePreviewMarkup(targetId) {
  const target = targetById(targetId), root = 'cdefgab'.indexOf(target.notes[0].letter);
  const notes = [...target.notes, target.notes[0]];
  return `<div class="cp-session-warmup cp-scale-preview"><h3>${esc(target.label)}</h3><svg viewBox="0 0 430 125" role="img" aria-label="${esc(notes.map(n => n.label).join(' · '))}">${[0,1,2,3,4].map(i => `<path d="M12 ${30+i*12}H418" stroke="currentColor" stroke-width="1"/>`).join('')}<text x="16" y="76" font-size="52">𝄞</text>${notes.map((note, i) => {
    const x = 77 + i * 45, y = 90 - (root + i) * 6;
    return `${[90,18,6].filter(line=>line===90?y>=line:y<=line).map(line=>`<path d="M${x-13} ${line}h26" stroke="currentColor"/>`).join('')}<ellipse cx="${x}" cy="${y}" rx="8" ry="5.5" transform="rotate(-18 ${x} ${y})" fill="currentColor"/><path d="M${x+(y<54?-7:7)} ${y}v${y<54?30:-30}" stroke="currentColor" stroke-width="1.5"/>${note.acc?`<text x="${x-22}" y="${y+5}" font-size="21">${esc({'#':'♯',b:'♭','##':'𝄪',bb:'𝄫'}[note.acc] || '')}</text>`:''}`;
  }).join('')}</svg>${pianoMarkup(targetId)}</div>`;
}
