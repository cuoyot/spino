import downloads from './download-parts.mjs';
import media from './media-parts.mjs';
const servedAssets = {...downloads, ...media};

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? match[2] ? Math.min(size - 1, Number(match[2])) : size - 1 : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size ? [start, end] : null;
}

// Streams the original bytes, including resumed ranges across part boundaries.
// Individual assets remain below the host's 25 MiB limit; the APK is unmodified.
export async function downloadResponse(request, assets, manifest = servedAssets) {
  const url = new URL(request.url), entry = manifest[url.pathname];
  if (!entry) return assets.fetch(request);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status:405, headers:{Allow:'GET, HEAD'}});
  const etag = '"' + entry.sha256 + '"', headers = new Headers({
    'Content-Type':entry.contentType || 'application/vnd.android.package-archive',
    'Content-Disposition':`${entry.disposition === 'inline' ? 'inline' : 'attachment'}; filename="${url.pathname.split('/').at(-1)}"`,
    'Cache-Control':'public, max-age=300', 'Accept-Ranges':'bytes', ETag:etag,
    'X-Content-Type-Options':'nosniff',
  });
  if (url.pathname.startsWith('/downloads/')) headers.set('X-Robots-Tag', 'noindex');
  if (request.headers.get('If-None-Match')?.split(',').map(s=>s.trim()).includes(etag)) return new Response(null,{status:304,headers});
  const rangeHeader = request.headers.get('Range'), ifRange = request.headers.get('If-Range');
  const useRange = rangeHeader && (!ifRange || ifRange === etag);
  const range = useRange ? byteRange(rangeHeader, entry.bytes) : [0, entry.bytes - 1];
  if (!range) { headers.set('Content-Range',`bytes */${entry.bytes}`); return new Response(null,{status:416,headers}); }
  const [start, end] = range;
  headers.set('Content-Length',String(end - start + 1));
  if (useRange) headers.set('Content-Range',`bytes ${start}-${end}/${entry.bytes}`);
  const status = useRange ? 206 : 200;
  if (request.method === 'HEAD') return new Response(null,{status,headers});
  // Native pipeTo keeps large bodies outside JavaScript chunk queues. FixedLengthStream
  // also makes an interrupted transfer fail instead of silently looking complete.
  const length = end - start + 1;
  const {readable:body,writable} = typeof FixedLengthStream === 'function'
    ? new FixedLengthStream(length) : new TransformStream();
  const pipeline = (async () => {
    let partStart = 0;
    for (const part of entry.parts) {
      const partEnd = partStart + part.bytes - 1;
      if (partEnd >= start && partStart <= end) {
        const response = await assets.fetch(new Request(new URL(part.path,url)));
        if (!response.ok || !response.body) throw Error('Download part unavailable');
        if (start <= partStart && end >= partEnd) {
          await response.body.pipeTo(writable,{preventClose:true});
        } else {
          // Only the boundary parts need byte slicing; complete middle parts stay native.
          const reader = response.body.getReader(), writer = writable.getWriter();
          let read = 0;
          try {
            for (;;) {
              const {value,done} = await reader.read(); if (done) break;
              const from = Math.max(0,start - partStart - read), to = Math.min(value.byteLength,end - partStart - read + 1);
              if (to > from) await writer.write(value.subarray(from,to));
              read += value.byteLength;
              if (partStart + read > end) break;
            }
          } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); writer.releaseLock(); }
        }
      }
      partStart += part.bytes;
      if (partStart > end) break;
    }
    await writable.close();
  })();
  pipeline.catch(error=>writable.abort(error).catch(()=>{}));
  return new Response(body,{status,headers});
}

export default {fetch:(request,env)=>downloadResponse(request,env.ASSETS)};
