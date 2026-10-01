import { STAGES } from './model.js';
import { ui } from './locale.js';

const stageLabel = value => {
  const english = { 'Por empezar': 'Not started', 'En estudio': 'Learning', Consolidando: 'Consolidating', Mantenimiento: 'Maintaining', Archivada: 'Archived' };
  return ui(english[value] || value, value);
};

const normalize = value => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
export function parseTags(value) {
  const tags = [...new Map(String(value).split(',').map(t => t.trim()).filter(Boolean).map(t => [normalize(t), t])).values()];
  if (tags.length > 20 || tags.some(t => t.length > 40)) throw Error(ui('Use up to 20 tags, each no longer than 40 characters.','Usa hasta 20 etiquetas de 40 caracteres como máximo.'));
  return tags;
}
export function repertoirePage(works, filters = {}, page = 0) {
  const query = normalize(filters.search).trim().split(/\s+/).filter(Boolean);
  const matches = works.filter(w => Boolean(w.trashedAt) === (filters.scope === 'trash') &&
    (filters.scope !== 'favorites' || w.favorite) && (!filters.stage || w.stage === filters.stage) &&
    (!filters.tag || w.tags?.includes(filters.tag)) &&
    query.every(term => normalize([w.title, w.composer, ...(w.tags || [])].join(' ')).includes(term)));
  const compare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  matches.sort((a, b) => (filters.sort === 'composer' ? compare(a.composer, b.composer) : filters.sort === 'stage' ? STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) : 0) || compare(a.title, b.title) || compare(a.id,b.id));
  const pages = Math.max(1, Math.ceil(matches.length / 40));
  const current = Math.max(0, Math.min(page, pages - 1));
  return { works: matches.slice(current * 40, (current + 1) * 40), total: matches.length, page: current, pages };
}
export function setWorkTrashed(data, id, trashed, now = new Date().toISOString()) {
  const work = data.works.find(w => w.id === id);
  if (!work) throw Error(ui('This work no longer exists.','Esta obra ya no existe.'));
  // Keep stable references, attachments and annotations for history and existing plans.
  if (trashed) work.trashedAt = now;
  else delete work.trashedAt;
}

export function repertoireMarkup(data, filters, page, {esc, opts, btn}) {
  const result = repertoirePage(data.works, filters, page);
  const tags = [...new Set(data.works.flatMap(w=>w.tags||[]))].sort((a,b)=>a.localeCompare(b));
  return `<section class="cp-card"><label>${ui('Search','Buscar')}<input id="repertoire-search" type="search" value="${esc(filters.search)}" placeholder="${ui('Title, composer or tag','Título, compositor o etiqueta')}" /></label><div class="cp-fields">
    <label>${ui('Collection','Colección')}<select data-repertoire-filter="scope">${opts([['',ui('All works','Todas las obras')],['favorites',ui('Favorites','Favoritas')],['trash',ui('Trash','Papelera')]],filters.scope||'')}</select></label>
    <label>${ui('Stage','Estado')}<select data-repertoire-filter="stage">${opts([['',ui('All stages','Todos los estados')],...STAGES.map(s=>[s,stageLabel(s)])],filters.stage||'')}</select></label>
    <label>${ui('Tag','Etiqueta')}<select data-repertoire-filter="tag">${opts([['',ui('All tags','Todas las etiquetas')],...tags.map(t=>[t,t])],filters.tag||'')}</select></label>
    <label>${ui('Sort','Ordenar')}<select data-repertoire-filter="sort">${opts([['',ui('Title','Título')],['composer',ui('Composer','Compositor')],['stage',ui('Stage','Estado')]],filters.sort||'')}</select></label></div></section>
    <p role="status">${result.total} ${ui('works','obras')}${filters.scope==='trash'?ui(' in trash',' en la papelera'):''}</p>
    <div class="cp-repertoire-list">${result.works.map(w=>`<article class="cp-repertoire-row"><button type="button" class="cp-repertoire-open" data-action="work-detail" data-id="${esc(w.id)}"><b>${esc(w.title)}</b><small>${esc(w.composer||ui('Unknown composer','Compositor desconocido'))} · ${esc(stageLabel(w.stage))}</small>${w.tags?.length?`<small>${w.tags.map(esc).join(' · ')}</small>`:''}</button>${w.trashedAt?btn('restore-work',ui('Restore','Restaurar'),w.id):`<button type="button" data-action="favorite-work" data-id="${esc(w.id)}" aria-label="${w.favorite?ui('Remove from favorites','Quitar de favoritas'):ui('Add to favorites','Añadir a favoritas')}: ${esc(w.title)}" aria-pressed="${!!w.favorite}">${w.favorite?'★':'☆'}</button>`}</article>`).join('')||`<p>${ui('No matching works. Change the filters or add a work.','No hay obras con estos filtros. Cámbialos o añade una obra.')}</p>`}</div>
    <div class="cp-actions">${result.page>0?btn('repertoire-page',ui('Previous','Anterior'),String(result.page-1)):''}<span>${ui('Page','Página')} ${result.page+1} / ${result.pages}</span>${result.page+1<result.pages?btn('repertoire-page',ui('Next','Siguiente'),String(result.page+1)):''}${btn('repertoire-reset',ui('Clear filters','Borrar filtros'),'','quiet')}</div>`;
}
