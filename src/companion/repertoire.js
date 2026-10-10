import { printActionButton } from './score-controls.js';
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
// "On the music stand" holds the pieces being practised now. Older works without the flag count as on the stand
// unless they are in maintenance or archived, which matches the previous Library summary.
export const isOnStand = work => !work.trashedAt && (work.onStand ?? !['Mantenimiento', 'Archivada'].includes(work.stage));
export function setWorkOnStand(data, id, value) {
  const work = data.works.find(w => w.id === id);
  if (!work || work.trashedAt) throw Error(ui('This work no longer exists.','Esta obra ya no existe.'));
  work.onStand = !!value;
}
export function repertoirePage(works, filters = {}, page = 0) {
  const query = normalize(filters.search).trim().split(/\s+/).filter(Boolean);
  const matches = works.filter(w => Boolean(w.trashedAt) === (filters.scope === 'trash') &&
    (filters.scope !== 'favorites' || w.favorite) && (!filters.stage || w.stage === filters.stage) &&
    (!filters.tag || w.tags?.includes(filters.tag)) &&
    query.every(term => normalize([w.title, w.composer, ...(w.tags || [])].join(' ')).includes(term)));
  const compare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  matches.sort((a, b) => ((filters.sort === 'composer' ? compare(a.composer || '', b.composer || '') : filters.sort === 'stage' ? STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) : 0) || compare(a.title, b.title) || compare(a.id,b.id)) * (filters.direction === 'desc' ? -1 : 1));
  // Outside the trash the stand is listed in full and only the rest of the repertoire is paged.
  const stand = filters.scope === 'trash' ? [] : matches.filter(isOnStand), rest = matches.filter(w => !stand.includes(w));
  const pages = Math.max(1, Math.ceil(rest.length / 40));
  const current = Math.max(0, Math.min(page, pages - 1));
  return { stand, works: rest.slice(current * 40, (current + 1) * 40), restTotal: rest.length, total: matches.length, page: current, pages };
}
export function setWorkTrashed(data, id, trashed, now = new Date().toISOString()) {
  const work = data.works.find(w => w.id === id);
  if (!work) throw Error(ui('This work no longer exists.','Esta obra ya no existe.'));
  // Keep stable references, attachments and annotations for history and existing plans.
  if (trashed) work.trashedAt = now;
  else delete work.trashedAt;
}

