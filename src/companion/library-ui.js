import { catalogueRecords, digest, importLibrary } from './library.js';
import { executionFor, currentAnalysis, practiceState, manualPracticeState } from './library-state.js';
import { bytesToBase64 } from './musicxml-document.js';
import { processScoreInBackground } from './library-pipeline.js';
import { escapeHTML as esc } from './views.js';
import { ui, localizeMessage } from './locale.js';

const button = (action, text, id = '') => `<button type="button" data-action="${action}" data-id="${esc(id)}">${text}</button>`;
const finish = (label = ui("Save review", "Guardar revisión")) => `<div class="cp-actions">${button('close-dialog', ui("Cancel", "Cancelar"))}<button type="submit" class="primary">${label}</button></div>`;
const reviewFields = () => `<label>${ui("Reviewer", "Revisor")}<input name="reviewer" required maxlength="200" /></label><label>${ui("Review notes", "Notas de revisión")}<textarea name="notes" required maxlength="5000"></textarea></label>`;
export function createLibraryUI({ getLibrary, setLibrary, store, downloads, showDialog, dialog, render, toast, go, preview, practice, pauseTransfers }) {
  const record = id => catalogueRecords(getLibrary()).find(r => r.piece_id === id);
  const execution = id => executionFor(getLibrary(), id);
  const guard = id => { if (!currentAnalysis(execution(id))) throw new Error(ui("Complete score analysis and part selection before reviewing suitability.", "Completa el análisis de la partitura y la selección de partes antes de revisar su adecuación.")); };
  async function reimport(optional = getLibrary().optional) {
    await pauseTransfers();
    const library = await importLibrary({ previous: getLibrary(), optional, save: value => store.saveLibrary(value) });
    setLibrary(library); render();
    toast(ui(`${library.report.inserted} inserted · ${library.report.updated} updated · ${library.report.skipped} unchanged`, `${library.report.inserted} añadidas · ${library.report.updated} actualizadas · ${library.report.skipped} sin cambios`) + (library.report.errors.length ? ui(` · ${library.report.errors.length} import errors`, ` · ${library.report.errors.length} errores de importación`) : ''));
  }
  const actions = {
    'library-detail': id => go('library-detail', id),
    'library-download': id => downloads.enqueue(id),
    'library-pause': id => downloads.pause(id),
    'library-analyze': id => { const e = execution(id); return downloads.analyze(id, { selection: e.selection?.length ? e.selection : null, hands: e.hands || {} }); },
    'library-preview': id => preview(id),
    'library-reference': async id => {
      await pauseTransfers();
      const asset = await store.asset(execution(id).referencePDF);
      if (!asset) throw new Error(ui("The reference PDF is no longer stored locally.", "El PDF de referencia ya no está guardado en este dispositivo."));
      const { openScore } = await import('./pdf-viewer.js');
      await openScore({ asset, save: annotations => store.saveAnnotations(asset.id, annotations), saveView: view => store.saveScoreView(asset.id, view) });
    },
    'library-practice': id => { const state = manualPracticeState(record(id), execution(id)); if (!state.playable) throw new Error(state.reasons.map(reason => localizeMessage(reason)).join(' ')); return practice(id); },
    'library-reimport': () => reimport(),
    'library-optional': value => reimport(value === 'true'),
    'library-parts': id => {
      const e = execution(id);
      if (!e.parts?.length) throw new Error(ui("Validate a score before selecting parts.", "Valida una partitura antes de seleccionar las partes."));
      showDialog(ui("Select piano parts", "Seleccionar partes de piano"), `<form id="library-parts-form"><p>${ui("Use the score and instrument evidence to identify piano material. Vocal parts must be excluded from accompaniment practice.", "Identifica el material para piano usando la partitura y la información del instrumento. Excluye las partes vocales al practicar acompañamientos.")}</p>${e.parts.map(p => `<label class="check"><input type="checkbox" name="parts" value="${esc(p.id)}" ${e.selection?.includes(p.id) ? 'checked' : ''} />${esc(p.id)} · ${esc(p.name || ui("Unnamed part", "Parte sin nombre"))}</label>`).join('')}<details><summary>${ui("Reviewed hand assignments (optional)", "Asignación de manos revisada (opcional)")}</summary><p>${ui("Assign a complete part/voice only when verified. Cross-staff writing does not change the hand assignment.", "Asigna una parte o voz completa solo si está verificada. La escritura entre pentagramas no cambia la asignación.")}</p>${e.parts.flatMap(p => p.voices.map(v => { const key = `${p.id}:${v}`; return `<label>${esc(key)}<select name="hand:${esc(key)}"><option value="">${ui("Unknown", "Desconocida")}</option><option value="right" ${e.hands?.[key] === 'right' ? 'selected' : ''}>${ui("Right", "Derecha")}</option><option value="left" ${e.hands?.[key] === 'left' ? 'selected' : ''}>${ui("Left", "Izquierda")}</option></select></label>`; })).join('')}</details>${finish(ui("Analyze selection", "Analizar selección"))}</form>`, async form => {
        const selection = form.getAll('parts'); if (!selection.length) throw new Error(ui("Select at least one part.", "Selecciona al menos una parte."));
        const hands = Object.fromEntries([...form.entries()].filter(([key, value]) => key.startsWith('hand:') && value && selection.includes(key.slice(5).split(':')[0])).map(([key, value]) => [key.slice(5), value]));
        await downloads.analyze(id, { selection, hands, includeSegments: false });
        const selected = execution(id);
        // A user's part choice enables manual viewing, not an editorial suitability approval.
        if (currentAnalysis(selected)) await downloads.update(id, { manualSelection: { sha256: selected.sha256, configHash: selected.configHash } });
        dialog.close(); render();
      });
    },
    'library-suitability': id => {
      guard(id);
      showDialog(ui("Piano suitability review", "Revisión de adecuación para piano"), `<form><p>${ui('Selected parts', 'Partes seleccionadas')}: ${esc(execution(id).selection.join(', '))}. ${ui('Review instrumentation and intended piano use against the score preview.', 'Comprueba la instrumentación y el uso para piano en la vista previa de la partitura.')}</p><label>${ui("Decision", "Decisión")}<select name="approved"><option value="true">${ui("Suitable piano material", "Material apto para piano")}</option><option value="false">${ui("Unsuitable", "No apto")}</option></select></label>${reviewFields()}${finish()}</form>`, async form => {
        guard(id); const e = execution(id);
        await downloads.update(id, { reviews: { ...e.reviews, suitability: { approved: form.get('approved') === 'true', reviewer: String(form.get('reviewer')).trim(), notes: String(form.get('notes')).trim(), sha256: e.sha256, configHash: e.configHash, reviewedAt: new Date().toISOString() } } }); dialog.close(); render();
      });
    },
    'library-rights': id => {
      const e = execution(id); if (!e.assetId) throw new Error(ui("Acquire the exact edition before reviewing its rights.", "Descarga o adjunta la edición exacta antes de revisar sus derechos."));
      showDialog(ui("Composition and edition rights", "Derechos de la composición y la edición"), `<form><p>${ui("This review applies only to the selected file and its SHA-256. A repository-wide public-domain claim cannot replace edition evidence.", "Esta revisión se aplica al archivo seleccionado y a su SHA-256. Una declaración general de dominio público no sustituye la evidencia de la edición.")}</p><label>${ui("Decision", "Decisión")}<select name="approved"><option value="false">${ui("Blocked / review incomplete", "Bloqueada / revisión incompleta")}</option><option value="true">${ui("Approved for the listed jurisdictions", "Aprobada para los territorios indicados")}</option></select></label><label>${ui("License or public-domain determination", "Licencia o declaración de dominio público")}<input name="license" required maxlength="300" /></label><label>${ui("Composition evidence (URL or citation)", "Evidencia de la composición (URL o referencia)")}<textarea name="composition" required maxlength="5000"></textarea></label><label>${ui("Edition / transcription evidence (URL or citation)", "Evidencia de la edición o transcripción (URL o referencia)")}<textarea name="edition" required maxlength="5000"></textarea></label><label>${ui("Credits / editor / transcriber", "Créditos / editor / transcriptor")}<textarea name="credits" required maxlength="5000"></textarea></label><label>${ui("Jurisdictions (comma-separated ISO country codes)", "Territorios (códigos ISO de país separados por comas)")}<input name="jurisdictions" placeholder="ES" required maxlength="100" /></label>${reviewFields()}${finish()}</form>`, async form => {
        const jurisdictions = String(form.get('jurisdictions')).split(',').map(s => s.trim().toUpperCase());
        if (!jurisdictions.every(s => /^[A-Z]{2}$/.test(s))) throw new Error(ui("List explicit two-letter country codes.", "Indica códigos de país de dos letras."));
        const current = execution(id);
        await downloads.update(id, { reviews: { ...current.reviews, rights: { approved: form.get('approved') === 'true', license: String(form.get('license')).trim(), compositionEvidence: String(form.get('composition')).trim(), editionEvidence: String(form.get('edition')).trim(), credits: String(form.get('credits')).trim(), jurisdictions, reviewer: String(form.get('reviewer')).trim(), notes: String(form.get('notes')).trim(), sha256: current.sha256, sourceAssetId: current.sourceAssetId, reviewedAt: new Date().toISOString() } } }); dialog.close(); render();
      });
    },
    'library-attach': id => {
      showDialog(ui("Attach an edition to this catalogue ID", "Adjuntar una edición a esta referencia"), `<form id="library-attach-form"><label>${ui("Local MusicXML, MXL or reference PDF", "MusicXML, MXL o PDF de referencia local")}<input name="file" type="file" accept=".xml,.musicxml,.mxl,.pdf" required /></label><label>${ui("Edition title / editor", "Título de la edición / editor")}<input name="edition" required maxlength="300" /></label><label>${ui("Source evidence (URL or citation)", "Fuente (URL o referencia)")}<textarea name="source" required maxlength="5000"></textarea></label><p>${ui("File identity, rights, piano parts and musical suitability still need review. A PDF is a reference requiring reviewed transcription/OMR.", "La identidad del archivo, los derechos, las partes de piano y su adecuación siguen pendientes de revisión. El PDF se adjunta como referencia; su análisis musical requiere una transcripción revisada.")}</p>${finish(ui("Attach locally", "Adjuntar en este dispositivo"))}</form>`, async (form, element) => {
        await pauseTransfers();
        const file = element.querySelector('[name=file]').files[0]; if (!file || file.size > 25000000) throw new Error(ui("Choose a score smaller than 25 MB.", "Elige una partitura de menos de 25 MB."));
        const extension = file.name.split('.').at(-1).toLowerCase(), format = extension === 'mxl' ? 'mxl' : extension === 'pdf' ? 'pdf' : 'musicxml';
        if (!['mxl', 'pdf', 'xml', 'musicxml'].includes(extension)) throw new Error(ui("Choose a PDF, MusicXML or MXL file.", "Elige un archivo PDF, MusicXML o MXL."));
        if (format === 'pdf' && file.size > 20000000) throw new Error(ui("Reference PDFs must be smaller than 20 MB.", "Los PDF de referencia deben ocupar menos de 20 MB."));
        const bytes = new Uint8Array(await file.arrayBuffer()), sha256 = await digest(bytes), base64 = bytesToBase64(bytes), sourceAssetId = `local_${sha256.slice(0, 24)}`;
        const descriptor = { asset_id: sourceAssetId, source_id: 'local', format, source_page_url: null, download_url: null, source_path: file.name, revision: sha256, sha256, size_bytes: bytes.length, license_id: null, evidence: String(form.get('source')), edition: String(form.get('edition')) };
        const asset = { id: `${id}_${sha256.slice(0, 12)}`, name: file.name.slice(0, 250), type: format === 'pdf' ? 'application/pdf' : format === 'mxl' ? 'application/vnd.recordare.musicxml' : 'application/vnd.recordare.musicxml+xml', format, pieceId: id, sourceAssetId, base64, sha256, origin: descriptor, rights: record(id).rights, provenance: record(id).provenance };
        const previous = execution(id), next = structuredClone(getLibrary());
        const editions = [...(previous.editions || []).filter(a => a.asset_id !== sourceAssetId), descriptor];
        if (format === 'pdf') {
          const { inspectPDF } = await import('./pdf-document.js'); await inspectPDF(base64);
          next.executions[id] = { ...previous, editions, referencePDF: asset.id };
        } else {
          const processed = previous.sha256 === sha256 && previous.sourceAssetId === sourceAssetId && currentAnalysis(previous) ? previous : await processScoreInBackground(asset, record(id));
          next.executions[id] = { ...previous, ...processed, editions, assetId: asset.id, sourceAssetId, sha256 };
        }
        const existing = await store.asset(asset.id);
        await store.commitLibraryAsset({ ...existing, ...asset }, next); setLibrary(next); dialog.close(); go('library-detail', id);
      });
    },
    'library-segment-preview': value => { const [id, segmentId] = value.split('|'); return preview(id, segmentId); },
    'library-segment': value => {
      const [id, segmentId] = value.split('|'), segment = execution(id).segments?.find(s => s.segment_id === segmentId); guard(id);
      if (!segment) throw new Error(ui("Excerpt not found.", "No se encuentra el pasaje."));
      showDialog(ui(`Review written measures [${segment.start_measure_index}, ${segment.end_measure_index_exclusive})`, `Revisar compases escritos [${segment.start_measure_index}, ${segment.end_measure_index_exclusive})`), `<form><p>${ui('Labels', 'Etiquetas')}: ${esc(segment.source_measure_labels.join(', '))}</p>${button('library-segment-preview', ui("Preview excerpt", "Previsualizar pasaje"), value)}<details><summary>${ui("Independent metrics and boundary context", "Métricas independientes y contexto de los límites")}</summary><pre class="cp-json">${esc(JSON.stringify(segment, null, 2))}</pre></details><label>${ui("Decision", "Decisión")}<select name="approved"><option value="false">${ui("Reject these boundaries", "Rechazar estos límites")}</option><option value="true">${ui("Approve these boundaries", "Aprobar estos límites")}</option></select></label>${reviewFields()}${finish()}</form>`, async form => {
        guard(id); const e = execution(id), approved = form.get('approved') === 'true';
        if (approved && (segment.start_context.cross_boundary_ties.length || segment.analysis.warnings.some(w => /cut crosses a tuplet|tuplet grouping is not explicit/.test(w)))) throw new Error(ui("These boundaries cross a tie or unresolved tuplet. Choose a different excerpt.", "Estos límites cortan una ligadura o un grupo irregular sin resolver. Elige otro pasaje."));
        if (approved && e.segmentRenders?.[segmentId]?.configHash !== e.configHash) throw new Error(ui("Preview this excerpt successfully before approving its boundaries.", "Previsualiza este pasaje correctamente antes de aprobar sus límites."));
        const updated = e.segments.map(s => s.segment_id === segmentId ? { ...s, boundary_review_status: approved ? 'approved' : 'rejected', status: approved && practiceState(record(id), e).playable ? 'ready' : approved ? 'extracted' : 'rejected' } : s);
        await downloads.update(id, { segments: updated, boundaryReviews: { ...e.boundaryReviews, [segmentId]: { reviewer: String(form.get('reviewer')), notes: String(form.get('notes')), reviewedAt: new Date().toISOString() } } }); dialog.close(); render();
      });
    },
  };
  return { actions, reimport };
}
