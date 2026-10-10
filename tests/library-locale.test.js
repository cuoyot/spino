import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setAppLanguage } from '../src/companion/locale.js';
import { importLibrary, catalogueRecords, digest } from '../src/companion/library.js';
import { libraryMarkup, scoreStatus, downloadStatus } from '../src/companion/library-browse.js';
import { libraryDetailMarkup, libraryDownloadMarkup } from '../src/companion/library-view.js';
import { createLibraryUI } from '../src/companion/library-ui.js';
import { downloadMarkup } from '../src/companion/download-view.js';
import { repertoireMarkup, parseTags } from '../src/companion/repertoire.js';
import { emptyData } from '../src/companion/model.js';
import { escapeHTML as esc } from '../src/companion/views.js';
import { processScore } from '../src/companion/library-pipeline.js';
import { bytesToBase64 } from '../src/companion/musicxml-document.js';
import { mxlFixture } from './musicxml-fixture.js';
import { CATALOG, catalogPresentation } from '../src/companion/catalog.js';

const library = await importLibrary({ read: path => readFile(`Exercises_Library/${path}`, 'utf8') });
const record = catalogueRecords(library).find(piece => piece.assets.length);
const bytes = mxlFixture(), sha256 = await digest(bytes);
const analyzed = await processScore({ pieceId: record.piece_id, sourceAssetId: record.assets[0].asset_id, sha256, format: 'mxl', base64: bytesToBase64(bytes) }, record);
const local = () => {
  const value = structuredClone(library);
  value.executions[record.piece_id] = { ...structuredClone(analyzed), assetId: 'local-score', sourceAssetId: record.assets[0].asset_id, sha256 };
  return value;
};
const visibleText = html => html.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/g, '').replace(/<[^>]*>/g, ' ');
afterEach(() => setAppLanguage('en'));

test('catalogue and advanced score detail follow the current language and keep source data untouched', () => {
  const data = local(), before = structuredClone(data);
  setAppLanguage('es');
  assert.match(libraryMarkup(data), /Biblioteca de partituras/);
  const detail = libraryDetailMarkup(data, record.piece_id);
  assert.match(detail, /Fuentes, derechos y créditos/);
  assert.match(detail, /Compases escritos/);
  assert.match(detail, /Revisar derechos de la edición/);
  assert.match(detail, /Métricas, versiones y avisos/);
  assert.match(detail, /Revisar pasaje/);
  assert.doesNotMatch(visibleText(detail), /Parts and reviews|Written measures|Review excerpt|Sources, rights and credits|pending calibration/);
  assert.ok(detail.includes(esc(record.display_title)));
  assert.ok(detail.includes(esc(record.rights.attribution)));
  assert.deepEqual(data, before);
  assert.match(libraryDetailMarkup(data, 'missing'), /No se encuentra/);
  assert.match(libraryDetailMarkup(data, record.piece_id, false, 'en'), /Sources, rights and credits/);
  setAppLanguage('en');
  assert.match(libraryMarkup(data), /Score library/);
  assert.match(libraryDetailMarkup(data, record.piece_id), /Written measures/);
});

