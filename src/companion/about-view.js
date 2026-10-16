import { APP_VERSION } from './app-version.js';
import { localize } from './locale.js';
import release610beta1 from '../../docs/releases/6.1.0-beta.1.md?raw';
import release610beta7 from '../../docs/releases/6.1.0-beta.7.md?raw';
import release524 from '../../docs/play-store/release-5.2.4.md?raw';
import release525 from '../../docs/play-store/release-5.2.5.md?raw';
import release526 from '../../docs/play-store/release-5.2.6.md?raw';
import release527 from '../../docs/play-store/release-5.2.7.md?raw';
import release521 from '../../docs/play-store/release-5.2.1.md?raw';
import release522 from '../../docs/play-store/release-5.2.2.md?raw';
import release523 from '../../docs/play-store/release-5.2.3.md?raw';
import release520 from '../../docs/play-store/release-5.2.0.md?raw';
import listing from '../../docs/play-store/listing.md?raw';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const section = (text, heading) => text.split(heading)[1]?.split(/\n## /)[0]?.trim() || '';
const listingNotes = language => listing.split(`<!-- field:${language}:notes -->`)[1]?.split('<!-- /field -->')[0]?.trim() || '';

// Keep the full maintained release copy, rather than a second abbreviated changelog.
export function aboutMarkup(lang = 'en') {
  const es = lang === 'es', word = (en, spanish) => localize(en, spanish, lang);
  const history = [
    ['6.1.0-beta.7', section(release610beta7, '## Release notes')],
    ['6.1.0-beta.1', section(release610beta1, '## Release notes')],
    ['5.2.7', section(release527, lang === 'ca' ? '## Release notes (Catalan)' : es ? '## Release notes (Spanish)' : '## Release notes (English)')],
    ['5.2.6', section(release526, lang === 'ca' ? '## Release notes (Catalan)' : es ? '## Release notes (Spanish)' : '## Release notes (English)')],
    ['5.2.5', section(release525, lang === 'ca' ? '## Release notes (Catalan)' : es ? '## Release notes (Spanish)' : '## Release notes (English)')],
    ['5.2.4', section(release524, lang === 'ca' ? '## Release notes (Catalan)' : es ? '## Release notes (Spanish)' : '## Release notes (English)')],
    ['5.2.3', section(release523, es ? '## Release notes (Spanish)' : '## Release notes (English)')],
    ['5.2.2', section(release522, es ? '## Release notes (Spanish)' : '## Release notes (English)')],
    ['5.2.1', section(release521, es ? '## Play release notes (Spanish)' : '## Play release notes (English)')],
    ['5.2.0', section(release520, es ? '## Release notes (Spanish)' : '## Release notes (English)')],
    ['5.1.1', listingNotes('en')],
    ['5.1.0', listingNotes('es')],
    ['5.0.0', word('First SPino notebook candidate: planning, practice history, repertoire and local scores. Detailed release notes were not archived.', 'Primera versión candidata del cuaderno SPino: planificación, historial de práctica, repertorio y partituras locales. No se conservaron notas de versión detalladas.')],
    ['4.0', word('Earlier application version. Detailed release notes were not archived.', 'Versión anterior de la aplicación. No se conservaron notas de versión detalladas.')]
  ];
  const libraries = [
    ['SPino · GPL-3.0-or-later', './licenses/spino-gpl-3.0.txt'],
    ['Capacitor', 'https://github.com/ionic-team/capacitor'],
    ['VexFlow', 'https://github.com/vexflow/vexflow'],
    ['PDF.js', './pdfjs/LICENSE'],
    ['OpenSheetMusicDisplay', './repertoire/licenses/opensheetmusicdisplay.txt'],
    ['Tesseract.js / OCR', './licenses/ocr-notices.txt'],
    ['fix-webm-duration', './licenses/webm-duration-mit.txt'],
    ['OpenScore', './repertoire/provenance/OpenScore-CC0-1.0.txt'],
    ['xmldom', './repertoire/licenses/@xmldom-xmldom.txt'],
    ['fflate', './repertoire/licenses/fflate.txt'],
    ['Ajv', './repertoire/licenses/ajv.txt'],
    ['Ajv formats', './repertoire/licenses/ajv-formats.txt']
  ];
  return `<div class="cp-about"><p>SPino · ${esc(APP_VERSION)}<br><span class="muted">Smart Piano Notebook</span></p><section><h2>${word('Credits','Créditos')}</h2><p>${word('Built with open-source tools. Thank you to their authors and contributors.', 'Desarrollado con herramientas de código abierto. Gracias a sus autores y colaboradores.')}</p><ul>${libraries.map(([name,url])=>`<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a></li>`).join('')}</ul></section><section><h2>${word('Release notes','Notas de versión')}</h2><p class="muted">${word('Archived notes in their original language. Local changes not yet packaged are not a new release.', 'Notas archivadas en su idioma original. Los cambios locales aún no empaquetados no son una nueva versión.')}</p>${history.map(([version,notes], i)=>`<details ${i===0?'open':''}><summary>${esc(version)}${version===APP_VERSION?' · '+word('Current version','Versión actual'):''}</summary><pre>${esc(notes)}</pre></details>`).join('')}</section><div class="cp-actions"><button type="button" data-action="close-dialog">${word('Close','Cerrar')}</button></div></div>`;
}
