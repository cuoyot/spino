import {automaticBackupCopy} from './automatic-backup-copy.js';
import { extraCopy } from './locale-extra.js';
import { MESSAGE_PAIRS, MESSAGE_PATTERNS } from './locale-messages.js';
import { catalan, catalanCopy } from './locale-ca.js';

// One runtime language for the notebook, score viewers and managed practice.
export const APP_LANGUAGES = { en: 'English', es: 'Español', ca: 'Català', de: 'Deutsch', hu: 'Magyar' };
let language = 'en';
export const getAppLanguage = () => language;
export const localize = (english, spanish, locale = language) => locale === 'ca' ? catalanCopy(english) : locale === 'es' ? spanish : extraCopy(english, locale);
export const ui = (english, spanish) => localize(english, spanish);
export function setAppLanguage(value) {
  language = Object.hasOwn(APP_LANGUAGES, value) ? value : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('spino:language', { detail: language }));
  return language;
}

// Translate known operational errors at presentation time, including persisted jobs.
// Unknown source diagnostics and musical/user content are never rewritten.
const messages = [
  ['Could not open the file save dialog.', 'No se ha podido abrir el diálogo para guardar el archivo.'],
  ['Could not save the file. Choose a destination and try again.', 'No se ha podido guardar el archivo. Elige un destino y vuelve a intentarlo.'],
  ['The file is not ready to save.', 'El archivo todavía no está preparado para guardar.'],
  ['The connected notebook changed. Try again.', 'El cuaderno conectado ha cambiado. Reinténtalo.'],
  ['The PDF must be smaller than 20 MB.', 'El PDF debe ocupar menos de 20 MB.'],
  ['This file is not a valid PDF.', 'El archivo no es un PDF válido.'],
  ['The score annotations are invalid or exceed the limit.', 'Las anotaciones de esta partitura no son válidas o superan el límite.'],
  ['The score framing is invalid.', 'El encuadre de la partitura no es válido.'],
  ['The backup exceeds the 60 MB limit.', 'La copia supera el máximo de 60 MB.'],
  ['The source could not provide the file.', 'La fuente no ha podido entregar el archivo.'],
  ['The data could not be saved.', 'No se pudieron guardar los datos.'],
  ['No internet connection.', 'Sin conexión a Internet.'],
  ['Offline.', 'Sin conexión.'],
  ['Failed to fetch', 'No se pudo conectar con la fuente.'],
  ['WIFI_REQUIRED', 'Conecta a una red Wi-Fi o permite datos móviles en Descargas.'],
  ...MESSAGE_PAIRS,
];
export function localizeMessage(message, locale = language) {
  const value = String(message ?? '');
  const automaticErrors={'Choose a backup folder different from the notebook folder.':'sameFolder','Automatic local backups are available in the Android app.':'localUnavailable','Could not save the automatic backup on this device.':'saveLocalError'};
  if(automaticErrors[value])return automaticBackupCopy(locale)[automaticErrors[value]];
  const known = messages.find(pair => pair.includes(value));
  if (known) return localize(known[0], known[1], locale);
  for (const { pattern, translate } of MESSAGE_PATTERNS) {
    const match = value.match(pattern);
    if (match) {
      const translated = translate(match, locale === 'ca' ? 'en' : locale, nested => localizeMessage(nested, locale));
      return locale === 'ca' ? catalan(translated) : extraCopy(translated, locale);
    }
  }
  return value;
}
