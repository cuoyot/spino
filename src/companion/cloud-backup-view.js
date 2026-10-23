import { getAppLanguage, localizeMessage } from './locale.js';
import { localize } from './locale.js';
import { escapeHTML as esc } from './views.js';
import { needsCloudRelink } from './cloud-errors.js';
import {driveSyncMarkup,driveManageMarkup} from './drive-sync-view.js';
import {driveCopy} from './drive-notebook-view.js';

const messages = {
  en: {
    title: 'Your notebook in the cloud', connectTitle: 'Keep your notebook with you',
    includes: 'History, plans, scores and annotations.', connect: 'Connect', manage: 'Manage',
    sync: 'Sync now', backup: 'Back up now', retry: 'Try again', review: 'Review changes',
    syncing: 'Between devices', independent: 'Backup for this device', savedAt: 'Last file update',
    noWrite: 'No file update yet', help: 'How it works', done: 'Done', resume: 'Resume',
    unavailable: 'Cloud connection is available in the installed app.',
    status: { disconnected: 'Not connected', paused: 'Automatic updates paused', pending: 'Changes pending',
      waiting: 'Waiting to receive changes', writing: 'Updating file…', saved: 'Saved to your file provider',
      error: 'Update failed', conflict: 'Changes need review' },
    setupNote: 'Choose {provider} in the file picker.',
    start: 'Start on this device', startDetail: 'Create a file to keep your devices in sync.',
    join: 'Connect another device', joinDetail: 'Select the sync file you already use with SPino.',
    backupOnly: 'One-device backup', backupOnlyDetail: 'Automatic copies. Restore manually when needed.',
    automatic: 'Automatic updates', automaticDetail: 'While SPino is open. Incoming changes wait until practice and editing finish.',
    qrPaused: 'Resume synchronization to show this notebook’s QR.',
    showQR: 'Show my notebook QR', qrDetail: 'Scan it from the device you want to connect.',
    disconnectFirst: 'Disconnect this notebook before connecting another one.',
    disconnect: 'Disconnect this device', disconnectDetail: 'Your local notebook and cloud file are kept.',
    recovery: 'Recovery options', recover: 'Restore local recovery copy',
    recoverDetail: 'Review the copy saved before the last incoming sync.',
    errorDetail: 'Connection details',
    continueLocal: 'Continue locally', localDetail: 'Changes stay on this device until you resume synchronization.',
    relink: 'Select the sync file again',
    providerUnavailable: 'The selected cloud file is unavailable. Open your file provider, check your account, then select the same sync file again.',
    conflictNote: 'Only overlapping edits need a choice. Other changes are kept from both devices.',
    conflictOne:'1 conflicting value', conflictCount: '{count} conflicting values', local: 'Prefer this device for conflicts', remote: 'Prefer the cloud for conflicts',
    keptCount: '{count} independent practices will be kept', keptNote: 'Both choices keep these practices. Only the conflicting values below are affected.', thisDevice: 'This device', cloudValue: 'Cloud', removedValue: 'Removed', emptyValue: 'Empty', detailsValue: 'Details differ', yesValue: 'Yes', noValue: 'No',
    fields: {record:'Conflicting record',sessionId:'Practice linked to this plan',title:'Title',notes:'Notes',next:'Next step',bpm:'Tempo',status:'Status',elapsedMs:'Practice time',results:'Practice results',blocks:'Practice activities',weeklyMinutes:'Weekly goal',language:'Language',name:'Name',mood:'Rating',active:'Current practice'},
    technical: 'Technical details',
    syncHelpTitle: 'Same file, every device', syncHelp: 'Select the same sync file in the same cloud account on each device. Independent edits are combined.',
    backupHelpTitle: 'Restore when you choose', backupHelp: 'A one-device backup does not import changes automatically. Restoration is always manual.',
    providerHelpTitle: 'Your cloud provider handles uploads', providerHelp: 'Saved confirms a file write, not completion of the cloud upload. Allow Drive or iCloud to finish uploading before switching devices.',
    foregroundHelpTitle: 'Updates during a break', foregroundHelp: 'Changes are saved automatically across all screens. Incoming changes are applied after practice and editing finish; downloads must be idle.',
    conflictGroups: { works: 'Repertoire', sessions: 'Practice history', plans: 'Calendar', routines: 'Routines', preferences: 'Preferences', assets: 'Scores and annotations', active: 'Current practice', unknown: 'Notebook' },
  },
  es: {
    title: 'Tu cuaderno en la nube', connectTitle: 'Tu cuaderno, contigo',
    includes: 'Historial, planes, partituras y anotaciones.', connect: 'Conectar', manage: 'Gestionar',
    sync: 'Sincronizar ahora', backup: 'Guardar copia ahora', retry: 'Reintentar', review: 'Revisar cambios',
    syncing: 'Entre dispositivos', independent: 'Copia de este dispositivo', savedAt: 'Última actualización del archivo',
    noWrite: 'Sin actualizaciones todavía', help: 'Cómo funciona', done: 'Listo', resume: 'Reanudar',
    unavailable: 'Conecta la nube desde la app instalada.',
    status: { disconnected: 'Sin conectar', paused: 'Actualizaciones automáticas en pausa', pending: 'Cambios pendientes',
      waiting: 'Esperando recibir los cambios', writing: 'Actualizando archivo…', saved: 'Guardado en tu proveedor de archivos',
      error: 'No se ha podido actualizar', conflict: 'Hay cambios que revisar' },
    setupNote: 'Elige {provider} en el selector de archivos.',
    start: 'Empezar en este dispositivo', startDetail: 'Crea un archivo para sincronizar tus dispositivos.',
    join: 'Conectar otro dispositivo', joinDetail: 'Selecciona el archivo que ya usas con SPino.',
    backupOnly: 'Copia para un solo dispositivo', backupOnlyDetail: 'Copias automáticas. Restauración manual.',
    automatic: 'Actualizaciones automáticas', automaticDetail: 'Con SPino abierto. Los cambios recibidos esperan a que terminen la práctica y la edición.',
    qrPaused: 'Reanuda la sincronización para mostrar el QR de este cuaderno.',
    showQR: 'Mostrar el QR de mi cuaderno', qrDetail: 'Escanéalo desde el dispositivo que quieres conectar.',
    disconnectFirst: 'Desconecta este cuaderno antes de conectar otro.',
    disconnect: 'Desconectar este dispositivo', disconnectDetail: 'Conserva tu cuaderno y el archivo en la nube.',
    recovery: 'Opciones de recuperación', recover: 'Recuperar la copia local',
    recoverDetail: 'Revisa la copia anterior a la última sincronización recibida.',
    errorDetail: 'Detalles de la conexión',
    continueLocal: 'Continuar en local', localDetail: 'Los cambios se guardan en este dispositivo hasta que reanudes la sincronización.',
    relink: 'Volver a seleccionar el archivo',
    providerUnavailable: 'El archivo de nube seleccionado no está disponible. Abre tu proveedor de archivos, comprueba tu cuenta y vuelve a seleccionar el mismo archivo de sincronización.',
    conflictNote: 'Solo debes elegir entre los cambios que coinciden. El resto se conserva de ambos dispositivos.',
    conflictOne:'1 valor en conflicto', conflictCount: '{count} valores en conflicto', local: 'Preferir aquí en los conflictos', remote: 'Preferir nube en los conflictos',
    keptCount: 'Se conservarán {count} prácticas independientes', keptNote: 'Ambas opciones conservan estas prácticas. Solo afectan a los valores en conflicto que se muestran debajo.', thisDevice: 'Aquí', cloudValue: 'Nube', removedValue: 'Eliminado', emptyValue: 'Vacío', detailsValue: 'Los detalles son distintos', yesValue: 'Sí', noValue: 'No',
    fields: {record:'Registro en conflicto',sessionId:'Práctica vinculada a este plan',title:'Título',notes:'Notas',next:'Próximo paso',bpm:'Tempo',status:'Estado',elapsedMs:'Tiempo de práctica',results:'Resultados de práctica',blocks:'Actividades de práctica',weeklyMinutes:'Objetivo semanal',language:'Idioma',name:'Nombre',mood:'Valoración',active:'Práctica actual'},
    technical: 'Detalles técnicos',
    syncHelpTitle: 'El mismo archivo en cada dispositivo', syncHelp: 'Selecciona el mismo archivo de sincronización en la misma cuenta de nube. Los cambios independientes se combinan.',
    backupHelpTitle: 'Restaura cuando lo necesites', backupHelp: 'La copia de un solo dispositivo no importa cambios automáticamente. La restauración es siempre manual.',
    providerHelpTitle: 'Tu proveedor gestiona la subida', providerHelp: 'Guardado confirma la escritura del archivo. Espera a que Drive o iCloud termine de subirlo antes de cambiar de dispositivo.',
    foregroundHelpTitle: 'Actualizaciones durante una pausa', foregroundHelp: 'Los cambios se guardan automáticamente desde todas las pantallas. Los cambios recibidos se aplican al terminar la práctica y la edición; las descargas deben estar inactivas.',
    conflictGroups: { works: 'Repertorio', sessions: 'Historial de práctica', plans: 'Calendario', routines: 'Rutinas', preferences: 'Preferencias', assets: 'Partituras y anotaciones', active: 'Práctica actual', unknown: 'Cuaderno' },
  },
};

