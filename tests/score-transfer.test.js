import { test } from 'node:test';
import assert from 'node:assert/strict';
import { downloadScore, retryAfter, scoreURL } from '../src/companion/score-transfer.js';
import { bytesToBase64, bytesFromBase64 } from '../src/companion/musicxml-document.js';
const url = 'https://raw.githubusercontent.com/musetrainer/library/' + 'a'.repeat(40) + '/scores/test.mxl';
const network = async () => ({ online: true, wifi: true, metered: false });
test('MusicXML acquisition validates hosts, HTTP errors, Retry-After, redirects and HTML', async () => {
  assert.throws(() => scoreURL('https://example.com/score.mxl')); assert.throws(() => scoreURL(url.replace('/scores/', '/../')));
  for (const status of [404, 429]) {
    const result = await downloadScore(url, { network, fetcher: async () => new Response('', { status, headers: { 'Retry-After': '60' } }) });
    assert.equal(result.complete, false); assert.match(result.error, new RegExp(String(status))); assert.ok(result.nextAttemptAt > Date.now());
  }
  const html = await downloadScore(url, { network, fetcher: async () => new Response('<html/>', { headers: { 'Content-Type': 'text/html' } }) }); assert.match(html.error, /non-score/);
  const redirected = await downloadScore(url, { network, fetcher: async () => { const r = new Response('x'); Object.defineProperty(r, 'url', { value: 'https://example.com/file' }); return r; } }); assert.equal(redirected.complete, false);
  assert.equal(retryAfter('10', 1000), 11000);
});
test('a paused transfer saves a validator-bound checkpoint and resumes only a matching range', async () => {
  const controller = new AbortController();
  const first = await downloadScore(url, { network, signal: controller.signal, fetcher: async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array([80,75,1])); }, cancel() {} }), { headers: { ETag: '"revision"' } }), onProgress: () => controller.abort() });
  assert.equal(first.complete, false); assert.equal(first.partial.validator, '"revision"'); assert.deepEqual([...bytesFromBase64(first.partial.base64)], [80,75,1]);
  let headers;
  const resumed = await downloadScore(url, { network, partial: first.partial, fetcher: async (value, options) => { headers = options.headers; return new Response(new Uint8Array([2,3]), { status: 206, headers: { ETag: '"revision"', 'Content-Range': 'bytes 3-4/5', 'Content-Length': '2' } }); } });
  assert.equal(headers.Range, 'bytes=3-'); assert.equal(resumed.complete, true); assert.deepEqual([...bytesFromBase64(resumed.base64)], [80,75,1,2,3]);
  const restarted = await downloadScore(url, { network, partial: first.partial, fetcher: async () => new Response(new Uint8Array([5,6]), { status: 200, headers: { ETag: '"new"' } }) }); assert.equal(restarted.base64, bytesToBase64(new Uint8Array([5,6])));
});
test('timeout and unknown Wi-Fi fail without creating an available asset', async () => {
  const offline = await downloadScore(url, { network: async () => ({ online: true, wifi: null }), fetcher: () => assert.fail('Wi-Fi policy bypassed') }); assert.equal(offline.complete, false); assert.match(offline.error, /WIFI_REQUIRED/);
  const timed = await downloadScore(url, { network, timeout: 10, fetcher: (value, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')))) }); assert.equal(timed.complete, false); assert.match(timed.error, /timed out/);
});
