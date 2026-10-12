import { Capacitor, registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { ui } from './locale.js';
const AppActions = registerPlugin('AppActions');
export const APP_URL='https://spinoapp.com/';
export const PLAY_URL='https://play.google.com/store/apps/details?id=com.miguecoll.spino';
export async function rateApp() {
  if(Capacitor.getPlatform()==='ios' && Capacitor.isPluginAvailable('AppActions')) { await AppActions.requestReview(); return; }
  window.open(PLAY_URL,'_blank','noopener,noreferrer');
}
export async function shareApp() {
  if(Capacitor.isPluginAvailable('Share')) { await Share.share({title:'SPino',text:ui('Practice piano with SPino.','Practica piano con SPino.'),url:APP_URL,dialogTitle:ui('Share SPino','Compartir SPino')});return true; }
  if(navigator.share){await navigator.share({title:'SPino',url:APP_URL});return true;}
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(APP_URL);return false;}
  window.prompt(ui('Copy this link to share SPino.','Copia este enlace para compartir SPino.'),APP_URL);return false;
}
