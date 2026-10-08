// SPDX-License-Identifier: GPL-3.0-only
import {instruments} from './instruments.js';
// Tiny Web Audio piano-ish synth and metronome click.
let ctx = null;
const samples=new Map();
const banks=new Map([['piano',samples]]),pending=new Map();
let currentInstrument='piano';
export function loadInstrument(id){
 if(id==='piano')return loadPiano();
 if(!pending.has(id))pending.set(id,Promise.all(sampleNames.map(async(name,index)=>{
 const response=await fetch(new URL(`../assets/${id}/${name}.mp3`,import.meta.url));if(!response.ok)throw Error(id);
 return [43+index,await ac().decodeAudioData(await response.arrayBuffer())];
 })).then(entries=>{banks.set(id,new Map(entries));return true;}).catch(()=>{pending.delete(id);return false;}));
 return pending.get(id);
}
export function setInstrument(id){currentInstrument=banks.has(id)?id:'piano';return currentInstrument;}
let loading;
const sampleNames=['G2','Ab2','A2','Bb2','B2','C3','Db3','D3','Eb3','E3','F3','Gb3','G3','Ab3','A3','Bb3','B3','C4','Db4','D4','Eb4','E4','F4','Gb4','G4','Ab4','A4','Bb4','B4','C5','Db5','D5','Eb5','E5','F5','Gb5','G5'];
export const noteDuration=note=>60/note.bpm*Math.min(2,note.beats);
export function loadPiano(){
  if(!loading)loading=Promise.all(sampleNames.map(async(name,index)=>{
    const response=await fetch(new URL(`../assets/piano/${name}.mp3`,import.meta.url));
    if(!response.ok)throw Error(`Piano sample unavailable: ${name}`);
    const buffer=await ac().decodeAudioData(await response.arrayBuffer());
    samples.set(43+index,buffer);
  })).then(()=>true).catch(()=>{loading=null;return false;});
  return loading;
}
export const pianoReady=()=>samples.size===sampleNames.length;

export function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function now() {
  return ac().currentTime;
}

export function playNote(midi, duration = 1.2, when = 0, gain = 0.25) {
  const a = ac();
  const t = Math.max(a.currentTime, Number.isFinite(when) ? when : 0);
  const sample=banks.get(currentInstrument)?.get(midi);
  gain*=instruments.find(i=>i.id===currentInstrument).gain/1.6;
  if(sample){
    const source=a.createBufferSource();source.buffer=sample;
    const out=a.createGain();const length=Math.max(.05,duration);
    const fade=Math.min(.08,length*.2);
    out.gain.setValueAtTime(Math.max(.0001,gain*1.6),t);
    out.gain.setValueAtTime(Math.max(.0001,gain*1.6),t+length-fade);
    out.gain.exponentialRampToValueAtTime(.0001,t+length);
    source.connect(out).connect(a.destination);source.start(t);source.stop(t+length);
    source.onended=()=>{source.disconnect();out.disconnect();};return;
  }
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const out = a.createGain();
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(8000, f * 6);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  out.gain.exponentialRampToValueAtTime(gain * 0.4, t + 0.25);
  out.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([mul, type, g]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.value = f * mul;
    og.gain.value = g;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + duration + 0.05);
  });
  lp.connect(out).connect(a.destination);
}

// A note that sounds for as long as the key is held: returns { stop() } to release it.
export function holdNote(midi, gain = 0.25) {
  const a = ac();
  const t = a.currentTime;
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const out = a.createGain();
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(8000, f * 6);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  out.gain.exponentialRampToValueAtTime(gain * 0.45, t + 0.35); // decay to the sustain level
  out.gain.setTargetAtTime(gain * 0.25, t + 0.35, 2.5); // slow fade while held, like a real string
  const oscs = [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].map(([mul, type, g]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.value = f * mul;
    og.gain.value = g;
    o.connect(og).connect(lp);
    o.start(t);
    return o;
  });
  lp.connect(out).connect(a.destination);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    const now = a.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.18); // release
    oscs.forEach((o) => o.stop(now + 0.2));
  };
  setTimeout(stop, 12000); // safety: never ring forever
  return { stop };
}

export function click(accent = false, when = 0, volume = 1) {
  const a = ac();
  // AudioContext can resume later than the visual clock after a device interruption.
  const t = Math.max(a.currentTime, Number.isFinite(when) ? when : 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(Math.max(0.0001, 0.3 * Math.max(0, Math.min(1, volume))), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.06);
  return { when: t, stop() { o.stop(); } };
}