test('PDF and MusicXML transfers localize visible state, actions, errors and progress labels', () => {
  const data = emptyData(), lib = local();
  data.downloadJobs = [{ catalogId: 'test', status: 'downloading', error: 'Failed to fetch' }];
  lib.executions[record.piece_id].job = { status: 'downloading', error: 'Failed to fetch' };
  setAppLanguage('es');
  const pdf = downloadMarkup(data, true), xml = libraryDownloadMarkup(lib);
  for (const html of [pdf, xml]) {
    assert.match(html, /Descargando/);
    assert.match(html, /Pausar/);
    assert.match(html, /aria-label="Progreso de descarga/);
    assert.doesNotMatch(html, /Failed to fetch|Download progress|Score download progress|>downloading</);
  }
  assert.match(scoreStatus(record, { job: { status: 'queued' } }, {}), /Descarga en cola/);
  assert.equal(downloadStatus('paused'), 'En pausa');
  assert.equal(downloadStatus('complete', 'en'), 'Available offline');
  setAppLanguage('en');
  assert.match(downloadMarkup(data, true), /Unmetered Wi-Fi only/);
  assert.match(libraryDownloadMarkup(lib), /MusicXML \/ MXL transfers/);
});

test('repertoire filters translate stored stage labels without modifying titles, tags or stable values', () => {
  const data = emptyData();
  data.works = [{ id: 'w', title: 'The Entertainer', composer: 'Scott Joplin', stage: 'En estudio', tags: ['Recital'], favorite: true }];
  const opts = items => items.map(([value, label]) => `<option value="${esc(value)}">${esc(label)}</option>`).join('');
  const btn = (action, label) => `<button data-action="${action}">${label}</button>`;
  const render = () => repertoireMarkup(data, {}, 0, { esc, opts, btn });
  const before = structuredClone(data);
  setAppLanguage('es');
  assert.match(render(), /Todas las obras/);
  assert.doesNotMatch(render(), /Quitar de favoritas/);
  assert.match(render(), /Borrar filtros/);
  assert.doesNotMatch(render(), /All works|Collection|Clear filters/);
  assert.throws(() => parseTags('a'.repeat(41)), /Usa hasta 20 etiquetas/);
  setAppLanguage('en');
  assert.match(render(), /value="En estudio">Learning/);
  assert.doesNotMatch(render(), /Remove from favorites/);
  assert.deepEqual(data, before);
});

test('catalogue dialogs, validation and review buttons use the selected language', async () => {
  const lib = local();
  let shown;
  const ui = createLibraryUI({ getLibrary: () => lib, showDialog: (title, html, submit) => { shown = { title, html, submit }; }, pauseTransfers: async () => {} });
  setAppLanguage('es');
  ui.actions['library-parts'](record.piece_id);
  assert.equal(shown.title, 'Seleccionar partes de piano');
  assert.match(shown.html, /Asignación de manos revisada/);
  assert.match(shown.html, /Analizar selección/);
  await assert.rejects(() => shown.submit(new FormData()), /Selecciona al menos una parte/);
  ui.actions['library-rights'](record.piece_id);
  assert.match(shown.html, /Guardar revisión/);
  assert.match(shown.html, /Cancelar/);
  assert.doesNotMatch(shown.html, /Save review|Reviewer|Decision/);
  ui.actions['library-attach'](record.piece_id);
  assert.match(shown.title, /Adjuntar una edición/);
  assert.match(shown.html, /Fuente \(URL o referencia\)/);
  setAppLanguage('en');
  ui.actions['library-parts'](record.piece_id);
  assert.equal(shown.title, 'Select piano parts');
  assert.match(shown.html, /Analyze selection/);
});

test('reviewed PDF guidance translates without rewriting titles, edition evidence, downloads or catalog IDs', () => {
  const original = structuredClone(CATALOG);
  for (const lang of ['en', 'es']) {
    setAppLanguage(lang);
    for (const source of CATALOG) {
      const presented = catalogPresentation(source);
      for (const key of Object.keys(source).filter(key => !['keyLabel', 'reason', 'passage'].includes(key))) {
        assert.deepEqual(presented[key], source[key], `${lang}: ${source.id}: ${key}`);
      }
      assert.match(presented.keyLabel, lang === 'es' ? /mayor|menor|sin clasificar/ : /major|minor|not classified/);
      assert.match(presented.passage, lang === 'es' ? /Primera frase/ : /First phrase|Opening phrase/);
    }
  }
  assert.deepEqual(CATALOG, original);
  assert.equal(catalogPresentation(CATALOG[0], 'es').reason, CATALOG[0].reason);
  assert.equal(catalogPresentation(CATALOG[2], 'en').reason, CATALOG[2].reason);
});
