import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { setAppLanguage, localizeMessage } from '../src/companion/locale.js';
import { scoreControlsMarkup } from '../src/companion/score-controls.js';
import { scoreImportMarkup, bindScoreImport } from '../src/companion/score-import.js';
import { manualPracticeState } from '../src/companion/library-state.js';

afterEach(() => setAppLanguage('en'));

test('score toolbars translate the finish action, annotations and accessible labels in both languages', () => {
  const session = { finish() {} };
  for (const [language, finish, finger, previous, highlight, save] of [
    ['es', 'Terminar práctica', 'Dedo 3', 'Página anterior', 'Resaltar', 'Guardar encuadre'],
    ['en', 'Finish practice', 'Finger 3', 'Previous page', 'Highlight', 'Save frame'],
  ]) {
    setAppLanguage(language);
    const html = scoreControlsMarkup(session);
    for (const label of [finish, finger, previous, highlight, save]) assert.ok(html.includes(label), label);
    assert.ok(!html.includes(language === 'es' ? 'Finish practice' : 'Terminar práctica'));
    assert.ok(!html.includes(language === 'es' ? 'Annotation tools' : 'Herramientas de anotación'));
    assert.equal((html.match(/data-finger=/g) || []).length, 5);
    assert.equal((html.match(/data-color=/g) || []).length, 5);
  }
});

test('score attachment forms and retained-attachment notices follow the current language', () => {
  setAppLanguage('en');
  assert.match(scoreImportMarkup(), /Skip detection/);
  assert.match(scoreImportMarkup(), /Use suggestions/);
  assert.match(scoreImportMarkup(true), /The file and its annotations will be preserved/);
  setAppLanguage('es');
  assert.match(scoreImportMarkup(), /Omitir detección/);
  assert.match(scoreImportMarkup(), /Usar sugerencias/);
  assert.match(scoreImportMarkup(true), /Se conservarán el archivo y sus anotaciones/);
});

test('known PDF import failures are translated without changing the original file title', async () => {
  for (const [language, expected] of [['en', 'This file is not a valid PDF.'], ['es', 'El archivo no es un PDF válido.']]) {
    setAppLanguage(language);
    const elements = Object.fromEntries(['title', 'composer', 'bpm', 'tempoMark', 'score'].map(name => [name, {
      value: name === 'bpm' ? '80' : '', validationMessage: '', listeners: {},
      addEventListener(type, listener) { this.listeners[type] = listener; },
      setCustomValidity(message) { this.validationMessage = message; },
    }]));
    const nodes = new Map(['#cp-score-status', '[data-score=skip]', '[data-score=apply]', '[data-score=remove]', '#cp-score-help'].map(id => [id, {
      hidden: true, textContent: '', addEventListener() {},
    }]));
    const form = { elements, querySelector: selector => nodes.get(selector) };
    const binding = bindScoreImport(form);
    elements.score.files = [new File(['invalid data'], 'Nocturne original.pdf')];
    elements.score.listeners.change();
    for (let attempt = 0; attempt < 20 && elements.score.validationMessage !== expected; attempt++) await new Promise(resolve => setTimeout(resolve, 1));
    assert.equal(nodes.get('#cp-score-status').textContent, expected);
    assert.equal(elements.score.validationMessage, expected);
    assert.equal(elements.title.value, 'Nocturne original');
    assert.throws(() => binding.asset(), { message: expected });
    binding.dispose();
  }
});

test('catalogue pending states and nested score diagnostics translate without rewriting identifiers', () => {
  setAppLanguage('es');
  const pending = manualPracticeState({ assets: [{ asset_id: 'source-1' }] });
  assert.deepEqual(pending.reasons.map(message => localizeMessage(message)), [
    'Descarga y valida primero la partitura.',
    'Es necesario analizar la partitura y seleccionar las partes de piano.',
    'Selecciona e identifica las partes de piano antes de practicar.',
  ]);
  const raw = 'Analysis failed: P1, measure 42b: note duration/divisions missing.';
  assert.equal(localizeMessage(raw), 'Error de análisis: P1, compás 42b: faltan la duración de la nota o las divisiones.');
  assert.equal(localizeMessage('HTTP 429: source rate limit; retry after the indicated time.'), 'HTTP 429: la fuente limita las peticiones; reintenta después del plazo indicado.');
  assert.equal(localizeMessage('Backup could not be updated: The provider does not allow writing this backup.'), 'No se ha podido actualizar la copia: El proveedor no permite escribir esta copia.');
  assert.equal(localizeMessage('Backup could not be read: Provider code E314'), 'No se ha podido leer la copia: Provider code E314');
  setAppLanguage('en');
  assert.equal(localizeMessage(raw), raw);
  assert.equal(localizeMessage('No se pudo descargar: Descarga pausada.'), 'Could not download: Download paused.');
});
