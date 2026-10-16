import { escapeHTML as esc } from './views.js';
import { getAppLanguage } from './locale.js';

export const validNotebookId = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export function encodeDeviceLink({id,name}) {
  if (!validNotebookId(id) || typeof name !== 'string' || !name.trim() || name.length>250) throw new Error('The notebook link is invalid.');
  return `SPINO-NOTEBOOK:1:${encodeURIComponent(JSON.stringify({id,name}))}`;
}
export function parseDeviceLink(text) {
  if (typeof text !== 'string' || text.length>4000 || !text.trim().startsWith('SPINO-NOTEBOOK:1:')) throw new Error('This is not a SPino notebook QR code.');
  let link;try {link=JSON.parse(decodeURIComponent(text.trim().slice(17)));}catch {throw new Error('The notebook link is invalid.');}
  encodeDeviceLink(link);
  return {id:link.id,name:link.name};
}
const messages={en:{blocked:'Disconnect the current notebook in Backup & sync before connecting another one.',manage:'Open Backup & sync',title:'Connect another device',show:'Show my notebook QR',scan:'Scan a notebook QR',manual:'Enter a connection code',hint:'Connect to the notebook on your other device. Scan its QR or select its sync file in the same cloud account.',grant:'Your cloud provider asks you to select the file once on the new device. The QR identifies the notebook; it does not contain a password or grant access to your cloud account.',ready:'Select this notebook',file:'Sync file',choose:'Select and connect',copy:'Copy connection code',close:'Done',create:'Set up cloud sync',setup:'Select the cloud file from the installed app.',shareHint:'On the other device, open Profile → Connect another device → Scan a notebook QR. Wait for your provider to finish uploading before connecting.',code:'Connection code',select:'Select an existing cloud file',continue:'Continue'},es:{blocked:'Desconecta el cuaderno actual en Copia y sincronización antes de conectar otro.',manage:'Abrir Copia y sincronización',title:'Conectar otro dispositivo',show:'Mostrar el QR de mi cuaderno',scan:'Escanear el QR de un cuaderno',manual:'Introducir un código de conexión',hint:'Conecta con el cuaderno de tu otro dispositivo. Escanea su QR o selecciona su archivo de sincronización en la misma cuenta de nube.',grant:'Tu proveedor te pedirá seleccionar el archivo una vez en el nuevo dispositivo. El QR identifica el cuaderno; no contiene contraseñas ni da acceso a tu cuenta de nube.',ready:'Selecciona este cuaderno',file:'Archivo de sincronización',choose:'Seleccionar y conectar',copy:'Copiar código de conexión',close:'Listo',create:'Configurar la sincronización',setup:'Selecciona el archivo de nube desde la app instalada.',shareHint:'En el otro dispositivo, abre Perfil → Conectar otro dispositivo → Escanear el QR de un cuaderno. Espera a que el proveedor termine de subir el archivo antes de conectar.',code:'Código de conexión',select:'Seleccionar un archivo de nube existente',continue:'Continuar'},ca:{blocked:'Desconnecta el quadern actual a Còpia i sincronització abans de connectar-ne un altre.',manage:'Obre Còpia i sincronització',title:'Connecta un altre dispositiu',show:'Mostra el QR del meu quadern',scan:'Escaneja el QR d’un quadern',manual:'Introdueix un codi de connexió',hint:'Connecta amb el quadern del teu altre dispositiu. Escaneja’n el QR o selecciona’n el fitxer de sincronització al mateix compte del núvol.',grant:'El proveïdor et demanarà seleccionar el fitxer una vegada al nou dispositiu. El QR identifica el quadern; no conté contrasenyes ni dona accés al teu compte.',ready:'Selecciona aquest quadern',file:'Fitxer de sincronització',choose:'Selecciona i connecta',copy:'Copia el codi de connexió',close:'Fet',create:'Configura la sincronització',setup:'Selecciona el fitxer del núvol des de l’app instal·lada.',shareHint:'A l’altre dispositiu, obre Perfil → Connecta un altre dispositiu → Escaneja el QR d’un quadern. Espera que el proveïdor acabi de pujar el fitxer abans de connectar.',code:'Codi de connexió',select:'Selecciona un fitxer existent del núvol',continue:'Continua'}};
export const deviceLinkCopy=(lang=getAppLanguage())=>messages[lang]||messages.en;
const button=(action,text)=>`<button type="button" data-action="${action}">${esc(text)}</button>`;
export function deviceLinkMarkup(state,{lang=getAppLanguage(),available=true}={}) {
  const t=deviceLinkCopy(lang);
  if(state.name)return `<div class="cp-device-link"><p>${esc(t.blocked)}</p>${button('profile-data-backup',t.manage)}${button('close-dialog',t.close)}</div>`;
  return `<div class="cp-device-link"><p>${esc(t.hint)}</p><div class="cp-cloud-options">${button('device-link-scan',t.scan)}${available?button('cloud-join-shared',t.select):`<p class="muted">${esc(t.setup)}</p>`}</div>${button('close-dialog',t.close)}</div>`;
}
export async function deviceLinkQRMarkup(link,lang=getAppLanguage(),drive=false) {
  const t=deviceLinkCopy(lang),code=encodeDeviceLink(link),{default:QR}=await import('qrcode');
  const image=await QR.toDataURL(code,{width:360,margin:4,errorCorrectionLevel:'M',color:{dark:'#000000',light:'#ffffff'}});
  return `<div class="cp-device-link"><p>${esc(drive?driveLinkHint(lang):t.shareHint)}</p><img class="cp-device-qr" src="${image}" alt="${esc(t.title)}"/><p><strong>${esc(t.file)}:</strong> ${esc(link.name)}</p><label>${esc(t.code)}<textarea readonly rows="3" id="device-link-code">${esc(code)}</textarea></label><div class="cp-actions">${button('device-link-copy',t.copy)}${button('close-dialog',t.close)}</div></div>`;
}
export function deviceLinkConfirmMarkup(link,lang=getAppLanguage(),drive=false) {
  const t=deviceLinkCopy(lang);return `<div class="cp-device-link"><p>${esc(t.ready)}</p><p class="cp-cloud-file"><strong>${esc(link.name)}</strong></p><p>${esc(drive?driveLinkHint(lang):t.grant)}</p><div class="cp-actions">${button('device-link-connect',t.choose)}${button('close-dialog',t.close)}</div></div>`;
}
export function deviceLinkManualMarkup(lang=getAppLanguage()) {const t=deviceLinkCopy(lang);return `<form class="cp-device-link"><label>${esc(t.code)}<textarea name="code" rows="4" maxlength="4000" required autocomplete="off" spellcheck="false"></textarea></label><div class="cp-actions"><button type="submit" class="primary">${esc(t.continue)}</button>${button('close-dialog',t.close)}</div></form>`;}
export async function startNotebookScanner(container, {signal,onScan,onError}) {
  const {Html5Qrcode,Html5QrcodeSupportedFormats}=await import('html5-qrcode');
  if(signal.aborted)return;
  const scanner=new Html5Qrcode(container.id,{formatsToSupport:[Html5QrcodeSupportedFormats.QR_CODE],verbose:false});
  let stopped=false,accepted=false,stopping=false;
  const stop=()=>{stopped=true;if(scanner.isScanning&&!stopping){stopping=true;try{void scanner.stop().catch(()=>{});}catch{}}};
  signal.addEventListener('abort',stop,{once:true});
  try {
    await scanner.start({facingMode:'environment'},{fps:8,qrbox:{width:220,height:220}},text=>{
      if(accepted||stopped)return;
      try {const link=parseDeviceLink(text);accepted=true;stop();onScan(link);}catch(error){onError(error);}
    },()=>{});
    if(stopped||signal.aborted)stop();
  }catch(error){if(!signal.aborted)onError(new Error('Camera unavailable. Allow camera access or enter the connection code.'));}
}

function driveLinkHint(lang){return ({en:"On the other device, connect the same Google account and choose this notebook in Google Drive. The QR identifies your notebook and grants no account access.",es:"En el otro dispositivo, conecta la misma cuenta de Google y elige este cuaderno en Google Drive. El QR identifica el cuaderno y no concede acceso a tu cuenta.",ca:"A l’altre dispositiu, connecta el mateix compte de Google i tria aquest quadern a Google Drive. El QR identifica el quadern i no dona accés al compte."})[lang]||driveLinkHint("en");}
