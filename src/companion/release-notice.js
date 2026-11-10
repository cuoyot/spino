import { escapeHTML as esc } from './views.js';

export const RELEASE_NOTICE_KEY = 'spino.release-notice.v1';

// Installation-local state stays separate from the notebook and cloud backups.
export function createReleaseNoticeState({ storage, version, existingNotebook }) {
  let pending = false;
  try {
    const series = value => String(value || '').match(/^(\d+\.\d+)(?:\.|-|$)/)?.[1];
    const current = series(version), seen = series(storage.getItem(RELEASE_NOTICE_KEY));
    pending = Boolean(existingNotebook && current && seen && seen !== current);
    if (!pending && current) storage.setItem(RELEASE_NOTICE_KEY, current);
  } catch { /* Unavailable preference storage must not create repeated prompts. */ }
  return {
    get pending() { return pending; },
    acknowledge() {
      pending = false;
      try { storage.setItem(RELEASE_NOTICE_KEY, version.match(/^(\d+\.\d+)/)?.[1] || version); } catch {}
    },
  };
}

const COPY = {
  en: { title: 'What’s new in SPino', interface: 'A clearer interface', interfaceText: 'More readable Calendar, Library and Progress screens, with clearer practice controls.', catalogue: 'An easier catalogue', catalogueText: 'Find and organize scores and choose the edition you want to practise.', xml: 'More comfortable MusicXML reading', xmlText: 'Choose instruments, zoom from 20 to 300%, and show or hide names, credits and fingering.', feedback: 'Your opinion will help us make SPino even better.', rate: 'Rate SPino', next: 'Continue' },
  es: { title: 'Novedades de SPino', interface: 'Una interfaz más clara', interfaceText: 'Calendario, Biblioteca y Progreso más legibles, con controles de práctica más claros.', catalogue: 'Un catálogo más cómodo', catalogueText: 'Encuentra y organiza partituras y elige la edición que quieres practicar.', xml: 'Mejor lectura de MusicXML', xmlText: 'Elige instrumentos, ajusta el zoom del 20 al 300 % y muestra u oculta nombres, créditos y digitaciones.', feedback: 'Tu opinión nos ayudará a mejorar aún más SPino.', rate: 'Valorar SPino', next: 'Continuar' },
  ca: { title: 'Novetats de SPino', interface: 'Una interfície més clara', interfaceText: 'Calendari, Biblioteca i Progrés més llegibles, amb controls de pràctica més clars.', catalogue: 'Un catàleg més còmode', catalogueText: 'Troba i organitza partitures i tria l’edició que vols practicar.', xml: 'Millor lectura de MusicXML', xmlText: 'Tria instruments, ajusta el zoom del 20 al 300 % i mostra o amaga noms, crèdits i digitacions.', feedback: 'La teva opinió ens ajudarà a millorar encara més SPino.', rate: 'Valora SPino', next: 'Continua' },
  de: { title: 'Neu in SPino', interface: 'Eine übersichtlichere Oberfläche', interfaceText: 'Kalender, Bibliothek und Fortschritt sind besser lesbar und die Übungssteuerung ist klarer.', catalogue: 'Ein einfacherer Katalog', catalogueText: 'Noten finden und ordnen sowie die gewünschte Ausgabe zum Üben wählen.', xml: 'Angenehmeres Lesen von MusicXML', xmlText: 'Instrumente wählen, von 20 bis 300 % zoomen und Namen, Angaben und Fingersätze ein- oder ausblenden.', feedback: 'Deine Meinung hilft uns, SPino weiter zu verbessern.', rate: 'SPino bewerten', next: 'Weiter' },
  hu: { title: 'A SPino újdonságai', interface: 'Áttekinthetőbb felület', interfaceText: 'Jobban olvasható naptár, könyvtár és fejlődési nézet, egyértelműbb gyakorlási vezérlőkkel.', catalogue: 'Kényelmesebb katalógus', catalogueText: 'Kották keresése és rendezése, valamint a gyakorolni kívánt kiadás kiválasztása.', xml: 'Kényelmesebb MusicXML-olvasás', xmlText: 'Hangszerválasztás, 20–300%-os nagyítás, valamint elrejthető nevek, szerzői adatok és ujjrendek.', feedback: 'Véleményed segít a SPino további fejlesztésében.', rate: 'SPino értékelése', next: 'Folytatás' },
};
export const releaseNoticeCopy = language => COPY[language] || COPY.en;
export function releaseNoticeMarkup(version, language) {
  const c = releaseNoticeCopy(language);
  return `<section class="cp-release-notice" data-release-notice><p class="cp-release-version">SPino ${esc(version)}</p><ul class="cp-release-list">${[['interface','interfaceText'],['catalogue','catalogueText'],['xml','xmlText']].map(([title,text])=>`<li><strong>${esc(c[title])}</strong><p>${esc(c[text])}</p></li>`).join('')}</ul><p class="cp-release-feedback">${esc(c.feedback)}</p><div class="cp-actions cp-release-actions"><button type="button" class="primary" data-action="close-dialog">${esc(c.next)}</button><button type="button" data-action="release-notice-rate">${esc(c.rate)}</button></div></section>`;
}
