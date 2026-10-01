import { defineConfig } from 'vite';
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

function localRepertoireFiles() {
  const root = fileURLToPath(new URL('./Exercises_Library/', import.meta.url));
  const destination = fileURLToPath(new URL('./public/repertoire/', import.meta.url));
  const index = JSON.parse(readFileSync(`${root}/library.json`, 'utf8'));
  const paths = ['library.json', index.config.sources, index.config.ingestion, 'provenance/evidence.json', 'provenance/OpenScore-CC0-1.0.txt', ...index.manifests.map(m => m.path)];
  for (const path of paths) {
    if (!/^[\w./-]+$/.test(path) || path.startsWith('/') || path.split('/').includes('..')) throw new Error(`Invalid repertoire path: ${path}`);
    mkdirSync(`${destination}/${path.split('/').slice(0, -1).join('/')}`, { recursive: true });
    cpSync(`${root}/${path}`, `${destination}/${path}`);
  }
  mkdirSync(`${destination}/licenses`, { recursive: true });
  for (const name of ['opensheetmusicdisplay', '@xmldom/xmldom', 'fflate', 'ajv', 'ajv-formats']) {
    cpSync(fileURLToPath(new URL(`./node_modules/${name}/LICENSE`, import.meta.url)), `${destination}/licenses/${name.replaceAll('/', '-')}.txt`);
  }
}

// Ship every decoder and font locally, including the dev server and direct Vite builds.
function localPDFFiles() {
  const destination = fileURLToPath(new URL('./public/pdfjs/', import.meta.url));
  mkdirSync(destination, { recursive: true });
  for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    cpSync(fileURLToPath(new URL(`./node_modules/pdfjs-dist/${directory}`, import.meta.url)), `${destination}/${directory}`, { recursive: true });
  }
  cpSync(fileURLToPath(new URL('./node_modules/pdfjs-dist/LICENSE', import.meta.url)), `${destination}/LICENSE`);
}

// OCR is optional at runtime, but its worker, engine and language data are always local.
function localOCRFiles() {
  const destination = fileURLToPath(new URL('./public/ocr/', import.meta.url));
  const dependency = path => fileURLToPath(new URL(`./node_modules/${path}`, import.meta.url));
  mkdirSync(`${destination}/core`, { recursive: true });
  cpSync(dependency('tesseract.js/dist/worker.min.js'), `${destination}/worker.min.js`);
  cpSync(dependency('tesseract.js/LICENSE.md'), `${destination}/LICENSE-tesseract-js.md`);
  cpSync(dependency('tesseract.js-core/LICENSE'), `${destination}/LICENSE-core`);
  // Only LSTM is used; include all three hardware variants for older WebViews too.
  for (const variant of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
    cpSync(dependency(`tesseract.js-core/tesseract-core-${variant}.wasm.js`), `${destination}/core/tesseract-core-${variant}.wasm.js`);
  }
  for (const language of ['eng', 'spa']) {
    // AAPT strips .gz suffixes when packaging assets; use identical filenames on web and Android.
    writeFileSync(`${destination}/${language}.traineddata`, gunzipSync(readFileSync(dependency(`@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`))));
    rmSync(`${destination}/${language}.traineddata.gz`, { force: true });
  }
}

export default defineConfig({
  base: './',
  plugins: [{ name: 'local-pdf-resources', buildStart: localPDFFiles }, { name: 'local-ocr-resources', buildStart: localOCRFiles }, { name: 'local-repertoire', buildStart: localRepertoireFiles }],
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000 },
  // the Android project churns on every APK build; watching it reloads the page and can crash the watcher
  server: { watch: { ignored: ['**/android/**', '**/dist/**', '**/*.apk'] } },
});
