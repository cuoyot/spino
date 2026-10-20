// Read-only local preview of the generated website, including localized routes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve('site'), port = Number(process.argv[2] || 5186);
createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, '.' + pathname + (pathname.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + '\\') && !file.startsWith(root + '/')) { response.writeHead(403).end(); return; }
  try {
    response.setHeader('Content-Type', { '.html':'text/html; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.txt':'text/plain; charset=utf-8', '.json':'application/json', '.css':'text/css', '.apk':'application/vnd.android.package-archive' }[extname(file)] || 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`Website preview: http://localhost:${port}/ca/`));
