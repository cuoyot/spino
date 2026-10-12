import { getAppLanguage, localizeMessage } from './locale.js';
import { catalanCopy } from './locale-ca.js';
import { escapeHTML as esc } from './views.js';

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
      error: 'Connection needs attention', conflict: 'Changes need review' },
    setupNote: 'Choose {provider} in the file picker.',
    start: 'Start on this device', startDetail: 'Create a file to keep your devices in sync.',
    join: 'Connect another device', joinDetail: 'Select the sync file you already use with SPino.',
    backupOnly: 'One-device backup', backupOnlyDetail: 'Automatic copies. Restore manually when needed.',
    automatic: 'Automatic updates', automaticDetail: 'While SPino is open. Incoming changes wait until practice and editing finish.',
    location: 'Location and mode', locationDetail: 'Choose another file or change how it is used.',
    disconnect: 'Disconnect this device', disconnectDetail: 'Your local notebook and cloud file are kept.',
    recovery: 'Recovery options', recover: 'Restore local recovery copy',
    recoverDetail: 'Review the copy saved before the last incoming sync.',
    errorDetail: 'Connection details',
    conflictNote: 'Only overlapping edits need a choice. Other changes are kept from both devices.',
    conflictCount: '{count} conflicting values', local: 'Use this device’s edits', remote: 'Use the cloud edits',
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
      error: 'Revisa la conexión', conflict: 'Hay cambios que revisar' },
    setupNote: 'Elige {provider} en el selector de archivos.',
    start: 'Empezar en este dispositivo', startDetail: 'Crea un archivo para sincronizar tus dispositivos.',
    join: 'Conectar otro dispositivo', joinDetail: 'Selecciona el archivo que ya usas con SPino.',
    backupOnly: 'Copia para un solo dispositivo', backupOnlyDetail: 'Copias automáticas. Restauración manual.',
    automatic: 'Actualizaciones automáticas', automaticDetail: 'Con SPino abierto. Los cambios recibidos esperan a que terminen la práctica y la edición.',
    location: 'Ubicación y modo', locationDetail: 'Elige otro archivo o cambia cómo se utiliza.',
    disconnect: 'Desconectar este dispositivo', disconnectDetail: 'Conserva tu cuaderno y el archivo en la nube.',
    recovery: 'Opciones de recuperación', recover: 'Recuperar la copia local',
    recoverDetail: 'Revisa la copia anterior a la última sincronización recibida.',
    errorDetail: 'Detalles de la conexión',
    conflictNote: 'Solo debes elegir entre los cambios que coinciden. El resto se conserva de ambos dispositivos.',
    conflictCount: '{count} valores en conflicto', local: 'Usar los cambios de este dispositivo', remote: 'Usar los cambios de la nube',
    technical: 'Detalles técnicos',
    syncHelpTitle: 'El mismo archivo en cada dispositivo', syncHelp: 'Selecciona el mismo archivo de sincronización en la misma cuenta de nube. Los cambios independientes se combinan.',
    backupHelpTitle: 'Restaura cuando lo necesites', backupHelp: 'La copia de un solo dispositivo no importa cambios automáticamente. La restauración es siempre manual.',
    providerHelpTitle: 'Tu proveedor gestiona la subida', providerHelp: 'Guardado confirma la escritura del archivo. Espera a que Drive o iCloud termine de subirlo antes de cambiar de dispositivo.',
    foregroundHelpTitle: 'Actualizaciones durante una pausa', foregroundHelp: 'Los cambios se guardan automáticamente desde todas las pantallas. Los cambios recibidos se aplican al terminar la práctica y la edición; las descargas deben estar inactivas.',
    conflictGroups: { works: 'Repertorio', sessions: 'Historial de práctica', plans: 'Calendario', routines: 'Rutinas', preferences: 'Preferencias', assets: 'Partituras y anotaciones', active: 'Práctica actual', unknown: 'Cuaderno' },
  },
};

