import { LocalNotifications } from '@capacitor/local-notifications';
import { createReminderScheduler } from './reminders.js';
import { effectiveWifiOnly } from './network-policy.js';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { CloudBackup, cloudAvailable } from './cloud-backup.js';
import { getAppLanguage } from './locale.js';
export const Native = registerPlugin('Notebook');
const AppActions = registerPlugin('AppActions');
// Notebook provides Android-specific services; iOS uses individual Capacitor plugins.
export const native = Capacitor.isPluginAvailable('Notebook');
export const remindersAvailable = native || Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('LocalNotifications');
const syncIOSReminders = createReminderScheduler(LocalNotifications);
export async function practiceScreenAwake(enabled) {
  if (Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('AppActions')) await AppActions.practiceScreenAwake({enabled});
  else if (native) await Native.practiceScreenAwake({ enabled });
}
export async function scoreFullscreen() {
  let owned = false;
  const enter = async () => {
    if (native) { await Native.scoreFullscreen({ enabled: true }); owned = true; }
    else if (!document.fullscreenElement && document.fullscreenEnabled) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); owned = true;
    }
  };
  // Browsers may require a fresh user gesture; the viewer provides another entry button.
  await enter().catch(() => {});
  return { enter, exit: async () => {
    if (!owned) return;
    if (native) await Native.scoreFullscreen({ enabled: false });
    else if (document.fullscreenElement) await document.exitFullscreen();
  } };
}
export async function exportFile(name, text) {
  if (native) return Native.exportFile({ name, text });
  if (cloudAvailable()) return CloudBackup.create({ name, text, link: false });
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export async function importFile() {
  if (native) return (await Native.importFile()).text;
  if (cloudAvailable()) return (await CloudBackup.pickBackup()).text;
  return new Promise((resolve, reject) => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.oncancel = () => resolve(null);
    input.onchange = async () => { try { if (input.files[0]?.size > 60000000) throw new Error('La copia supera el máximo de 60 MB.'); resolve(await input.files[0]?.text()); } catch (e) { reject(e); } };
    input.click();
  });
}
export async function openPDF(asset) {
  if (native) return Native.openPDF({ name: asset.name, base64: asset.base64, language: getAppLanguage() });
  const bytes = Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function networkStatus() {
  if (native) return Native.networkStatus();
  const connection = navigator.connection;
  return { online: navigator.onLine, wifi: connection?.type ? connection.type === 'wifi' : null, metered: connection?.saveData || false };
}
export async function downloadPDF(url, { id = crypto.randomUUID(), wifiOnly = true, signal, onProgress = () => {} } = {}) {
  wifiOnly = effectiveWifiOnly(wifiOnly);
  if (native) {
    const listener = await Native.addListener('downloadProgress', event => { if (event.id === id) onProgress(event); });
    const cancel = () => { Native.cancelDownload({ id }).catch(() => {}); };
    signal?.addEventListener('abort', cancel, { once: true });
    try { signal?.throwIfAborted(); return (await Native.downloadPDF({ url, id, wifiOnly })).base64; }
    finally { signal?.removeEventListener('abort', cancel); await listener.remove(); }
  }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  const timeout = setTimeout(cancel, 30000);
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    signal?.throwIfAborted();
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit' });
    if (!response.ok) throw new Error('La fuente no ha podido entregar el archivo.');
    const total = Number(response.headers.get('Content-Length')) || 0;
    if (total > 20000000) throw new Error('El PDF debe ocupar menos de 20 MB.');
    const reader = response.body.getReader(), chunks = []; let loaded = 0;
    while (true) {
      if (wifiOnly && !(await networkStatus()).wifi) { controller.abort(); throw new Error('WIFI_REQUIRED'); }
      const { done, value } = await reader.read(); if (done) break;
      loaded += value.length;
      if (loaded > 20000000) { controller.abort(); throw new Error('El PDF debe ocupar menos de 20 MB.'); }
      chunks.push(value); onProgress({ loaded, total });
    }
    return fileBase64(new Blob(chunks, { type: 'application/pdf' }));
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', cancel); }
}
export async function fileBase64(file) {
  if (file.size > 20000000) throw new Error('El PDF debe ocupar menos de 20 MB.');
  const buffer = await file.arrayBuffer();
  const header = new TextDecoder().decode(buffer.slice(0, 5));
  if (header !== '%PDF-') throw new Error('El archivo no es un PDF válido.');
  let binary = ''; const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export async function syncReminders(data, requestPermission = false) {
  if (Capacitor.getPlatform() === 'ios' && remindersAvailable) return syncIOSReminders(data, requestPermission, getAppLanguage());
  if (!native) return { enabled: false, browser: true };
  const items = [...data.plans.filter(p => p.status === 'planned'), ...data.events].filter(x => x.reminder && x.time).map(x => ({ id: x.id, title: x.title, language: getAppLanguage(), at: new Date(`${x.date}T${x.time}:00`).getTime() - 15 * 60000 })).filter(x => x.at > Date.now());
  return Native.reminders({ items, requestPermission });
}
