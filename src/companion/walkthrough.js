import { getAppLanguage } from './locale.js';
import './walkthrough.css';
const KEY='spino.walkthrough.v1';
export const tourSteps=[
 {view:'home',en:['Today','Your next practice and your weekly activity are here.'],es:['Hoy','Aquí encontrarás tu próxima práctica y tu actividad semanal.'],ca:['Avui','Aquí trobaràs la propera pràctica i l’activitat setmanal.']},
 {view:'practice',en:['Practice','Choose a routine, a quick challenge or a practice mode.'],es:['Practicar','Elige una rutina, un reto rápido o un modo de práctica.'],ca:['Practicar','Tria una rutina, un repte ràpid o un mode de pràctica.']},
 {view:'calendar',en:['Calendar','Plan practices and events. Add reminders when you choose a time.'],es:['Calendario','Planifica prácticas y eventos. Añade recordatorios al indicar una hora.'],ca:['Calendari','Planifica pràctiques i esdeveniments. Afegeix recordatoris quan indiquis una hora.']},
 {view:'piano',en:['Library','Keep your repertoire, import scores and explore the catalogue.'],es:['Biblioteca','Guarda tu repertorio, importa partituras y explora el catálogo.'],ca:['Biblioteca','Desa el repertori, importa partitures i explora el catàleg.']},
 {view:'progress',en:['Progress','Review your practice time, weekly goals and saved reflections.'],es:['Progreso','Revisa tu tiempo de práctica, objetivos semanales y reflexiones guardadas.'],ca:['Progrés','Revisa el temps de pràctica, els objectius setmanals i les reflexions desades.']},
 {view:'settings',en:['Profile','Choose your theme and preferences, manage backups and notifications, and replay this tour. Connect your instrument with the MIDI button.'],es:['Perfil','Elige el tema y tus preferencias, gestiona copias y notificaciones y repite este recorrido. Conecta tu instrumento con el botón MIDI.'],ca:['Perfil','Tria el tema i les preferències, gestiona còpies i notificacions i repeteix aquest recorregut. Connecta l’instrument amb el botó MIDI.']},
];
export function createWalkthrough({navigate,restore,storage=globalThis.localStorage}) {
 let index=0,original=null;
 const dialog=document.createElement('dialog');dialog.id='cp-walkthrough';dialog.setAttribute('aria-labelledby','cp-tour-title');document.body.append(dialog);
 const label=(en,es,ca)=>({en,es,ca}[getAppLanguage()]||en);
 const position=()=>{const r=document.querySelector('#app-shell h1')?.getBoundingClientRect();const target=dialog.querySelector('.cp-tour-highlight');if(r&&target)Object.assign(target.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});};
 const finish=()=>{try{storage.setItem(KEY,'done');}catch{}dialog.close();restore(original);original=null;};
 const render=()=>{
  const step=tourSteps[index],copy=step[getAppLanguage()]||step.en;navigate(step.view);
  dialog.innerHTML=`<div class="cp-tour-highlight" aria-hidden="true"></div><section class="cp-tour-card"><small>${index+1} / ${tourSteps.length}</small><h2 id="cp-tour-title" tabindex="-1" autofocus>${copy[0]}</h2><p>${copy[1]}</p><div class="cp-actions"><button data-tour="skip">${label('Skip','Saltar','Ometre')}</button><button data-tour="back" ${index===0?'disabled':''}>${label('Back','Atrás','Enrere')}</button><button class="primary" data-tour="next">${index===tourSteps.length-1?label('Finish','Terminar','Acabar'):label('Next','Siguiente','Següent')}</button></div></section>`;
  if(!dialog.open)dialog.showModal();dialog.querySelector('h2').focus({preventScroll:true});requestAnimationFrame(position);
 };
 dialog.addEventListener('click',e=>{const action=e.target.closest('[data-tour]')?.dataset.tour;if(action==='skip')finish();if(action==='back'&&index>0){index--;render();}if(action==='next'){if(index===tourSteps.length-1)finish();else{index++;render();}}});
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish();});
 window.addEventListener('resize',position);
 return {start(snapshot){if(dialog.open)return;original=snapshot;index=0;render();},needsIntroduction(){try{return !globalThis.__SPINO_DISABLE_TOUR&&storage.getItem(KEY)!=='done';}catch{return false;}},get open(){return dialog.open;}};
}
