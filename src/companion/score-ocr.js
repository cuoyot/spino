import { createWorker, PSM } from 'tesseract.js';
import { groupHeaderLines } from './score-metadata.js';
import { ui } from './locale.js';

export async function recognizeHeader(canvas, pageHeight, { signal, onProgress }) {
  signal.throwIfAborted();
  let worker;
  const assets = new URL('ocr/', document.baseURI).href;
  const aborted = new Promise((_, reject) => {
    signal.addEventListener('abort', () => { void worker?.terminate(); reject(signal.reason); }, { once: true });
  });
  const job = (async () => {
    worker = await createWorker('eng+spa', 1, {
      workerPath: assets + 'worker.min.js', corePath: assets + 'core', langPath: assets.replace(/\/$/, ''),
      workerBlobURL: false, cacheMethod: 'none', gzip: false,
      logger: message => { if (!signal.aborted && message.status === 'recognizing text') onProgress(ui(`Recognizing header… ${Math.round(message.progress * 100)} %`, `Reconociendo cabecera… ${Math.round(message.progress * 100)} %`)); },
      errorHandler: () => {},
    });
    if (signal.aborted) { await worker.terminate(); signal.throwIfAborted(); }
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, user_defined_dpi: '200' });
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    signal.throwIfAborted();
    const lines = (data.blocks || []).flatMap(block => block.paragraphs || []).flatMap(paragraph => paragraph.lines || []);
    return groupHeaderLines(lines.map(line => ({ text: line.text, confidence: line.confidence,
      x: line.bbox.x0 / canvas.width, y: line.bbox.y0 / pageHeight,
      w: (line.bbox.x1 - line.bbox.x0) / canvas.width, h: (line.bbox.y1 - line.bbox.y0) / pageHeight })));
  })();
  try { return await Promise.race([job, aborted]); }
  finally { await worker?.terminate(); }
}
