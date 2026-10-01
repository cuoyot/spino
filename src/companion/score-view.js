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
  return result;
}

export const fittedFrame = () => ({ zoom: 1, centerX: .5, centerY: .5 });
