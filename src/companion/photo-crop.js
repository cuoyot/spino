import { ui } from './locale.js';

// Square crop editor for the profile picture: drag to frame, pinch/wheel/slider to zoom.
export const PHOTO_SIZE = 256;
const MAX_ZOOM = 4;

export function photoCropMarkup() {
  return `<form id="photo-crop-form" class="cp-photo-crop"><div class="cp-crop-stage" tabindex="0" aria-label="${ui('Picture framing. Drag or use the arrow keys to move it.','Encuadre de la foto. Arrástrala o usa las flechas para moverla.')}"><img alt="" draggable="false" /><span class="cp-crop-mask" aria-hidden="true"></span></div><p class="muted cp-crop-hint">${ui('Drag to position your face. Pinch or use the slider to zoom.','Arrastra para encuadrar tu cara. Pellizca o usa el control para hacer zoom.')}</p><label class="cp-crop-zoom"><span>${ui('Zoom','Zoom')}</span><input type="range" name="zoom" min="1" max="${MAX_ZOOM}" step="0.01" value="1" /></label><div class="cp-actions"><button type="button" data-action="close-dialog">${ui('Cancel','Cancelar')}</button><button type="submit" class="primary">${ui('Use picture','Usar foto')}</button></div></form>`;
}

// Pure geometry so the crop can be tested without a DOM.
export function cropGeometry(width, height, stage, zoom, cx, cy) {
  const scale = stage / Math.min(width, height) * zoom;
  const maxX = Math.max(0, (width * scale - stage) / 2), maxY = Math.max(0, (height * scale - stage) / 2);
  cx = Math.min(maxX, Math.max(-maxX, cx)); cy = Math.min(maxY, Math.max(-maxY, cy));
  const side = stage / scale;
  return { scale, cx, cy, sx: width / 2 - cx / scale - side / 2, sy: height / 2 - cy / scale - side / 2, side };
}

export async function loadPhoto(file) {
  if (!/^image\//.test(file.type || 'image/')) throw new Error(ui('Choose an image file.','Elige un archivo de imagen.'));
  const url = URL.createObjectURL(file), img = new Image();
  img.src = url;
  try { await img.decode(); } catch { URL.revokeObjectURL(url); throw new Error(ui('This image could not be opened.','No se pudo abrir esta imagen.')); }
  return { img, dispose: () => URL.revokeObjectURL(url) };
}

export function bindPhotoCrop(form, source) {
  const stage = form.querySelector('.cp-crop-stage'), view = stage.querySelector('img'), range = form.elements.zoom;
  const w = source.naturalWidth, h = source.naturalHeight;
  let zoom = 1, cx = 0, cy = 0, geo;
  view.src = source.src;
  const size = () => stage.clientWidth || 280;
  const draw = () => {
    const S = size(); geo = cropGeometry(w, h, S, zoom, cx, cy); cx = geo.cx; cy = geo.cy;
    view.style.width = `${w}px`; view.style.height = `${h}px`;
    view.style.transform = `translate(${S / 2 + cx - w * geo.scale / 2}px, ${S / 2 + cy - h * geo.scale / 2}px) scale(${geo.scale})`;
    range.value = String(zoom);
  };
  // Zoom around a point given relative to the stage centre, keeping that point fixed.
  const zoomTo = (next, px = 0, py = 0) => {
    next = Math.min(MAX_ZOOM, Math.max(1, next));
    const k = next / zoom; cx = px + (cx - px) * k; cy = py + (cy - py) * k; zoom = next; draw();
  };
  const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2]; };
  const pointers = new Map(); let pinch = null;
  stage.addEventListener('pointerdown', e => { stage.setPointerCapture(e.pointerId); pointers.set(e.pointerId, local(e)); if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom }; } });
  stage.addEventListener('pointermove', e => {
    const prev = pointers.get(e.pointerId); if (!prev) return;
    const p = local(e); pointers.set(e.pointerId, p);
    if (pointers.size === 1) { cx += p[0] - prev[0]; cy += p[1] - prev[1]; draw(); return; }
    const [a, b] = [...pointers.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinch && pinch.d > 0) zoomTo(pinch.zoom * d / pinch.d, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
  });
  const end = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
  stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
  stage.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = local(e); zoomTo(zoom * Math.exp(-e.deltaY / 400), px, py); }, { passive: false });
  stage.addEventListener('keydown', e => {
    const step = e.shiftKey ? 40 : 10, move = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (move) { e.preventDefault(); cx += move[0]; cy += move[1]; draw(); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomTo(zoom * 1.1); }
    else if (e.key === '-') { e.preventDefault(); zoomTo(zoom / 1.1); }
  });
  range.addEventListener('input', () => zoomTo(Number(range.value)));
  const resize = new ResizeObserver(() => draw()); resize.observe(stage);
  draw();
  return {
    dataUrl() {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = PHOTO_SIZE;
      canvas.getContext('2d').drawImage(source, geo.sx, geo.sy, geo.side, geo.side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      return canvas.toDataURL('image/jpeg', 0.85);
    },
    dispose: () => resize.disconnect()
  };
}
