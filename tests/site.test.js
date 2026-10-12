import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { COPY, page } from '../scripts/site/build-site.mjs';

test('website language variants use matching feature coverage and localized app screenshots', () => {
  for (const [language, copy] of Object.entries(COPY)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(COPY.en).sort());
    assert.deepEqual(copy.features.map(f => f[0]), COPY.en.features.map(f => f[0]));
    assert.equal(copy.shotAlt.length, 6);
    const html = page(copy), folder = language === 'es' ? resolve('site') : resolve('site', language);
    assert.match(html, new RegExp(`<html lang="${language}">`));
    assert.match(html, new RegExp(`img/${language}/01-today.png`));
    const features=html.match(/<section id="features">([\s\S]*?)<\/section>/)[1];
    assert.equal((features.match(/class="feature"/g) || []).length,copy.features.length);
    for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^(https?:|#|mailto:)/.test(reference)) continue;
      const pathname = reference.split('?')[0];
      const local = resolve(folder, pathname, pathname.endsWith('/') ? 'index.html' : '');
      assert.ok(existsSync(local), `${language}: missing ${reference} (${dirname(local)})`);
    }
  }
});
