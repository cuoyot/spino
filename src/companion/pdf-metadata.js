import { loadPDF, readableError } from './pdf-document.js';
import { groupHeaderLines, suggestScoreDetails } from './score-metadata.js';
import { ui } from './locale.js';

export async function readScoreDetails(base64, { signal, onValidated, onProgress }) {
  signal.throwIfAborted();
  const task = loadPDF(base64);
  let validated = false, canvas;
  const abort = () => { void task.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const pdf = await task.promise, page = await pdf.getPage(1);
    signal.throwIfAborted(); validated = true; onValidated(pdf.numPages);
    onProgress(ui('Reading title and composer…', 'Leyendo título y compositor…'));
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    signal.throwIfAborted();
    const lines = groupHeaderLines(content.items.filter(item => item.str).map(item => {
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const height = Math.hypot(item.transform[2], item.transform[3]);
      return { text: item.str, x: x / viewport.width, y: (y - height) / viewport.height, w: item.width / viewport.width, h: height / viewport.height };
    }));
    const metadata = await pdf.getMetadata().catch(() => ({}));
    const suggested = suggestScoreDetails(lines, metadata.info);
    if (suggested.title && suggested.composer) return { ...suggested, method: 'text' };
    onProgress(ui('Preparing local OCR…', 'Preparando OCR local…'));
    // Rasterise only the header, with bounded memory even for unusually large PDF pages.
    const scale = Math.min(1800 / viewport.width, 2400 / viewport.height);
    const rendered = page.getViewport({ scale });
    canvas = document.createElement('canvas'); canvas.width = Math.ceil(rendered.width); canvas.height = Math.ceil(rendered.height * .42);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: rendered, background: 'white' }).promise;
    signal.throwIfAborted();
    const { recognizeHeader } = await import('./score-ocr.js');
    const ocr = suggestScoreDetails(await recognizeHeader(canvas, rendered.height, { signal, onProgress }));
    const tempo = /\d/.test(suggested.tempoMark) || !ocr.tempoMark ? suggested : ocr;
    return { title: suggested.title || ocr.title, composer: suggested.composer || ocr.composer,
      bpm: tempo.bpm, tempoMark: tempo.tempoMark, method: 'ocr' };
  } catch (error) {
    if (signal.aborted) throw signal.reason;
    if (!validated) throw readableError(error);
    throw error;
  } finally {
    signal.removeEventListener('abort', abort);
    await task.destroy();
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