export function repertoireMarkup(data, filters, page, {esc, opts, btn, canPrint=w=>!!w.assetId}) {
  const result = repertoirePage(data.works.map(w=>({...w,onStand:false})), filters, page);
  result.works = result.works.map(w=>data.works.find(original=>original.id===w.id));
  const tags = [...new Set(data.works.flatMap(w=>w.tags||[]))].sort((a,b)=>a.localeCompare(b));
  const sortButton = (key,label) => {
    const active=(filters.sort||'title')===key;
    return '<button type="button" data-action="repertoire-sort" data-id="'+key+'" aria-label="'+esc(label+': '+ui('sort','ordenar'))+'">'+label+(active?' <span aria-hidden="true">'+(filters.direction==='desc'?'↓':'↑')+'</span>':'')+'</button>';
  };
  const column = (key,label) => '<th class="cp-repertoire-'+key+'-column" scope="col" aria-sort="'+((filters.sort||'title')===key?(filters.direction==='desc'?'descending':'ascending'):'none')+'">'+sortButton(key,label)+'</th>';
  const standButton = w => {
    const active=isOnStand(w),label=(active?ui('Take off the stand','Retirar del atril'):ui('Put on the stand','Poner en el atril'))+': '+w.title;
    return '<button type="button" class="cp-stand-icon" data-action="stand-work" data-id="'+esc(w.id)+'" aria-pressed="'+active+'" aria-label="'+esc(label)+'" title="'+esc(label)+'"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16v10H4z" fill="'+(active?'currentColor':'none')+'" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 13v5m0 0-6 3m6-3 6 3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>';
  };
  const table = works => '<div class="cp-repertoire-table-wrap"><table class="cp-repertoire-table"><thead><tr><th scope="col" aria-sort="'+((filters.sort||'title')==='title'?(filters.direction==='desc'?'descending':'ascending'):'none')+'">'+sortButton('title',ui('Title','Título'))+'<span class="cp-mobile-sort">'+sortButton('composer',ui('Composer','Autor'))+sortButton('stage',ui('Stage','Estado'))+'</span></th>'+column('composer',ui('Composer','Autor'))+column('stage',ui('Stage','Estado'))+'<th scope="col" class="cp-icon-column">'+ui('Stand','Atril')+'</th><th scope="col" class="cp-icon-column" aria-label="'+ui('Print score','Imprimir partitura')+'">'+ui('Print','Imprimir')+'</th></tr></thead><tbody>'+works.map(w=>'<tr><td><button type="button" class="cp-repertoire-open" data-action="work-detail" data-id="'+esc(w.id)+'"><b>'+esc(w.title)+'</b><span class="cp-mobile-composer">'+esc(w.composer||ui('Unknown composer','Compositor desconocido'))+'</span></button><span class="cp-mobile-stage">'+esc(stageLabel(w.stage))+'</span></td><td class="cp-repertoire-composer-column">'+esc(w.composer||'—')+'</td><td class="cp-repertoire-stage-column">'+esc(stageLabel(w.stage))+'</td><td class="cp-icon-column">'+(w.trashedAt?btn('restore-work',ui('Restore','Restaurar'),w.id):standButton(w))+'</td><td class="cp-icon-column">'+(canPrint(w)?printActionButton('print-work',w.id,esc):'')+'</td></tr>').join('')+'</tbody></table></div>';
  const standResult=repertoirePage(data.works,{sort:filters.sort,direction:filters.direction});
  const stand=filters.scope==='trash'?'':'<section class="cp-repertoire-section cp-repertoire-stand" aria-labelledby="repertoire-stand-title"><h2 id="repertoire-stand-title">'+ui('Music stand','El atril')+' <span class="cp-dashboard-count">'+standResult.stand.length+'</span></h2>'+(standResult.stand.length?table(standResult.stand):'<p class="muted">'+ui('Tap a stand icon in your collection to put a piece here.','Marca el icono de atril en la colección para poner una obra aquí.')+'</p>')+'</section>';
  const activeFilters=!!(filters.scope||filters.stage||filters.tag);
  return stand+'<section class="cp-repertoire-section cp-repertoire-collection"><h2>'+ui('Collection','Colección')+' <span class="cp-dashboard-count" role="status">'+result.total+'</span></h2><div class="cp-repertoire-searchbar"><input aria-label="'+ui('Search title or composer','Buscar título o autor')+'" id="repertoire-search" type="search" value="'+esc(filters.search||'')+'" placeholder="'+ui('Search title or composer…','Buscar título o autor…')+'" /><details class="cp-repertoire-filter-menu" '+(activeFilters?'open':'')+'><summary>'+ui('Filters','Filtros')+(activeFilters?' ·':'')+'</summary><div class="cp-repertoire-filters"><label>'+ui('Collection','Colección')+'<select data-repertoire-filter="scope">'+opts([['',ui('All works','Todas las obras')],['trash',ui('Trash','Papelera')]],filters.scope||'')+'</select></label><label>'+ui('Stage','Estado')+'<select data-repertoire-filter="stage">'+opts([['',ui('All stages','Todos los estados')],...STAGES.map(s=>[s,stageLabel(s)])],filters.stage||'')+'</select></label><label>'+ui('Tag','Etiqueta')+'<select data-repertoire-filter="tag">'+opts([['',ui('All tags','Todas las etiquetas')],...tags.map(t=>[t,t])],filters.tag||'')+'</select></label>'+btn('repertoire-reset',ui('Clear filters','Borrar filtros'),'','quiet')+'</div></details></div>'+(result.total?table(result.works):'<p class="muted">'+ui('No matching works. Change the filters or add a work.','No hay obras con estos filtros. Cámbialos o añade una obra.')+'</p>')+'</section>'+(result.pages>1?'<div class="cp-actions cp-repertoire-pagination">'+(result.page>0?btn('repertoire-page',ui('Previous','Anterior'),String(result.page-1)):'')+'<span>'+ui('Page','Página')+' '+(result.page+1)+' / '+result.pages+'</span>'+(result.page+1<result.pages?btn('repertoire-page',ui('Next','Siguiente'),String(result.page+1)):'')+'</div>':'');
}
