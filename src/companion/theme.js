import { SystemBars, Capacitor, registerPlugin } from '@capacitor/core';
import './theme.css';
const Notebook = registerPlugin('Notebook');
const media = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
let preference = 'dark';
export function applyTheme(mode = 'dark') {
  preference = ['light','dark','system'].includes(mode) ? mode : 'dark';
  const dark = preference === 'dark' || preference === 'system' && !!media?.matches;
  const resolved = dark ? 'dark' : 'light';
  const changed = document.documentElement.dataset.theme !== resolved;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', dark ? '#14161a' : '#f3f5fa');
  try { localStorage.setItem('spino.theme',preference); } catch {}
  if (changed && Capacitor.getPlatform()==='android' && Capacitor.isPluginAvailable('Notebook')) void Notebook.applyAppearance({dark}).catch(()=>{});
  if (changed && Capacitor.isNativePlatform()) void SystemBars.setStyle({style:dark?'LIGHT':'DARK'}).catch(()=>{});
}
media?.addEventListener('change',()=>{if(preference==='system')applyTheme('system');});
if(typeof document!=='undefined') { try { preference=localStorage.getItem('spino.theme')||'dark'; } catch {} applyTheme(preference); }