const copy = options => (options?.lang || getAppLanguage()) === 'ca' ? catalanCopy(messages.en) : messages[options?.lang || getAppLanguage()] || messages.en;
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

export function cloudBackupMarkup(state, options = {}) {
  const t = copy(options), linked = Boolean(state.name), waiting = {en:{practice:'Finish and save your pending practice to receive changes.',editor:'Finish editing to receive changes.',dialog:'Close the open dialog to receive changes.',score:'Close the score to receive changes.'},es:{practice:'Termina y guarda la práctica pendiente para recibir los cambios.',editor:'Termina de editar para recibir los cambios.',dialog:'Cierra el diálogo abierto para recibir los cambios.',score:'Cierra la partitura para recibir los cambios.'}}, status = state.status === 'waiting' && state.waitReason ? (waiting[options.lang||getAppLanguage()]||waiting.en)[state.waitReason] || t.status.waiting : t.status[state.status] || t.status.disconnected;
  if (!options.available) return `<section class="cp-card cp-cloud-card" id="cloud-backup"><span class="cp-cloud-emblem">${icon()}</span><h2>${esc(t.connectTitle)}</h2><p class="muted">${esc(t.includes)}</p><p class="cp-cloud-browser">${esc(t.unavailable)}</p></section>`;
  const conflict = state.status === 'conflict' && state.mode === 'sync';
  const primaryAction = !linked ? 'cloud-setup' : conflict ? 'cloud-conflicts' : state.status === 'error' || state.status === 'conflict' ? 'cloud-manage' : !state.enabled ? 'cloud-toggle' : 'cloud-sync';
  const primaryLabel = !linked ? t.connect : conflict ? t.review : state.status === 'error' || state.status === 'conflict' ? t.manage : !state.enabled ? t.resume : state.mode === 'sync' ? t.sync : t.backup;
  const timestamp = state.lastWrittenAt && !Number.isNaN(Date.parse(state.lastWrittenAt))
    ? new Intl.DateTimeFormat(options.lang || getAppLanguage(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.lastWrittenAt)) : null;
  return `<section class="cp-card cp-cloud-card" id="cloud-backup" data-cloud-status="${esc(state.status || 'disconnected')}">
    <div class="cp-cloud-heading"><span class="cp-cloud-emblem">${icon()}</span><div><h2>${esc(linked ? t.title : t.connectTitle)}</h2><p class="muted">${esc(linked ? state.mode === 'sync' ? t.syncing : t.independent : t.includes)}</p></div></div>
    <p class="cp-cloud-status" role="status" id="cloud-backup-status"><span aria-hidden="true"></span>${esc(status)}</p>
    ${state.status==='waiting' && state.waitReason==='practice' ? button('resume-session', (options.lang||getAppLanguage())==='es'?'Abrir práctica pendiente':'Open pending practice', 'quiet') : ''}
    ${linked ? `<div class="cp-cloud-file">${icon('file')}<div><strong title="${esc(state.name)}">${esc(state.name)}</strong><small>${esc(timestamp ? `${t.savedAt}: ${timestamp}` : t.noWrite)}</small></div></div>` : ''}
    <div class="cp-cloud-actions">${button(primaryAction, primaryLabel, 'primary', `${disabled(state)} ${primaryAction === 'cloud-toggle' ? 'data-id="true"' : ''}`)}${button(primaryAction === 'cloud-manage' ? 'cloud-help' : linked ? 'cloud-manage' : 'cloud-help', primaryAction === 'cloud-manage' ? t.help : linked ? t.manage : t.help, 'quiet', disabled(state))}</div>
  </section>`;
}

export function cloudSetupMarkup(options = {}) {
  const t = copy(options);
  return `<div class="cp-cloud-dialog" data-cloud-dialog="setup"><p class="muted">${esc(t.setupNote.replace('{provider}', providers(options)))}</p><div class="cp-cloud-options">${row('cloud-create-shared', t.start, t.startDetail, 'devices')}${row('device-link', t.join, t.joinDetail, 'link')}</div><details class="cp-cloud-details"><summary>${esc(t.backupOnly)}</summary>${row('cloud-connect', t.backupOnly, t.backupOnlyDetail, 'file')}</details>${footer(t)}</div>`;
}

