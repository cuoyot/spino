import {ui} from './locale.js';

export const eventRepetitionButton = () => `<button type="button" class="quiet cp-event-repeat-toggle" data-event-repeat-toggle aria-label="${ui('Add repetitions','Añadir repeticiones')}" title="${ui('Add repetitions','Añadir repeticiones')}" aria-expanded="false" aria-controls="event-repeat-options"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4m14-1v3a2 2 0 0 1-2 2H3"/></svg></button>`;

export function bindEventRepetitions(form) {
  const button=form.querySelector('[data-event-repeat-toggle]');
  const panel=form.querySelector('#event-repeat-options');
  const {frequency,until,date}=form.elements;
  const update=()=>{
    const repeating=!frequency.disabled&&!!frequency.value;
    form.querySelector('[data-event-until]').hidden=!repeating;
    until.disabled=!repeating;
    until.min=date.value;
    form.querySelector('[data-event-monthly]').hidden=!repeating||!['monthly','yearly'].includes(frequency.value);
    const label=repeating?ui('Repeat','Repetir')+': '+frequency.selectedOptions[0].textContent:ui('Add repetitions','Añadir repeticiones');
    button.setAttribute('aria-label',label);
    button.title=label;
    button.dataset.repeating=String(repeating);
    button.setAttribute('aria-expanded',String(!panel.hidden));
  };
  button.addEventListener('click',()=>{
    if(frequency.disabled){frequency.disabled=false;frequency.value=frequency.value||'weekly';panel.hidden=false;}
    else panel.hidden=!panel.hidden;
    update();
    if(!panel.hidden)frequency.focus();
  });
  frequency.addEventListener('change',()=>{
    if(!frequency.value){frequency.disabled=true;panel.hidden=true;button.focus();}
    update();
  });
  date.addEventListener('change',update);
  update();
}
