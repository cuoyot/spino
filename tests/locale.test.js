import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_LANGUAGES, getAppLanguage, setAppLanguage, ui, localizeMessage } from '../src/companion/locale.js';
import { emptyData, validateData, CONTEXTS, ACTIVITIES, STAGES, stageLabel, eventTypeLabel } from '../src/companion/model.js';
import { HANDS, RANGE_LEVELS } from '../src/companion/practice-defaults.js';
import { identityMarkup } from '../src/companion/profile-view.js';

test('profile language persists without changing historical identifiers or requiring migration', () => {
  const old = emptyData();
  assert.doesNotThrow(() => validateData(old));
  for (const language of Object.keys(APP_LANGUAGES)) {
    const data = { ...old, preferences: { ...old.preferences, language } };
    assert.equal(validateData(data).preferences.language, language);
  }
  assert.throws(() => validateData({ ...old, preferences: { ...old.preferences, language: 'invalid' } }));
  const ids = HANDS.map(([id]) => id), stages = [...STAGES];
  setAppLanguage('es');
  assert.equal(getAppLanguage(), 'es');
  assert.equal(Object.fromEntries(Object.entries(CONTEXTS)).mobile, 'Sin piano');
  assert.equal(ACTIVITIES.reading, 'Lectura');
  assert.equal(HANDS[2][1], 'Las dos manos juntas');
  assert.equal(RANGE_LEVELS[0][1], 'Registro reducido');
  assert.equal(stageLabel('En estudio'), 'En estudio');
  assert.equal(eventTypeLabel('Audición'), 'Audición');
  assert.match(identityMarkup({ ...old.preferences, language: 'es' }), /Idioma<select name="language">/);
  assert.match(identityMarkup({ ...old.preferences, language: 'es' }), /value="es" selected/);
  setAppLanguage('en');
  assert.equal(ui('Saved', 'Guardado'), 'Saved');
  assert.equal(stageLabel('En estudio'), 'Learning');
  assert.equal(eventTypeLabel('Audición'), 'Audition');
  assert.deepEqual(HANDS.map(([id]) => id), ids);
  assert.deepEqual(STAGES, stages);
  assert.match(identityMarkup(old.preferences), /Language<select name="language">/);
  assert.equal(localizeMessage('El archivo no es un PDF válido.'), 'This file is not a valid PDF.');
  assert.equal(localizeMessage('My original title'), 'My original title');
});

test('Drive revision diagnostics are localized in Spanish and Catalan, including persisted old errors',()=>{
 const messages=[
  'The Drive notebook changed. Reading the latest changes before retrying.',
  'The Drive notebook changed during download. Retry connecting. Your local notebook is kept.',
  'The Drive notebook kept changing during download. Retry connecting. Your local notebook is kept.',
  'Drive rejected the notebook upload because its revision changed. Retry connecting. Your local notebook is kept.',
  'Drive could not finalize the notebook connection because its revision changed. Retry connecting. Your local notebook is kept.'
 ];
 for(const message of messages)for(const locale of ['es','ca'])assert.notEqual(localizeMessage(message,locale),message);
});
