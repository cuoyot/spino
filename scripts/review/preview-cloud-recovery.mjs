import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { cloudRecoveryBootstrap } from './cloud-recovery-fixture.mjs';

const root = resolve('dist');
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    let body = await readFile(path);
    if (path.endsWith('/index.html')) body = body.toString().replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, (_, src) => `<script type="module">
      window.__SPINO_DISABLE_TOUR=true;
      ${cloudRecoveryBootstrap()}
      await window.__cloudReady;
      await import(${JSON.stringify(src)});
      const observer=new MutationObserver(()=>{
        const settings=document.querySelector('[data-action=settings]');
        if(!settings)return;
        observer.disconnect();settings.click();
        document.querySelector('[data-action=profile-backup]').click();
        document.querySelector('[data-action=cloud-sync]').click();
      });
      observer.observe(document.body,{childList:true,subtree:true});
    </script>`);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png' })[extname(path)] || 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
server.listen(5191, '127.0.0.1', () => console.log('Synthetic cloud recovery review: http://127.0.0.1:5191/'));
