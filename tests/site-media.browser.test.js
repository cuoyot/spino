import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { openBrowser } from './browser.js';

test('website video waits for playback, decodes and seeks in every language', async t => {
  const { send, evaluate, url, errors } = await openBrowser(t, { companion: true, rootDirectory: 'site' });
  const evidence = process.env.SPINO_SITE_MEDIA_EVIDENCE;
  if (evidence) await mkdir(evidence, { recursive: true });
  const results = [];
  for (const language of ['es', 'en', 'ca']) {
    await send('Page.navigate', { url: url + (language === 'es' ? '' : `${language}/`) });
    await evaluate(`new Promise(resolve => document.readyState === 'complete' ? resolve() : window.addEventListener('load', resolve, { once: true }))`);
    assert.deepEqual(await evaluate(`performance.getEntriesByType('resource').filter(r => new URL(r.name).pathname.endsWith('.mp4')).map(r => r.name)`), [], 'The landing page must not request video bytes before play');
    assert.equal(await evaluate(`document.querySelector('video').error`), null);

    for (const [width, height] of [[390,844], [844,390], [768,1024], [1024,768]]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`), true);
      for (const section of ['downloads', 'hanon']) {
        await evaluate(`document.getElementById('${section}').scrollIntoView()`);
        if (evidence) await writeFile(`${evidence}/${language}-${section}-${width}x${height}.png`, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
      }
    }

    const playback = await send('Runtime.evaluate', {
      userGesture: true, awaitPromise: true, returnByValue: true,
      expression: `(async () => {
        const video = document.querySelector('video');
        const wait = predicate => new Promise((resolve, reject) => {
          const deadline = performance.now() + 15000;
          const timer = setInterval(() => {
            if (video.error || performance.now() > deadline) { clearInterval(timer); reject(Error(video.error?.message || 'Video playback timed out')); }
            else if (predicate()) { clearInterval(timer); resolve(); }
          }, 50);
        });
        await Promise.race([video.play(), new Promise((_, reject) => setTimeout(() => reject(Error('Video start timed out')), 15000))]);
        await wait(() => video.currentTime > 0.2 && video.readyState >= 2);
        video.pause();
        const duration = video.duration;
        video.currentTime = duration / 2;
        await wait(() => !video.seeking && video.readyState >= 2);
        const seekTime = video.currentTime;
        await video.play();
        await wait(() => video.currentTime > seekTime + 0.2);
        video.pause();
        return { duration, seekTime, width: video.videoWidth, height: video.videoHeight, error: video.error, decodedFrames: video.getVideoPlaybackQuality().totalVideoFrames };
      })()`
    });
    assert.equal(playback.exceptionDetails, undefined, JSON.stringify(playback.exceptionDetails));
    const result = playback.result.value;
    assert.ok(result.duration > 80 && result.duration < 100);
    assert.equal(result.width, 1920);
    assert.equal(result.height, 804);
    assert.equal(result.error, null);
    assert.ok(result.decodedFrames > 0);
    assert.ok(Math.abs(result.seekTime - result.duration / 2) < 0.5);
    results.push({ language, ...result });
  }
  assert.deepEqual(errors, []);
  if (evidence) await writeFile(`${evidence}/playback.json`, JSON.stringify(results, null, 2) + '\n');
});
