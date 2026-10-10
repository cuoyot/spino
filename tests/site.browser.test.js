import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.js';

test('all website languages load current screenshots without page overflow on phone and desktop', async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true, rootDirectory: 'site' });
  for (const width of [390, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 500 });
    for (const language of ['es','en','ca']) {
      await send('Page.navigate', { url: url + (language === 'es' ? '' : language + '/') });
      await evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(document.querySelector('.phone')?.complete&&document.querySelector('.phone')?.naturalWidth>0){clearInterval(timer);resolve();}else if(++n>200){clearInterval(timer);reject(Error('Website image unavailable'));}},20);})`);
      assert.equal(await evaluate(`document.documentElement.lang`), language);
      assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`), true);
      assert.equal(await evaluate(`document.querySelector('.phone').getAttribute('src').includes('img/${language}/')`), true);
      await evaluate(`document.querySelectorAll('img').forEach(img=>img.loading='eager')`);
      assert.equal(await evaluate(`Promise.all([...document.images].map(img=>img.decode().then(()=>true,()=>false))).then(results=>results.every(Boolean))`), true);
    }
  }
  assert.deepEqual(errors, []);
});
