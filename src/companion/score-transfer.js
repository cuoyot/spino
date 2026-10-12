import { effectiveWifiOnly } from './network-policy.js';
import { native, networkStatus, Native } from './platform.js';
import { bytesFromBase64, bytesToBase64, SCORE_LIMITS } from './musicxml-document.js';

export function scoreURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== 'raw.githubusercontent.com' || url.port || url.username || url.password || url.search || url.hash
    || !/^\/(?:musetrainer\/library|OpenScore\/Lieder)\/[a-f0-9]{40}\/.+\.(?:mxl|musicxml|xml)$/i.test(url.pathname)
    || decodeURIComponent(url.pathname).split('/').some(p => p === '..' || p === '.')) throw new Error('This MusicXML source URL is not approved for acquisition.');
  return url.href;
}
export function retryAfter(value, now = Date.now()) {
  if (!value) return null;
  const delay = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? now + Math.max(0, delay) : null;
}
export async function downloadScore(url, { id, wifiOnly = true, signal, partial = null, onProgress = () => {}, fetcher = fetch, network = networkStatus, timeout = 30000 } = {}) {
  wifiOnly = effectiveWifiOnly(wifiOnly);
  url = scoreURL(url);
  if (partial?.url !== url || !partial.validator) partial = null;
  if (native) {
    const listener = await Native.addListener('downloadProgress', event => { if (event.id === id) onProgress(event); });
    const cancel = () => Native.cancelDownload({ id }).catch(() => {});
    signal?.addEventListener('abort', cancel, { once: true });
    try { signal?.throwIfAborted(); return await Native.downloadScore({ id, url, wifiOnly, partial }); }
    finally { await listener.remove(); signal?.removeEventListener('abort', cancel); }
  }
  const controller = new AbortController(), abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeout), chunks = [];
  let loaded = 0, validator = null, httpStatus = null, finalUrl = url, nextAttemptAt = null, rangeTotal = 0;
  try {
    signal?.throwIfAborted();
    const status = await network();
    if (!status.online || wifiOnly && (status.wifi !== true || status.metered)) throw new Error(wifiOnly ? 'WIFI_REQUIRED' : 'Offline.');
    const prefix = partial ? bytesFromBase64(partial.base64) : null;
    if (prefix?.length > SCORE_LIMITS.maxBytes) throw new Error('Invalid partial score size.');
    const headers = prefix?.length ? { Range: `bytes=${prefix.length}-`, 'If-Range': partial.validator } : {};
    const response = await fetcher(url, { headers, signal: controller.signal, credentials: 'omit', redirect: 'error' });
    httpStatus = response.status; finalUrl = response.url || url;
    if (scoreURL(finalUrl) !== url) throw new Error('Unexpected score redirect.');
    nextAttemptAt = retryAfter(response.headers.get('Retry-After'));
    if (![200, 206].includes(httpStatus)) throw new Error(`HTTP ${httpStatus}${httpStatus === 429 ? ': source rate limit; retry after the indicated time.' : ': score acquisition failed.'}`);
    validator = response.headers.get('ETag'); if (validator?.startsWith('W/')) validator = null;
    validator ||= response.headers.get('Last-Modified');
    if (httpStatus === 206) {
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range') || '');
      if (!prefix || !range || +range[1] !== prefix.length || +range[2] !== +range[3] - 1 || +range[3] > SCORE_LIMITS.maxBytes || validator !== partial.validator) { partial = null; throw new Error('Invalid partial response; restart the download.'); }
      rangeTotal = +range[3];
      chunks.push(prefix); loaded = prefix.length;
    }
    const length = Number(response.headers.get('Content-Length'));
    const total = rangeTotal || (length ? length + loaded : 0);
    if (total > SCORE_LIMITS.maxBytes || /(?:text\/html|application\/json)/i.test(response.headers.get('Content-Type') || '')) throw new Error('The source returned an oversized file or a non-score response.');
    const reader = response.body.getReader();
    while (true) {
      const connection = await network();
      if (!connection.online || wifiOnly && (connection.wifi !== true || connection.metered)) { controller.abort(); throw new Error(wifiOnly ? 'WIFI_REQUIRED' : 'Offline.'); }
      signal?.throwIfAborted();
      const { value, done } = await reader.read(); if (done) break;
      if (loaded + value.length > SCORE_LIMITS.maxBytes) { controller.abort(); throw new Error('The score exceeds 25 MB.'); }
      loaded += value.length; chunks.push(value); onProgress({ loaded, total });
    }
    if (total && loaded !== total) throw new Error('Incomplete score response.');
    signal?.throwIfAborted();
    return { base64: combine(chunks, loaded), complete: true, url, finalUrl, httpStatus, validator, bytes: loaded, downloadedAt: new Date().toISOString() };
  } catch (error) {
    return { complete: false, error: signal?.aborted ? 'Download paused.' : controller.signal.aborted && !/WIFI_REQUIRED/.test(error.message) ? 'Transfer interrupted or timed out.' : error.message,
      httpStatus, finalUrl, nextAttemptAt, partial: loaded && validator ? { url, validator, base64: combine(chunks, loaded) } : partial };
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
function combine(chunks, length) {
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytesToBase64(bytes);
}
