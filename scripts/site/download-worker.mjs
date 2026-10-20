import downloads from './download-parts.mjs';

function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? match[2] ? Math.min(size - 1, Number(match[2])) : size - 1 : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < size ? [start, end] : null;
}

// Streams the original bytes, including resumed ranges across part boundaries.
// Individual assets remain below the host's 25 MiB limit; the APK is unmodified.
export async function downloadResponse(request, assets, manifest = downloads) {
  const url = new URL(request.url), entry = manifest[url.pathname];
  if (!entry) return assets.fetch(request);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status:405, headers:{Allow:'GET, HEAD'}});
  const etag = '"' + entry.sha256 + '"', headers = new Headers({
    'Content-Type':'application/vnd.android.package-archive',
    'Content-Disposition':`attachment; filename="${url.pathname.split('/').at(-1)}"`,
    'Cache-Control':'public, max-age=300', 'Accept-Ranges':'bytes', ETag:etag,
    'X-Content-Type-Options':'nosniff',
  });
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
  async function* chunks() {
    let partStart = 0;
    for (const part of entry.parts) {
      const partEnd = partStart + part.bytes - 1;
      if (partEnd >= start && partStart <= end) {
        const response = await assets.fetch(new Request(new URL(part.path,url)));
        if (!response.ok || !response.body) throw Error('Download part unavailable');
        const reader = response.body.getReader(); let read = 0;
        try {
          for (;;) {
            const {value,done} = await reader.read(); if (done) break;
            const from = Math.max(0,start - partStart - read), to = Math.min(value.byteLength,end - partStart - read + 1);
            if (to > from) yield value.subarray(from,to);
            read += value.byteLength;
            if (partStart + read > end) break;
          }
        } finally { await reader.cancel().catch(()=>{}); reader.releaseLock(); }
      }
      partStart += part.bytes;
      if (partStart > end) break;
    }
  }
  const iterator = chunks();
  const body = new ReadableStream({
    async pull(controller) {
      try { const {value,done}=await iterator.next(); if(done)controller.close(); else controller.enqueue(value); }
      catch(error) {controller.error(error);}
    },
    async cancel() {await iterator.return();},
  });
  return new Response(body,{status,headers});
}

export default {fetch:(request,env)=>downloadResponse(request,env.ASSETS)};
