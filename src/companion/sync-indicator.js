import { getAppLanguage } from './locale.js';

const copy = {
  en: { saved: 'Synchronization connected', pending: 'Synchronization pending', writing: 'Synchronizing…', paused: 'Synchronization paused', waiting: 'Synchronization waiting', error: 'Synchronization needs attention', conflict: 'Synchronization conflicts: review changes', media: 'Recording synchronization needs attention', open: 'Open synchronization settings' },
  es: { saved: 'Sincronización conectada', pending: 'Sincronización pendiente', writing: 'Sincronizando…', paused: 'Sincronización en pausa', waiting: 'Sincronización en espera', error: 'La sincronización necesita atención', conflict: 'Conflictos de sincronización: revisar cambios', media: 'La sincronización de grabaciones necesita atención', open: 'Abrir ajustes de sincronización' },
  ca: { saved: 'Sincronització connectada', pending: 'Sincronització pendent', writing: 'Sincronitzant…', paused: 'Sincronització en pausa', waiting: 'Sincronització en espera', error: 'La sincronització necessita atenció', conflict: 'Conflictes de sincronització: revisa els canvis', media: 'La sincronització de gravacions necessita atenció', open: 'Obre els ajustos de sincronització' },
};

export function syncIndicatorMarkup(state = {}, media = {}, lang = getAppLanguage()) {
  if (!state.name) return '';
  const t = copy[lang] || copy.en;
  const problem = ['error', 'conflict'].includes(state.status) || !!state.error;
  const mediaProblem = media.status === 'error' || media.status === 'offline' || !!media.error;
  const status = problem ? (state.status === 'conflict' ? 'conflict' : 'error') : mediaProblem ? 'media' : !state.enabled ? 'paused' : state.status === 'writing' || ['checking', 'copying'].includes(media.status) ? 'writing' : ['pending', 'waiting'].includes(state.status) ? state.status : 'saved';
  const attention = problem || mediaProblem;
  const label = `${t[status]}. ${t.open}`;
  return `<button type="button" class="cp-sync-status quiet" data-action="sync-settings" data-sync-status="${status}" data-attention="${attention}" aria-label="${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8a7 7 0 0 0-12-3L4 8m0-5v5h5M5 16a7 7 0 0 0 12 3l3-3m0 5v-5h-5"/></svg><span class="sr-only" role="status">${t[status]}</span></button>`;
}
