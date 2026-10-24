import {ui} from './locale.js';
import {isOnStand} from './repertoire.js';

export function bindEventWorks(form, works, initial) {
  const host=form.querySelector('[data-event-works]'), selected=new Set(initial);
  const available=works.filter(w=>!w.trashedAt||selected.has(w.id));
  let browsing=false, query='';
  const esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const card=w=>`<button type="button" data-event-work="${esc(w.id)}" aria-pressed="${selected.has(w.id)}"><span class="cp-practice-piece-check" aria-hidden="true">✓</span><b>${esc(w.title)}</b><small>${esc(w.composer)}</small></button>`;
  const results=()=>available.filter(w=>`${w.title} ${w.composer||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(card).join('');
  const render=()=>{
    host.innerHTML=`<div class="cp-practice-piece-heading"><p>${ui('Works','Obras')} <span data-event-work-count>${selected.size||''}</span></p><button type="button" class="quiet" data-event-work-browse>${browsing?ui('Back','Volver'):ui('Other pieces','Otras piezas')}</button></div><p class="muted cp-event-work-hint">${ui('You can select more than one.','Puedes seleccionar varias.')}</p>${browsing?`<label>${ui('Search your repertoire','Buscar en tu repertorio')}<input type="search" data-event-work-search placeholder="${ui('Title or composer','Título o compositor')}" value="${esc(query)}" /></label><div class="cp-practice-results" data-event-work-results>${results()}</div>`:`<div class="cp-practice-stand" role="group" aria-label="${ui('On your stand','En tu atril')}">${available.filter(w=>isOnStand(w)||selected.has(w.id)).map(card).join('')||`<p class="muted">${ui('Choose pieces from your repertoire.','Elige obras de tu repertorio.')}</p>`}</div>`}<div data-event-work-values>${[...selected].map(id=>`<input type="hidden" name="workIds" value="${esc(id)}" />`).join('')}</div>`;
  };
  host.addEventListener('click',event=>{
    if(event.target.closest('[data-event-work-browse]')){browsing=!browsing;query='';render();host.querySelector('[data-event-work-search],[data-event-work-browse]')?.focus();return;}
    const button=event.target.closest('[data-event-work]');if(!button)return;
    const id=button.dataset.eventWork;selected.has(id)?selected.delete(id):selected.add(id);
    button.setAttribute('aria-pressed',String(selected.has(id)));
    host.querySelector('[data-event-work-count]').textContent=selected.size||'';
    host.querySelector('[data-event-work-values]').innerHTML=[...selected].map(id=>`<input type="hidden" name="workIds" value="${esc(id)}" />`).join('');
  });
  host.addEventListener('input',event=>{if(event.target.matches('[data-event-work-search]')){query=event.target.value;host.querySelector('[data-event-work-results]').innerHTML=results()||`<p class="muted">${ui('No results','Sin resultados')}</p>`;}});
  render();
}
