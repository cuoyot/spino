// Thumbnails are disposable view data. Never write them into score assets or notebook records.
export function bindScoreThumbnails(root, store) {
  let closed = false, queue = Promise.resolve();
  const previews = new Map();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const target = entry.target;
      observer.unobserve(target);
      queue = queue.then(async () => {
        if (closed || !target.isConnected) return;
        const id = target.dataset.scoreThumbnail;
        if (!previews.has(id)) previews.set(id, thumbnail(store, id).catch(() => null));
        if (previews.size > 24) previews.delete(previews.keys().next().value);
        const source = await previews.get(id);
        if (!source || closed || !target.isConnected) return;
        const image = new Image(); image.alt = ''; image.src = source;
        target.replaceChildren(image); target.classList.add('has-score');
      });
    }
  }, { root: root.closest('.cp-page'), rootMargin: '120px' });
  root.querySelectorAll('[data-score-thumbnail]').forEach(node => observer.observe(node));
  return () => { closed = true; observer.disconnect(); previews.clear(); };
}

async function thumbnail(store, id) {
  const asset = await store.asset(id);
  if (!asset?.base64) return null;
  if (asset.type === 'application/pdf' || asset.format === 'pdf') {
    const { loadPDF } = await import('./pdf-document.js');
    const task = loadPDF(asset.base64);
    try {
      const pdf = await task.promise, page = await pdf.getPage(1);
      const original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(180 / original.width, 256 / original.height) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      return canvas.toDataURL('image/png');
    } finally { await task.destroy(); }
  }
  if (!['musicxml', 'mxl'].includes(asset.format)) return null;
  const [{ OpenSheetMusicDisplay }, { readMusicXML, bytesFromBase64, children }, { excerptXML }] = await Promise.all([
    import('opensheetmusicdisplay'), import('./musicxml-document.js'), import('./musicxml-segments.js'),
  ]);
  const validated = readMusicXML(bytesFromBase64(asset.base64), asset.format);
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:600px;background:white;color:black;pointer-events:none';
  host.setAttribute('aria-hidden', 'true'); document.body.append(host);
  let display;
  try {
    display = new OpenSheetMusicDisplay(host, { backend: 'svg', autoResize: false, drawTitle: true, pageFormat: 'Endless' });
    const parts = children(validated.document.documentElement, 'part');
    const end = Math.min(8, ...parts.map(part => children(part, 'measure').length));
    await display.load(excerptXML(validated.xml, parts.map(part => part.getAttribute('id')), 0, end));
    display.render();
    const svg = host.querySelector('svg');
    return svg ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg)) : null;
  } finally { display?.clear(); host.remove(); }
}
