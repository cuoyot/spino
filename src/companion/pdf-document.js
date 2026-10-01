import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerURL from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { ui } from './locale.js';

GlobalWorkerOptions.workerSrc = workerURL;

export function loadPDF(base64) {
  const assets = new URL('pdfjs/', document.baseURI).href;
  return getDocument({ data: Uint8Array.from(atob(base64), c => c.charCodeAt(0)),
    cMapUrl: assets + 'cmaps/', cMapPacked: true, standardFontDataUrl: assets + 'standard_fonts/',
    wasmUrl: assets + 'wasm/', iccUrl: assets + 'iccs/', enableXfa: false,
    // Scores are rendered as pixels; no PDF scripts, forms or external links are executed.
    isEvalSupported: false, canvasMaxAreaInBytes: 32000000 });
}

export function readableError(error) {
  return new Error(error.name === 'PasswordException' ? ui('This PDF is password protected. Import an unprotected copy.', 'El PDF tiene contraseña. Importa una copia sin contraseña.') : ui('Cannot read this PDF. Check that the file is not damaged.', 'No se puede leer este PDF. Comprueba que el archivo no está dañado.'));
}

export async function inspectPDF(base64) {
  const task = loadPDF(base64);
  try { const pdf = await task.promise; await pdf.getPage(1); return pdf.numPages; }
  catch (error) { throw readableError(error); }
  finally { await task.destroy(); }
}
