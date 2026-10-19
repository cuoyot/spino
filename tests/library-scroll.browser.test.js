import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { openBrowser } from './browser.js';
import { workDetailFixture } from './work-detail-fixture.js';

const folder = process.env.LIBRARY_SCROLL_CAPTURE;
test('library tabs conceal scrolled content all the way up to the fixed header', { timeout: 120000 }, async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true });
  const wait = condition => evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${condition}){clearInterval(timer);resolve()}else if(++n>500){clearInterval(timer);reject(Error('Library scroll timeout'))}},20)})`);
  const click = action => evaluate(`document.querySelector('[data-action=${action}]').click()`);
  const fixture = workDetailFixture(), { data, assets } = fixture, frames = [];
  data.works = Array.from({ length: 24 }, (_, i) => ({ ...data.works[i % 2], id: `scroll-work-${i}`, onStand: i < 3 }));
  if (folder) { await mkdir(folder, { recursive: false }); await writeFile(`${folder}/fixture.json`, JSON.stringify(fixture, null, 2)); }
  await send('Page.navigate', { url }); await wait(`document.querySelector('.cp-today')`);
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('cuaderno-piano',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(${JSON.stringify(data)},'current');for(const asset of ${JSON.stringify(assets)})tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve()}}})`);
  await evaluate(`new Promise(resolve=>{const q=indexedDB.open('spino-local-media',1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(['meta','recordings'],'readwrite');tx.objectStore('meta').get('installation').onsuccess=e=>{for(let i=0;i<12;i++)tx.objectStore('recordings').put({id:'scroll-recording-'+i,installation:e.target.result,workId:'scroll-work-0',title:'Synthetic scroll recording '+(i+1),kind:'audio',createdAt:new Date().toISOString(),durationMs:60000,draft:false,blob:new Blob(['synthetic-scroll-'+i],{type:'audio/webm'})})};tx.oncomplete=()=>{db.close();resolve()}}})`);
  await send('Page.reload'); await wait(`document.querySelector('.cp-today')`);
  const snapshot = () => evaluate(`(async()=>{const read=(name,stores)=>new Promise(resolve=>{const q=indexedDB.open(name,1);q.onsuccess=()=>{const db=q.result,tx=db.transaction(stores),requests=stores.map(s=>s==='state'?tx.objectStore(s).get('current'):tx.objectStore(s).getAll());tx.oncomplete=()=>{db.close();resolve(requests.map((q,i)=>stores[i]==='state'?[q.result]:q.result))}}});const [notebook,media]=await Promise.all([read('cuaderno-piano',['state','assets']),read('spino-local-media',['recordings'])]);return {notebook,media:await Promise.all(media[0].map(async({blob,...record})=>({...record,bytes:Array.from(new Uint8Array(await blob.arrayBuffer()))})))}})()`);
  const original = await snapshot();
  const measure = () => evaluate(`(()=>{const page=document.querySelector('.cp-page'),tabs=page.querySelector(':scope > .cp-library-navigation'),header=document.querySelector('.cp-app-header'),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}},p=rect(page),n=rect(tabs),buttons=[...tabs.querySelectorAll('button')].map(rect);return {page:p,tabs:n,header:rect(header),buttons,scroll:page.scrollTop,maxScroll:page.scrollHeight-page.clientHeight,overflow:page.scrollWidth>page.clientWidth+1,bandHits:[n.x+4,(n.x+n.right)/2,n.right-4].every(x=>[p.y+1,buttons[0].y-1,buttons[0].y+buttons[0].height/2].every(y=>tabs.contains(document.elementFromPoint(x,y)))),opaque:getComputedStyle(tabs).backgroundColor}})()`);
  for (const theme of ['light', 'dark']) {
    await click('settings'); await click('profile-appearance');
    await evaluate(`document.querySelector('[data-action=set-theme][data-id=${theme}]').click()`); await click('close-dialog');
    for (const [width, height] of [[390,844], [844,390], [768,1024], [1024,768], [320,640]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await send('Emulation.setSafeAreaInsetsOverride', { insets: width === 844 ? { top: 0, bottom: 21, left: 44, right: 44 } : { top: 24, bottom: 20, left: 0, right: 0 } });
      for (const route of ['piano', 'catalog', 'multimedia']) {
        await click(route); await wait(`document.querySelector('.cp-library-navigation')`);
        if (route === 'catalog') await wait(`document.querySelector('#library-search')`);
        await evaluate(`document.querySelector('.cp-page').scrollTop=0;document.fonts.ready`);
        const before = await measure(), context = `${theme}/${width}/${route}`;
        assert.equal(before.overflow, false, context);
        assert.equal(before.tabs.y, before.header.bottom, `${context}: initial header seam`);
        assert.ok(before.buttons.every(b => b.height >= 44 && b.width >= 44), context);
        assert.ok(before.maxScroll > 90, `${context}: populated scrolling fixture`);
        for (const scroll of [8, 30, 60, 90, 160, 500]) {
          await evaluate(`document.querySelector('.cp-page').scrollTop=${scroll};new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
          const after = await measure();
          assert.equal(after.tabs.y, after.header.bottom, `${context}/${scroll}: no exposed strip above tabs`);
          assert.equal(after.bandHits, true, `${context}/${scroll}: scrolled controls cannot be seen or clicked through band`);
          assert.deepEqual(after.header, before.header, context);
          assert.deepEqual(after.buttons, before.buttons, `${context}: tabs do not jump`);
          assert.equal(after.overflow, false, context);
          assert.doesNotMatch(after.opaque, /rgba\([^)]*, 0\)/, context);
          if (folder && scroll === 90) {
            const name = `${route}-${theme}-${width}x${height}-scrolled.png`;
            await writeFile(`${folder}/${name}`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
            frames.push({ name, theme, width, height, route, ...after });
          }
        }
      }
    }
  }
  const final = await snapshot();
  assert.deepEqual(final.notebook[0][0].preferences, { ...original.notebook[0][0].preferences, theme: 'dark' });
  final.notebook[0][0].preferences.theme = original.notebook[0][0].preferences.theme;
  assert.deepEqual(final, original); assert.deepEqual(errors, []);
  if (folder) {
    const hash = value => createHash('sha256').update(value).digest('hex');
    const paths = ['src/companion/app.css', 'src/companion/app.js', 'tests/library-scroll.browser.test.js'];
    await writeFile(`${folder}/metadata.json`, JSON.stringify({ capturedAt: new Date().toISOString(), kind: 'responsive-browser', nativeAcceptance: false, gitHead: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), buildIndexSha256: hash(await readFile('dist/index.html')), sourceHashes: Object.fromEntries(await Promise.all(paths.map(async p => [p, hash(await readFile(p))]))), browser: await send('Browser.getVersion'), frames, scrollChecks: 180, notebookAndAssetsUnchangedExceptSelectedTheme: true, recordingMetadataAndBytesUnchanged: true, runtimeErrors: errors }, null, 2));
  }
});
