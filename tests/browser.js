import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readdirSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname } from 'node:path';
import { once } from 'node:events';

function browserPath() {
  if (process.env.BROWSER_PATH) return process.env.BROWSER_PATH;
  const cache = join(process.env.LOCALAPPDATA || tmpdir(), 'ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-')).reverse()) {
      const exe = join(cache, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
      if (existsSync(exe)) return exe;
    }
  }
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium', '/usr/bin/google-chrome',
  ];
  const exe = candidates.find(existsSync);
  assert.ok(exe, 'Set BROWSER_PATH to a Chromium executable');
  return exe;
}

export async function openBrowser(t, { companion = false, language = 'es', rootDirectory = 'dist', onboarding = false } = {}) {
  const root = resolve(rootDirectory);
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const requestPath = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
    const path = resolve(root, '.' + requestPath);
    if (!path.startsWith(root + '/') && !path.startsWith(root + '\\')) { res.writeHead(403).end(); return; }
    try {
      const data = await readFile(path);
      res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.mp4': 'video/mp4' }[extname(path)] || 'application/octet-stream');
      // Mirror production media serving: Chromium requires byte ranges for
      // reliable video seeking before the entire file has been downloaded.
      if (extname(path) === '.mp4') {
        res.setHeader('Accept-Ranges', 'bytes');
        const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
        if (range) {
          const start = Number(range[1]), end = Math.min(data.length - 1, range[2] ? Number(range[2]) : data.length - 1);
          if (start > end || start >= data.length) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }).end(); return; }
          res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
          res.end(data.subarray(start, end + 1)); return;
        }
      }
      res.setHeader('Content-Length', data.length);
      res.end(data);
    } catch { res.writeHead(404).end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const profile = await mkdtemp(join(tmpdir(), 'piano-reading-'));
  const browser = spawn(browserPath(), ['--headless', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true });
  let ws, closeRemote;
  t.after(async () => {
    const exited = browser.exitCode == null && browser.signalCode == null ? once(browser, 'exit') : Promise.resolve();
    if (closeRemote && ws?.readyState === 1) void closeRemote().catch(() => {});
    else browser.kill();
    const forceExit = setTimeout(() => browser.kill('SIGKILL'), 2000);
    try { await exited.catch(() => {}); } finally { clearTimeout(forceExit); }
    ws?.close();
    server.closeAllConnections();
    server.close();
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  const endpoint = await new Promise((resolveEndpoint, reject) => {
    let output = '';
    browser.once('error', reject);
    browser.once('exit', (code) => reject(new Error(`Browser exited ${code}: ${output}`)));
    browser.stderr.on('data', (chunk) => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) resolveEndpoint(match[1]);
    });
  });
  const targets = await (await fetch(`http://${new URL(endpoint).host}/json/list`)).json();
  ws = new WebSocket(targets.find((p) => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolveOpen) => ws.addEventListener('open', resolveOpen, { once: true }));
  let seq = 0;
  const pending = new Map();
  const errors = [];
  const loadedDocuments = new Set(), navigationWaiters = new Map(), reloadWaiters = new Set();
  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails);
    if (msg.method === 'Page.lifecycleEvent' && msg.params.name === 'DOMContentLoaded') {
      const id = msg.params.loaderId;
      loadedDocuments.add(id);
      navigationWaiters.get(id)?.();
      for (const waiter of reloadWaiters) waiter(msg.params);
    }
    if (!msg.id) return;
    const task = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) task.reject(new Error(JSON.stringify(msg.error)));
    else task.resolve(msg.result);
  });
  const rawSend = (method, params = {}) => new Promise((resolveCall, reject) => {
    const id = ++seq;
    pending.set(id, { resolve: resolveCall, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  closeRemote = () => rawSend('Browser.close');
  const send = async (method, params = {}) => {
    if (method === 'Page.reload') {
      const { frameTree: { frame } } = await rawSend('Page.getFrameTree');
      let timer, waiter;
      const reloaded = new Promise((resolveReload, reject) => {
        waiter = event => { if (event.frameId === frame.id && event.loaderId !== frame.loaderId) resolveReload(); };
        reloadWaiters.add(waiter);
        timer = setTimeout(() => reject(Error('Reload did not load its new document.')), 15000);
      });
      try { const response = await rawSend(method, params); await reloaded; return response; }
      finally { clearTimeout(timer); reloadWaiters.delete(waiter); }
    }
    const response = await rawSend(method, params);
    // Same-URL reloads can otherwise let a test match the old page before it unloads.
    if (method === 'Page.navigate' && response.loaderId && !loadedDocuments.has(response.loaderId)) {
      await new Promise((resolveNavigation, reject) => {
        const timer = setTimeout(() => { navigationWaiters.delete(response.loaderId); reject(Error('Navigation did not load its new document.')); }, 15000);
        navigationWaiters.set(response.loaderId, () => { clearTimeout(timer); navigationWaiters.delete(response.loaderId); resolveNavigation(); });
      });
    }
    return response;
  };
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.setLifecycleEventsEnabled', { enabled: true });
  if(!onboarding) await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.__SPINO_DISABLE_TOUR=true;'});
  if (companion) await send('Page.addScriptToEvaluateOnNewDocument', {source: `Object.defineProperty(navigator, 'language', { get: () => ${JSON.stringify(language)} });`});
  return { send, evaluate, errors, url: `http://127.0.0.1:${server.address().port}/${companion ? '' : '#reader'}` };
}

// Piano and MIDI sessions open with a Hanon warm-up block. Tests that exercise a specific first block switch
// the warm-up off through Practice preferences, the way a player would, and return to Today.
export const disableWarmup = evaluate => evaluate(`(async()=>{
  const until=fn=>new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{let value;try{value=fn();}catch{}if(value){clearInterval(timer);resolve(value);}else if(++n>500){clearInterval(timer);reject(Error('Warm-up preference timeout'));}},20);});
  document.querySelector('#app-shell [data-action=settings]').click();
  await until(()=>document.querySelector('[data-action=profile-practice]'));
  document.querySelector('[data-action=profile-practice]').click();
  await until(()=>document.querySelector('#preferences-form [name=warmup-enabled]'));
  document.querySelector('#preferences-form [name=warmup-enabled]').checked=false;
  document.querySelector('#preferences-form').requestSubmit();
  await until(()=>/guardadas|saved/i.test(document.querySelector('#cp-toast')?.textContent||''));
  document.querySelector('.cp-nav [data-action=home]').click();
  await until(()=>document.querySelector('.cp-today'));
  return true;
})()`);
