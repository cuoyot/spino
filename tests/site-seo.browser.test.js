import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

test('SEO content and FAQ answers are readable without JavaScript across responsive layouts', async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true, rootDirectory: 'site' });
  const evidence = process.env.SPINO_SITE_SEO_EVIDENCE;
  if (evidence) await mkdir(evidence, { recursive: true });
  await send('Emulation.setScriptExecutionDisabled', { value: true });
  for (const language of ['es', 'en', 'ca']) {
    await send('Page.navigate', { url: url + (language === 'es' ? '' : `${language}/`) });
    const content = await evaluate(`(() => {
      const graph = JSON.parse(document.querySelector('[type="application/ld+json"]').textContent)['@graph'];
      return {
        h1: [...document.querySelectorAll('h1')].map(h => h.textContent),
        headings: [...document.querySelectorAll('main h1, main h2, main h3')].map(h => +h.tagName.slice(1)),
        faq: [...document.querySelectorAll('#faq article')].map(a => [a.querySelector('h3').textContent, a.querySelector('p').textContent]),
        schemaFaq: graph.find(n => n['@type'] === 'FAQPage').mainEntity.map(q => [q.name, q.acceptedAnswer.text]),
        canonical: document.querySelector('link[rel=canonical]').href,
        brokenAnchors: [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash),
      };
    })()`);
    assert.equal(content.h1.length, 1);
    assert.match(content.h1[0], /SPino.*piano/);
    assert.deepEqual(content.faq, content.schemaFaq);
    assert.equal(content.faq.length, 7);
    assert.deepEqual(content.brokenAnchors, []);
    assert.equal(content.canonical, `https://spinoapp.com/${language === 'es' ? '' : language + '/'}`);
    content.headings.forEach((level, index) => { if (index) assert.ok(level <= content.headings[index - 1] + 1, 'Heading levels must not skip'); });
    await evaluate(`document.querySelectorAll('img').forEach(img => img.loading = 'eager')`);
    assert.equal(await evaluate(`Promise.all([...document.images].map(img => img.decode().then(() => true, () => false))).then(results => results.every(Boolean))`), true);
    for (const [width, height] of [[390,844], [844,390], [768,1024], [1024,768], [1280,900]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 1100 });
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true, `${language} ${width}x${height}`);
      for (const section of ['hero', 'faq']) {
        await evaluate(section === 'hero' ? 'window.scrollTo(0,0)' : `document.querySelector('#faq').scrollIntoView()`);
        if (evidence) await writeFile(`${evidence}/${language}-${section}-${width}x${height}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      }
    }
  }
  assert.deepEqual(errors, []);
});
