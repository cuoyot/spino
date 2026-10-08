// SPDX-License-Identifier: GPL-3.0-only
export const instruments=[
{id:'piano',icon:'🎹',names:['Grand piano','Piano de cola','Piano de cua'],gain:1.6},
{id:'acoustic_bass',icon:'🎻',names:['Double bass','Contrabajo','Contrabaix'],gain:2},
{id:'electric_bass_finger',icon:'🎸',names:['Electric bass','Bajo eléctrico','Baix elèctric'],gain:1.5},
{id:'acoustic_guitar_nylon',icon:'🎸',names:['Classical guitar','Guitarra clásica','Guitarra clàssica'],gain:1.8},
{id:'cello',icon:'🎻',names:['Cello','Violonchelo','Violoncel'],gain:.9},
{id:'violin',icon:'🎻',names:['Violin','Violín','Violí'],gain:.8},
{id:'soprano_sax',icon:'🎷',names:['Soprano sax','Saxo soprano','Saxo soprano'],gain:.8}
];
export function chooseInstrument(start,previous='piano',random=Math.random){
 const ids=start<60?['acoustic_bass','electric_bass_finger','cello','piano']:start>=67?['violin','soprano_sax','piano']:['acoustic_guitar_nylon','cello','soprano_sax','piano'];
 const pool=ids.filter(id=>id!==previous);return pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
}

// Instrument changes belong to silent intermissions, never to the next queued note.
export const instrumentIntermission=(rest,count)=>Boolean(rest&&(rest.positionTo||count%2===0));