export function cloudManageMarkup(state, options = {}) {
  const t = copy(options), linked = Boolean(state.name), busy = disabled(state);
  return `<div class="cp-cloud-dialog" data-cloud-dialog="manage">
    ${linked ? `<div class="cp-cloud-toggle-row"><div><strong>${esc(t.automatic)}</strong><small>${esc(t.automaticDetail)}</small></div><button class="cp-cloud-switch" type="button" role="switch" aria-label="${esc(t.automatic)}" aria-checked="${Boolean(state.enabled)}" data-action="cloud-toggle" data-id="${!state.enabled}" ${busy}><span></span></button></div>` : ''}
    ${state.status === 'error' || state.status === 'conflict' ? `<div class="cp-cloud-problem"><strong>${esc(t.status[state.status])}</strong>${state.status === 'conflict' && state.mode === 'sync' ? button('cloud-conflicts', t.review, 'primary', busy) : linked ? button('cloud-sync', t.retry, 'primary', `${busy} ${state.enabled ? '' : 'disabled'}`) : ''}${state.error ? `<details class="cp-cloud-details"><summary>${esc(t.errorDetail)}</summary><p class="cp-cloud-technical">${esc(localizeMessage(state.error, options.lang || getAppLanguage()))}</p></details>` : ''}</div>` : ''}
    <div class="cp-cloud-options">${options.available ? row('cloud-setup', t.location, t.locationDetail, 'cloud', '', busy) : ''}${options.available ? row('device-link', t.join, t.joinDetail, 'devices', '', busy) : ''}${row('cloud-help', t.help, '', 'help')}</div>
    ${options.available && (state.mode === 'sync' || ['error', 'conflict'].includes(state.status)) ? `<details class="cp-cloud-details"><summary>${esc(t.recovery)}</summary>${row('cloud-recovery', t.recover, t.recoverDetail, 'restore', '', busy)}</details>` : ''}
    ${linked ? `<div class="cp-cloud-disconnect">${row('cloud-disconnect', t.disconnect, t.disconnectDetail, 'off', 'cp-cloud-danger', busy)}</div>` : ''}${footer(t)}
  </div>`;
}

export function cloudConflictMarkup(state, options = {}) {
  const t = copy(options), conflicts = state.conflicts || [];
  const groups = [...new Set(conflicts.map(path => {
    const parts = path.split('/').filter(Boolean), key = parts[0] === 'data' ? parts[1] : parts[0];
    return t.conflictGroups[key] || t.conflictGroups.unknown;
  }))];
  return `<div class="cp-cloud-dialog" data-cloud-dialog="conflicts"><p>${esc(t.conflictNote)}</p><div class="cp-cloud-conflict-summary"><strong>${esc(t.conflictCount.replace('{count}', conflicts.length))}</strong><p>${esc(groups.join(' · '))}</p></div><div class="cp-cloud-conflict-actions">${button('cloud-resolve-local', t.local, 'primary', disabled(state))}${button('cloud-resolve-remote', t.remote, '', disabled(state))}</div><details class="cp-cloud-details"><summary>${esc(t.technical)}</summary><ul class="cp-cloud-technical">${conflicts.map(path => `<li>${esc(path)}</li>`).join('')}</ul></details>${footer(t)}</div>`;
}

export function cloudHelpMarkup(options = {}) {
  const t = copy(options);
  return `<div class="cp-cloud-dialog" data-cloud-dialog="help"><div class="cp-cloud-help">${['sync', 'backup', 'provider', 'foreground'].map(key => `<section><h3>${esc(t[`${key}HelpTitle`])}</h3><p>${esc(t[`${key}Help`])}</p></section>`).join('')}</div>${footer(t)}</div>`;
}
