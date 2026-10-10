import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CATALAN, catalan, catalanCopy } from '../src/companion/locale-ca.js';
import { setAppLanguage, ui, localizeMessage } from '../src/companion/locale.js';
import { MESSAGE_PAIRS } from '../src/companion/locale-messages.js';
import { languageForLocale, setLanguage, t } from '../src/i18n.js';
import { emptyData, validateData, stageLabel } from '../src/companion/model.js';
import { CATALOG, catalogPresentation } from '../src/companion/catalog.js';
import { HANON } from '../src/companion/warmups.js';

test('Catalan reader, operational messages and warm-ups have explicit resources', async () => {
  const source = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');
  // Evaluate only this repository-owned static resource object, never external input.
  const english = Function('return ({' + source.split('const STRINGS = {')[1].split('  es: {')[0] + '})')().en;
  for (const [key, value] of Object.entries(english)) {
    assert.ok(Object.hasOwn(CATALAN, value), `Missing Catalan reader label: ${key}`);
    assert.deepEqual([...catalan(value).matchAll(/\{\w+\}/g)].map(m => m[0]).sort(), [...value.matchAll(/\{\w+\}/g)].map(m => m[0]).sort());
  }
  for (const [value] of MESSAGE_PAIRS) assert.ok(Object.hasOwn(CATALAN, value), value);
  for (const exercise of HANON) assert.ok(Object.hasOwn(CATALAN, exercise.focus[0]));
  assert.equal(languageForLocale('ca-ES'), 'ca');
  assert.equal(languageForLocale('en-US'), 'en');
  assert.deepEqual(catalanCopy(['M','T','W','T','F','S','S']), ['dl.','dt.','dc.','dj.','dv.','ds.','dg.']);
  const previous = globalThis.document;
  globalThis.document = { documentElement: { lang: '' } };
  try { setLanguage('ca'); assert.equal(t('selfPacedLine'), 'Sense tempo · completa la línia'); }
  finally { setLanguage('en'); globalThis.document = previous; }
});

test('Catalan presentation preserves notebook data, original titles and unknown diagnostics', () => {
  const data = emptyData(); data.preferences.language = 'ca';
  const before = structuredClone(data);
  setAppLanguage('ca');
  try {
    assert.deepEqual(validateData(data), before);
    assert.equal(ui('Today', 'Hoy'), 'Avui');
    assert.equal(stageLabel('En estudio'), 'En estudi');
    assert.equal(ui('Block 2 of 4', ''), 'Bloc 2 de 4');
    assert.equal(ui('<label>Title<input name="title"></label>', ''), '<label>Títol<input name="title"></label>');
    assert.equal(localizeMessage('Invalid XML: Unrecognized source diagnostic'), 'XML no vàlid: Unrecognized source diagnostic');
    assert.equal(localizeMessage('El archivo no es un PDF válido.'), 'Aquest fitxer no és un PDF vàlid.');
    assert.equal(localizeMessage('My original musical title'), 'My original musical title');
    const originals = structuredClone(CATALOG);
    for (const item of CATALOG) {
      const shown = catalogPresentation(item, 'ca');
      assert.equal(shown.title, item.title); assert.equal(shown.id, item.id);
      assert.equal(shown.download, item.download);
      for (const field of ['keyLabel', 'reason', 'passage']) assert.ok(Object.values(CATALAN).includes(shown[field]), `${item.id}: ${field}`);
    }
    assert.deepEqual(CATALOG, originals);
  } finally { setAppLanguage('en'); }
});
