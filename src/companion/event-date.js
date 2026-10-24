import {ui, getAppLanguage} from './locale.js';
import './event-date.css';

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const parseDate = value => new Date(`${value}T12:00:00`);

// Keep form values as local calendar dates, independent of native WebView pickers.
export function bindEventDates(form) {
  const calendars = [];
  for (const input of form.querySelectorAll('input[type=date]')) {
    const field = input.closest('label');
    const label = field.firstChild.textContent.trim();
    const host = document.createElement('div');
    host.className = 'cp-event-date';
    host.dataset.dateField = input.name;
    field.replaceWith(host);
    const caption = document.createElement('span');
    caption.textContent = label;
    host.append(caption, input);
    for (const child of [...field.children]) host.append(child);
    input.type = 'hidden';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'cp-date-toggle';
    toggle.setAttribute('aria-expanded','false');
    const panel = document.createElement('div');
    panel.className = 'cp-date-calendar';
    panel.id = `event-calendar-${input.name}`;
    panel.hidden = true;
    toggle.setAttribute('aria-controls', panel.id);
    host.insertBefore(toggle, input);
    host.append(panel);
    let month;
    const close = () => { panel.hidden = true; toggle.setAttribute('aria-expanded','false'); };
    calendars.push(close);
    const update = () => {
      toggle.textContent = input.value ? parseDate(input.value).toLocaleDateString(getAppLanguage(),{day:'numeric',month:'long',year:'numeric'}) : ui('Choose a date','Elegir fecha');
      toggle.setAttribute('aria-label', `${label}: ${toggle.textContent}`);
      toggle.disabled = input.disabled;
    };
    const select = value => { input.value = value; input.dispatchEvent(new Event('change',{bubbles:true})); close(); toggle.focus(); };
    const render = () => {
      panel.replaceChildren();
      const header = document.createElement('div');
      header.className = 'cp-date-month';
      const button = (text, action, parent=header) => {
        const b = document.createElement('button'); b.type='button'; b.textContent=text;
        b.addEventListener('click',action); parent.append(b); return b;
      };
      button('‹',()=>{month.setMonth(month.getMonth()-1);render();}).setAttribute('aria-label',ui('Previous month','Mes anterior'));
      const title = document.createElement('strong');
      title.setAttribute('aria-live','polite');
      title.textContent = month.toLocaleDateString(getAppLanguage(),{month:'long',year:'numeric'});
      header.append(title);
      button('›',()=>{month.setMonth(month.getMonth()+1);render();}).setAttribute('aria-label',ui('Next month','Mes siguiente'));
      panel.append(header);
      const grid = document.createElement('div'); grid.className='cp-date-days'; panel.append(grid);
      for(let i=0;i<7;i++) {
        const day=document.createElement('span');
        day.textContent=new Date(2024,0,1+i).toLocaleDateString(getAppLanguage(),{weekday:'short'});
        grid.append(day);
      }
      const offset=(month.getDay()+6)%7;
      for(let i=0;i<offset;i++) grid.append(document.createElement('span'));
      const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
      for(let day=1;day<=count;day++) {
        const date=new Date(month.getFullYear(),month.getMonth(),day,12),value=dateKey(date);
        const b=button(String(day),()=>select(value),grid);
        b.dataset.date=value;
        b.disabled=!!(input.min && value<input.min || input.max && value>input.max);
        b.setAttribute('aria-pressed',String(value===input.value));
        b.setAttribute('aria-label',date.toLocaleDateString(getAppLanguage(),{dateStyle:'full'}));
        if(value===dateKey(new Date())) b.setAttribute('aria-current','date');
      }
      const footer=document.createElement('div'); footer.className='cp-date-footer'; panel.append(footer);
      const today=dateKey(new Date());
      button(ui('Today','Hoy'),()=>select(today),footer).disabled=!!(input.min && today<input.min || input.max && today>input.max);
      if(!input.required) button(ui('Clear','Borrar'),()=>select(''),footer);
    };
    toggle.addEventListener('click',()=>{
      const open=panel.hidden; calendars.forEach(close);
      if(open) { month=parseDate(input.value||input.min||dateKey(new Date())); month.setDate(1); render(); panel.hidden=false; toggle.setAttribute('aria-expanded','true'); }
    });
    panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();toggle.focus();}});
    input.addEventListener('change',update);
    // Recurrence controls can enable the end date after the form is bound.
    const observer=new MutationObserver(()=>{update();if(!panel.hidden)render();});
    observer.observe(input,{attributes:true,attributeFilter:['disabled','min','max']});
    form.closest('dialog')?.addEventListener('close',()=>observer.disconnect(),{once:true});
    update();
  }
}
