import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { DOMParser } from '@xmldom/xmldom';
import { COPY, page } from '../scripts/site/build-site.mjs';
import { faqSection, structuredData } from '../scripts/site/seo.mjs';

const origin = 'https://spinoapp.com';
test('sitemap lists every public page with reciprocal canonical language alternates', () => {
  const xml = readFileSync('site/sitemap.xml', 'utf8');
  const document = new DOMParser({ onError: level => { throw Error(`Invalid sitemap: ${level}`); } }).parseFromString(xml, 'application/xml');
  assert.equal(document.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
  const entries = [...document.getElementsByTagName('url')];
  const paths = ['/', '/en/', '/ca/', '/arcade/', '/arcade/en/', '/arcade/ca/', '/privacy/', '/arcade/privacy/'];
  assert.deepEqual(entries.map(entry => new URL(entry.getElementsByTagName('loc')[0].textContent).pathname), paths);
  for (const entry of entries) {
    const url = entry.getElementsByTagName('loc')[0].textContent;
    const path = new URL(url).pathname;
    const html = readFileSync(`site${path}index.html`, 'utf8');
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.doesNotMatch(html, /content="noindex/);
    const alternates = [...entry.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')];
    assert.equal(alternates.length, path.includes('privacy') ? 0 : 4);
    const base = path.startsWith('/arcade/') ? '/arcade/' : '/';
    for (const alternate of alternates) {
      const lang = alternate.getAttribute('hreflang');
      assert.ok(['es','en','ca','x-default'].includes(lang));
      const href = alternate.getAttribute('href');
      assert.equal(href, origin + base + (['es','x-default'].includes(lang) ? '' : lang + '/'));
      assert.ok(html.includes(`<link rel="alternate" hreflang="${lang}" href="${href}">`));
    }
    for (const [, image] of html.matchAll(/(?:property="og:image"|name="twitter:image") content="([^"]+)"/g)) {
      assert.equal(new URL(image).origin, origin);
      assert.ok(existsSync('site' + new URL(image).pathname));
    }
  }
  assert.doesNotMatch(xml, /<lastmod>|downloads|404/);
});

test('landing pages publish consistent application and visible FAQ structured data', () => {
  for (const copy of Object.values(COPY)) {
    const html = page(copy);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(data['@context'], 'https://schema.org');
    const graph = data['@graph'];
    const app = graph.find(item => item['@type'] === 'SoftwareApplication');
    assert.equal(app.operatingSystem, 'Android');
    assert.equal(app.isAccessibleForFree, true);
    assert.equal(app.offers.price, '0');
    assert.equal(app.description, copy.lead);
    assert.ok(html.includes(app.softwareVersion));
    assert.ok(html.includes(new URL(app.downloadUrl).pathname.slice(1)));
    assert.equal(app.aggregateRating, undefined);
    assert.equal(app.review, undefined);
    const faq = graph.find(item => item['@type'] === 'FAQPage');
    assert.deepEqual(faq.mainEntity.map(q => [q.name, q.acceptedAnswer.text]), copy.faq);
    const ids = new Set(graph.map(item => item['@id']));
    for (const item of graph) for (const key of ['about','mainEntity','isPartOf','hasPart']) {
      if (item[key]?.['@id']) assert.ok(ids.has(item[key]['@id']), `Unresolved ${key}`);
    }
  }
});

test('crawler policy allows public content and advertises the canonical sitemap', () => {
  const robots = readFileSync('site/robots.txt', 'utf8');
  assert.match(robots, /User-agent: \*\nAllow: \/\n/);
  assert.match(robots, /Sitemap: https:\/\/spinoapp.com\/sitemap.xml/);
  assert.doesNotMatch(robots, /Disallow:|Noindex:/i);
  assert.match(readFileSync('site/_headers','utf8'), /\/downloads\/\*\n  X-Robots-Tag: noindex/);
  assert.match(readFileSync('site/404.html','utf8'), /name="robots" content="noindex"/);
});

test('FAQ copy cannot break the HTML or JSON-LD script boundary', () => {
  const copy = { ...COPY.en, faq: [['What is <SPino> & "piano"?', '</script><script>alert(1)</script>']] };
  const html = faqSection(copy), schema = structuredData(copy);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;SPino&gt; &amp; &quot;piano&quot;/);
  assert.equal((schema.match(/<\/script>/g) || []).length, 1);
  assert.equal(JSON.parse(schema.match(/>(.*)<\/script>/s)[1])['@graph'].at(-1).mainEntity[0].acceptedAnswer.text, copy.faq[0][1]);
});
