const MAX_SECTIONS = 500, MIN_SECTION = .02;
const unit = value => Number.isFinite(value) && value >= 0 && value <= 1;

export function validateScoreView(value) {
  if (value == null) return { version: 1 };
  if (value.version !== 1) throw new Error('El encuadre de la partitura no es válido.');
  const result = { version: 1 };
  for (const orientation of ['portrait', 'landscape']) {
    const frame = value[orientation]; if (frame == null) continue;
    if (!Number.isFinite(frame.zoom) || frame.zoom < 1 || frame.zoom > 3
      || !Number.isFinite(frame.centerX) || frame.centerX < 0 || frame.centerX > 1
      || !Number.isFinite(frame.centerY) || frame.centerY < 0 || frame.centerY > 1) throw new Error('El encuadre de la partitura no es válido.');
    result[orientation] = { zoom: frame.zoom, centerX: frame.centerX, centerY: frame.centerY };
  }
  // Page sections split one page into several free crops that landscape reading shows one at a time.
  if (value.sections != null) {
    const ok = Array.isArray(value.sections) && value.sections.length <= MAX_SECTIONS && value.sections.every(s => s && typeof s.id === 'string' && s.id && s.id.length <= 100
      && Number.isInteger(s.page) && s.page >= 1 && [s.x, s.y, s.w, s.h].every(unit) && s.w >= MIN_SECTION && s.h >= MIN_SECTION && s.x + s.w <= 1.0001 && s.y + s.h <= 1.0001);
    if (!ok || new Set(value.sections.map(s => s.id)).size !== value.sections.length) throw new Error('El encuadre de la partitura no es válido.');
    if (value.sections.length) result.sections = value.sections.map(({ id, page, x, y, w, h }) => ({ id, page, x, y, w, h }));
  }
  return result;
}

export const fittedFrame = () => ({ zoom: 1, centerX: .5, centerY: .5 });

// Reading order: top to bottom, and left to right for parts that share a row.
export function sortSections(sections) {
  return [...sections].sort((a, b) => {
    const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return overlap > Math.min(a.h, b.h) / 2 ? a.x - b.x : a.y - b.y;
  });
}

// Scale and offsets that fit a section inside a viewport, padding the rest with white.
export function sectionLayout(section, pageWidth, pageHeight, viewWidth, viewHeight) {
  const scale = Math.min(viewWidth / (section.w * pageWidth), viewHeight / (section.h * pageHeight));
  const width = pageWidth * scale, height = pageHeight * scale;
  return { scale, width, height,
    left: viewWidth / 2 - (section.x + section.w / 2) * width, top: viewHeight / 2 - (section.y + section.h / 2) * height,
    clip: { top: section.y * height, right: (1 - section.x - section.w) * width, bottom: (1 - section.y - section.h) * height, left: section.x * width } };
}
