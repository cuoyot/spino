import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { setLanguage, t } from '../src/i18n.js';

test('every English reader label has an explicit Spanish translation with matching placeholders', async () => {
  const source = await readFile(new URL('../src/i18n.js', import.meta.url), 'utf8');
  const english = source.split('  en: {')[1].split('  es: {')[0];
  const spanish = source.split('  es: {')[1].split('  it: {')[0];
  const keys = text => [...text.matchAll(/\b(\w+):\s*['"]/g)].map(match => match[1]).sort();
  assert.deepEqual(keys(spanish), keys(english));
  const prior = globalThis.document;
  globalThis.document = { documentElement: { lang: '' } };
  try {
    for (const key of keys(english)) {
      const placeholders = Object.fromEntries(['n', 'k', 'ok', 'total', 'name', 'next', 'p'].map(name => [name, `{${name}}`]));
      setLanguage('en'); const en = t(key, placeholders);
      setLanguage('es'); const es = t(key, placeholders);
      assert.deepEqual([...es.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), [...en.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort(), key);
      assert.notEqual(es, key, `${key} must not fall back to its identifier`);
    }
    assert.equal(t('exercisePages'), 'Páginas del ejercicio');
    assert.equal(t('previousPageButton'), '‹ Anterior');
    assert.equal(t('nextPageButton'), 'Siguiente ›');
  } finally {
    setLanguage('en');
    if (prior === undefined) delete globalThis.document; else globalThis.document = prior;
  }
});