const copy = options => localize(messages.en, messages.es, options?.lang || getAppLanguage());
const symbols = {
  cloud: '<path d="M7 18a4 4 0 0 1-.8-7.9 6 6 0 0 1 11.6-1.8A5 5 0 0 1 18 18"/><path d="M12 13v8m-3-3 3 3 3-3"/>',
  devices: '<rect x="3" y="4" width="12" height="12" rx="2"/><path d="M7 20h5m-2-4v4"/><rect x="15" y="10" width="6" height="11" rx="1.5"/>',
  link: '<path d="m10 13 4-4m-6 7-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 1)"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M9 13h6m-6 4h6"/>',
  restore: '<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6m3-3v5l3 2"/>',
  off: '<path d="M12 3v9m-6.4-6.4a9 9 0 1 0 12.8 0"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 2-2.5 2-2.5 4m0 3h.01"/>',
};
const icon = (name = 'cloud') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[name] || ''}</svg>`;
const button = (action, label, css = '', attributes = '') => `<button type="button" class="${css}" data-action="${action}" ${attributes}>${esc(label)}</button>`;
const row = (action, title, detail, symbol, css = '', attributes = '') => `<button type="button" class="cp-cloud-option ${css}" data-action="${action}" ${attributes}><span class="cp-cloud-option-icon">${icon(symbol)}</span><span><strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ''}</span><span class="cp-cloud-chevron" aria-hidden="true">›</span></button>`;
const providers = options => options.platform === 'ios' ? ((options.lang || getAppLanguage()) === 'en' ? 'iCloud Drive or Google Drive' : 'iCloud Drive o Google Drive') : 'Google Drive';
const footer = t => `<div class="cp-cloud-footer">${button('close-dialog', t.done, 'quiet')}</div>`;
const disabled = state => state.status === 'writing' ? 'disabled' : '';
const localOption = (state, t) => state.enabled ? `<div class="cp-cloud-local">${button('cloud-continue-local', t.continueLocal)}<p class="muted">${esc(t.localDetail)}</p></div>` : '';
const relinkOption = (state, t) => state.mode === 'sync' && state.notebookId && needsCloudRelink(state) ? state.transport === 'drive' ? `<p>${esc(t.localDetail)}</p>${button('drive-reconnect', driveCopy().reconnect, 'primary', disabled(state))}` : `<p>${esc(t.providerUnavailable)}</p>${button('cloud-relink', t.relink, 'primary', disabled(state))}` : '';

const errorMarkup = (state, options) => {
  if (state.status !== 'error' || !state.error) return '';
  const lang = options.lang || getAppLanguage();
  const labels = lang === 'es'
    ? { snapshot: 'Lectura del cuaderno local', read: 'Lectura del archivo en la nube', validate: 'Validación del archivo', baseline: 'Guardado o lectura de la base local', merge: 'Combinación de cambios', write: 'Escritura del archivo en la nube', recovery: 'Guardado de la copia de recuperación', apply: 'Aplicación de cambios recibidos' }
    : { snapshot: 'Reading the local notebook', read: 'Reading the cloud file', validate: 'Validating the file', baseline: 'Saving or reading the local baseline', merge: 'Combining changes', write: 'Writing the cloud file', recovery: 'Saving the recovery copy', apply: 'Applying incoming changes' };
  return `<div class="cp-cloud-problem" role="alert">${labels[state.operation] ? `<strong>${esc(localize(labels[state.operation],labels[state.operation],lang))}</strong>` : ''}<p class="cp-cloud-technical">${esc(localizeMessage(state.error, lang))}</p>${state.retryable ? `<p>${esc(localize('Will retry automatically while SPino is open.','Se reintentará automáticamente con SPino abierto.',lang))}</p>` : ''}</div>`;
};

export function cloudBackupMarkup(state, options = {}) {
  if(options.driveOnly)return driveSyncMarkup(state,options);
  const t = copy(options), direct = state.transport === 'drive', d = driveCopy(options.lang), linked = Boolean(state.name), waiting = {en:{practice:'Finish and save your pending practice to receive changes.',editor:'Finish editing to receive changes.',dialog:'Close the open dialog to receive changes.',score:'Close the score to receive changes.'},es:{practice:'Termina y guarda la práctica pendiente para recibir los cambios.',editor:'Termina de editar para recibir los cambios.',dialog:'Cierra el diálogo abierto para recibir los cambios.',score:'Cierra la partitura para recibir los cambios.'}}, status = state.status === 'waiting' && state.waitReason ? (waiting[options.lang||getAppLanguage()]||waiting.en)[state.waitReason] || t.status.waiting : t.status[state.status] || t.status.disconnected;
  if (!options.available) return `<section class="cp-card cp-cloud-card" id="cloud-backup"><span class="cp-cloud-emblem">${icon()}</span><h2>${esc(t.connectTitle)}</h2><p class="muted">${esc(t.includes)}</p><p class="cp-cloud-browser">${esc(t.unavailable)}</p></section>`;
  const conflict = state.status === 'conflict' && state.mode === 'sync';
  const primaryAction = !linked ? 'cloud-setup' : conflict ? 'cloud-conflicts' : state.status === 'error' && state.enabled ? 'cloud-sync' : state.status === 'error' || state.status === 'conflict' ? 'cloud-manage' : !state.enabled ? 'cloud-toggle' : 'cloud-sync';
  const primaryLabel = !linked ? t.connect : conflict ? t.review : state.status === 'error' && state.enabled ? t.retry : state.status === 'error' || state.status === 'conflict' ? t.manage : !state.enabled ? t.resume : state.mode === 'sync' ? t.sync : t.backup;
  const timestamp = state.lastWrittenAt && !Number.isNaN(Date.parse(state.lastWrittenAt))
    ? new Intl.DateTimeFormat(options.lang || getAppLanguage(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.lastWrittenAt)) : null;
  return `<section class="cp-card cp-cloud-card" id="cloud-backup" data-cloud-status="${esc(state.status || 'disconnected')}">
    <div class="cp-cloud-heading"><span class="cp-cloud-emblem">${icon()}</span><div><h2>${esc(linked ? t.title : t.connectTitle)}</h2><p class="muted">${esc(linked ? state.mode === 'sync' ? t.syncing : t.independent : t.includes)}</p></div></div>
    <p class="cp-cloud-status" role="status" id="cloud-backup-status"><span aria-hidden="true"></span>${esc(direct&&state.status==='saved'?d.saved:status)}</p>
    ${state.status === 'error' ? relinkOption(state, t) : ''}${errorMarkup(state, options)}
    ${state.status === 'paused' ? `<p class="cp-cloud-local muted">${esc(t.localDetail)}</p>${relinkOption(state, t)}` : ''}
    ${state.status==='waiting' && state.waitReason==='practice' ? button('resume-session', (options.lang||getAppLanguage())==='es'?'Abrir práctica pendiente':'Open pending practice', 'quiet') : ''}
    ${direct&&state.account?`<p class="cp-drive-account">${esc(state.account.email||state.account.name)}</p>`:''}
    ${linked ? `<div class="cp-cloud-file">${icon('file')}<div><strong title="${esc(state.name)}">${esc(state.name)}</strong><small>${esc(timestamp ? `${t.savedAt}: ${timestamp}` : t.noWrite)}</small></div></div>` : ''}
    <div class="cp-cloud-actions">${button(primaryAction, primaryLabel, 'primary', `${disabled(state)} ${primaryAction === 'cloud-toggle' ? 'data-id="true"' : ''}`)}${button(primaryAction === 'cloud-manage' ? 'cloud-help' : linked ? 'cloud-manage' : 'cloud-help', primaryAction === 'cloud-manage' ? t.help : linked ? t.manage : t.help, 'quiet', disabled(state))}</div>
    ${['error','conflict','waiting','writing'].includes(state.status) ? localOption(state, t) : ''}
  </section>`;
}

export function cloudSetupMarkup(options = {}) {
  const t = copy(options), d = driveCopy(options.lang);
  if(options.driveAvailable||options.driveOnly)return `<div class="cp-cloud-dialog" data-cloud-dialog="setup"><p>${esc(d.detail)}</p><p>${esc(d.steps)}</p><p class="muted">${esc(d.offline)}</p><div class="cp-actions">${button('close-dialog',d.cancel,'quiet')}${button('drive-connect',d.connect,'primary',options.driveAvailable?'':'disabled')}</div></div>`;
  return `<div class="cp-cloud-dialog" data-cloud-dialog="setup"><p class="muted">${esc(t.setupNote.replace('{provider}', providers(options)))}</p><div class="cp-cloud-options">${row('cloud-create-shared', t.start, t.startDetail, 'devices')}${row('device-link', t.join, t.joinDetail, 'link')}</div><details class="cp-cloud-details"><summary>${esc(t.backupOnly)}</summary>${row('cloud-connect', t.backupOnly, t.backupOnlyDetail, 'file')}</details>${footer(t)}</div>`;
}

export function cloudManageMarkup(state, options = {}) {
  if(options.driveOnly)return driveManageMarkup(state,options);
  const t = copy(options), d = driveCopy(options.lang), linked = Boolean(state.name), busy = disabled(state);
  return `<div class="cp-cloud-dialog" data-cloud-dialog="manage">
    ${state.transport==='drive'&&state.account?`<p class="cp-drive-account">${esc(state.account.email||state.account.name)}</p>`:''}
    ${options.driveAvailable&&state.transport!=='drive'?row('drive-connect',linked?d.move:d.connect,d.offline,'cloud','',busy):''}
    ${linked ? `<p class="cp-cloud-file"><strong>${esc(state.name)}</strong></p>` : ''}
    ${linked ? `<div class="cp-cloud-toggle-row"><div><strong>${esc(t.automatic)}</strong><small>${esc(t.automaticDetail)}</small></div><button class="cp-cloud-switch" type="button" role="switch" aria-label="${esc(t.automatic)}" aria-checked="${Boolean(state.enabled)}" data-action="cloud-toggle" data-id="${!state.enabled}" ${busy}><span></span></button></div>` : ''}
    ${state.status === 'error' || state.status === 'conflict' ? `<div class="cp-cloud-problem"><strong>${esc(t.status[state.status])}</strong>${state.status === 'conflict' && state.mode === 'sync' ? button('cloud-conflicts', t.review, 'primary', busy) : linked ? button('cloud-sync', t.retry, 'primary', `${busy} ${state.enabled ? '' : 'disabled'}`) : ''}${state.error ? `<details class="cp-cloud-details"><summary>${esc(t.errorDetail)}</summary><p class="cp-cloud-technical">${esc(localizeMessage(state.error, options.lang || getAppLanguage()))}</p></details>` : ''}</div>` : ''}
    ${['error','paused'].includes(state.status) ? relinkOption(state, t) : ''}
    ${localOption(state, t)}
    <div class="cp-cloud-options">${options.available && linked && state.mode === 'sync' ? row('device-link-show', t.showQR, state.enabled ? t.qrDetail : t.qrPaused, 'devices', '', `${busy} ${state.enabled ? '' : 'disabled'}`) : ''}${options.available && !linked ? row('device-link', t.join, t.joinDetail, 'devices', '', busy) : ''}${row('cloud-help', t.help, '', 'help')}</div>
    ${options.available && (state.mode === 'sync' || ['error', 'conflict'].includes(state.status)) ? `<details class="cp-cloud-details"><summary>${esc(t.recovery)}</summary>${row('cloud-recovery', t.recover, t.recoverDetail, 'restore', '', busy)}</details>` : ''}
    ${linked ? `<div class="cp-cloud-disconnect"><p class="muted">${esc(t.disconnectFirst)}</p>${row('cloud-disconnect', t.disconnect, t.disconnectDetail, 'off', 'cp-cloud-danger', busy)}</div>` : ''}${footer(t)}
  </div>`;
}

export function cloudConflictMarkup(state, options = {}) {
  const t = copy(options), conflicts = state.conflicts || [];
  const groups = [...new Set(conflicts.map(path => {
    const parts = path.split('/').filter(Boolean), key = parts[0] === 'data' ? parts[1] : parts[0];
    return t.conflictGroups[key] || t.conflictGroups.unknown;
  }))];
  const review=state.conflictReview;
  const value=entry=>!entry?'':entry.kind==='practice'?esc(entry.title)+'<small>'+esc(entry.date)+' · '+Math.round(entry.elapsedMs/60000)+' min</small>':entry.kind==='duration'?Math.round(entry.elapsedMs/60000)+' min':entry.kind==='text'?esc(entry.text):esc(t[entry.kind+'Value']||t.detailsValue);
  const kept=review?`<section class="cp-cloud-preserved"><strong>✓ ${esc(t.keptCount.replace('{count}',review.practiceCount))}</strong><p>${esc(t.keptNote)}</p>${review.practices.length?`<ul>${review.practices.map(s=>`<li>${esc(s.title)}<small>${esc(s.date)} · ${Math.round((s.elapsedMs||0)/60000)} min</small></li>`).join('')}</ul>`:''}</section>`:'';
  const values=review?.values?.length?`<div class="cp-cloud-conflict-values">${review.values.map(item=>`<section><h3>${esc(item.title||t.conflictGroups[item.group]||t.conflictGroups.unknown)}</h3><p>${esc(t.fields[item.field]||t.conflictGroups[item.group]||t.conflictGroups.unknown)}</p><dl><div><dt>${esc(t.thisDevice)}</dt><dd>${value(item.local)}</dd></div><div><dt>${esc(t.cloudValue)}</dt><dd>${value(item.remote)}</dd></div></dl></section>`).join('')}</div>`:'';
  return `<div class="cp-cloud-dialog" data-cloud-dialog="conflicts">${review?'':`<p>${esc(t.conflictNote)}</p>`}${kept}<div class="cp-cloud-conflict-summary"><strong>${esc(conflicts.length===1?t.conflictOne:t.conflictCount.replace('{count}', conflicts.length))}</strong><p>${esc(groups.join(' · '))}</p></div>${values}<div class="cp-cloud-conflict-actions">${button('cloud-resolve-local', t.local, '', disabled(state))}${button('cloud-resolve-remote', t.remote, '', disabled(state))}</div><details class="cp-cloud-details"><summary>${esc(t.technical)}</summary><ul class="cp-cloud-technical">${conflicts.map(path => `<li>${esc(path)}</li>`).join('')}</ul></details>${footer(t)}</div>`;
}

export function cloudHelpMarkup(options = {}) {
  const t = copy(options), d=driveCopy(options.lang);
  if(options.driveOnly||options.driveAvailable&&(options.transport==='drive'||!options.linked))return `<div class="cp-cloud-dialog" data-cloud-dialog="help"><div class="cp-cloud-help"><section><h3>Google Drive</h3><p>${esc(d.help)}</p></section><section><h3>${esc(t.recovery)}</h3><p>${esc(d.offline)}</p></section></div>${footer(t)}</div>`;
  return `<div class="cp-cloud-dialog" data-cloud-dialog="help"><div class="cp-cloud-help">${['sync', 'backup', 'provider', 'foreground'].map(key => `<section><h3>${esc(t[`${key}HelpTitle`])}</h3><p>${esc(t[`${key}Help`])}</p></section>`).join('')}</div>${footer(t)}</div>`;
}
