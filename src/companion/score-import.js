import { fileBase64 } from './platform.js';
import { uid } from './model.js';
import { ui, localizeMessage } from './locale.js';

const importHelp = () => ui('PDF up to 20 MB. Title, composer and tempo are detected on this device.', 'PDF hasta 20 MB. Detectaremos título, compositor y tempo en el dispositivo.');

export function scoreImportMarkup(attached = false) {
  if (attached) return `<p class="muted">${ui('PDF score attached. The file and its annotations will be preserved.', 'Partitura PDF adjunta. Se conservarán el archivo y sus anotaciones.')}</p>`;
  return `<section class="cp-score-import" aria-label="${ui('PDF score', 'Partitura PDF')}">
    <label><span>${ui('PDF score', 'Partitura PDF')} <small class="muted">(${ui('optional', 'opcional')})</small></span><input name="score" type="file" accept=".pdf,application/pdf" aria-describedby="cp-score-help cp-score-status" /></label>
    <p id="cp-score-help" class="muted">${importHelp()}</p>
    <p id="cp-score-status" role="status" aria-live="polite"></p>
    <div class="cp-score-actions"><button type="button" data-score="skip" hidden>${ui('Skip detection', 'Omitir detección')}</button><button type="button" data-score="apply" hidden>${ui('Use suggestions', 'Usar sugerencias')}</button><button type="button" data-score="remove" hidden>${ui('Remove PDF', 'Quitar PDF')}</button></div>
  </section>`;
}

export function bindScoreImport(form, initialFile, existing = false) {
  const input = form.elements.score;
  if (!input) return { asset: () => null, dispose() {} };
  const $ = selector => form.querySelector(selector);
  const status = $('#cp-score-status'), skip = $('[data-score=skip]'), apply = $('[data-score=apply]'), remove = $('[data-score=remove]');
  let pending, asset = null, suggestions = null, disposed = false, file = null, timer;
  const edited = new Set(), generated = {}, keys = ['title', 'composer', 'bpm', 'tempoMark'];
  for (const key of keys) form.elements[key].addEventListener('input', () => edited.add(key));
  const originalBpm = form.elements.bpm.value;
  const cancel = () => { clearTimeout(timer); pending?.abort(); pending = null; };
  const fill = (values, force = false) => {
    for (const key of keys) {
      const control = form.elements[key];
      if (values[key] && (force || (!edited.has(key) && (!control.value.trim() || control.value === generated[key] || (key === 'bpm' && !existing && control.value === originalBpm))))) {
        control.value = String(values[key]); generated[key] = control.value;
      }
    }
  };
  async function select(selected) {
    cancel(); asset = null; suggestions = null; apply.hidden = true; skip.hidden = true; remove.hidden = !selected;
    input.setCustomValidity(''); status.textContent = ''; file = selected;
    for (const key of keys) {
      if (!edited.has(key) && form.elements[key].value === generated[key]) form.elements[key].value = key === 'bpm' ? originalBpm : '';
      delete generated[key];
    }
    if (!file) return;
    fill({ title: file.name.replace(/\.pdf$/i, '').slice(0, 200) || ui('Score', 'Partitura') });
    const controller = new AbortController(); pending = controller;
    const current = () => !disposed && pending === controller && !controller.signal.aborted;
    const selectedName = file.name.slice(0, 250);
    status.textContent = ui('Checking score…', 'Comprobando la partitura…'); input.setCustomValidity(ui('Wait for the PDF to be checked or remove it.', 'Espera a que se compruebe el PDF o quítalo.'));
    try {
      const base64 = await fileBase64(file);
      if (!current()) return;
      const { readScoreDetails } = await import('./pdf-metadata.js');
      if (!current()) return;
      timer = setTimeout(() => {
        if (!current()) return;
        status.textContent = asset ? ui('Detection could not finish. You can enter the details and save the PDF.', 'No se ha podido completar la detección. Puedes introducir los datos y guardar el PDF.') : ui('The check took too long. Select the PDF again.', 'La comprobación ha tardado demasiado. Vuelve a seleccionar el PDF.');
        if (!asset) input.setCustomValidity(status.textContent);
        skip.hidden = true; cancel();
      }, 60000);
      const result = await readScoreDetails(base64, { signal: controller.signal,
        onValidated: pages => {
          if (!current()) return;
          asset = { id: uid(), name: selectedName, type: 'application/pdf', base64 };
          input.setCustomValidity(''); skip.hidden = false;
          $('#cp-score-help').textContent = ui(`${pages} ${pages === 1 ? 'page' : 'pages'} · PDF saved only when you select Save.`, `${pages} ${pages === 1 ? 'página' : 'páginas'} · PDF guardado solo al pulsar Guardar.`);
        },
        onProgress: message => { if (current()) status.textContent = message; },
      });
      if (!current()) return;
      suggestions = result; fill(result); skip.hidden = true;
      apply.hidden = !keys.some(key => result[key] && form.elements[key].value !== String(result[key]));
      const detected = [result.title, result.composer, result.tempoMark].filter(Boolean).join(' · ');
      status.textContent = detected ? ui(`${result.method === 'ocr' ? 'OCR' : 'PDF'} suggestions: ${detected}. Check the details and beat unit before saving.${result.tempoMark && !result.bpm ? ' Choose a practice tempo (30–160 BPM) in Study details.' : ''}`, `Sugerencias ${result.method === 'ocr' ? 'OCR' : 'del PDF'}: ${detected}. Revisa los datos y la figura del pulso antes de guardar.${result.tempoMark && !result.bpm ? ' Elige el tempo de práctica (30–160 BPM) en Detalles de estudio.' : ''}`) : ui('No details were recognized clearly enough. You can enter them and save the PDF.', 'No se han reconocido datos con suficiente claridad. Puedes escribirlos y guardar el PDF.');
    } catch (error) {
      if (!current()) return;
      skip.hidden = true;
      status.textContent = asset ? ui('Could not detect the details. You can enter them and save the PDF.', 'No se han podido detectar los datos. Puedes escribirlos y guardar el PDF.') : localizeMessage(error.message);
      if (!asset) input.setCustomValidity(status.textContent);
    } finally { if (pending === controller) { clearTimeout(timer); pending = null; } }
  }
  input.addEventListener('change', () => void select(input.files[0]));
  remove.addEventListener('click', () => { input.value = ''; void select(null); $('#cp-score-help').textContent = importHelp(); });
  skip.addEventListener('click', () => { cancel(); skip.hidden = true; status.textContent = ui('Detection skipped. You can enter the details and save the PDF.', 'Detección omitida. Puedes escribir los datos y guardar el PDF.'); });
  apply.addEventListener('click', () => { fill(suggestions, true); apply.hidden = true; });
  if (initialFile) {
    const files = new DataTransfer(); files.items.add(initialFile); input.files = files.files;
    void select(initialFile);
  }
  return {
    asset: () => {
      if (file && !asset) throw new Error(input.validationMessage || ui('Wait for the PDF to be checked.', 'Espera a que se compruebe el PDF.'));
      return asset;
    },
    dispose() { disposed = true; cancel(); },
  };
}
