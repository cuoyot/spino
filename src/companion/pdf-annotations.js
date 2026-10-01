export const MARK_TYPES = ['text', 'fingering', 'line', 'arrow', 'ellipse', 'rectangle', 'pen', 'underline', 'highlight'];
export const MARK_COLORS = ['#d64545', '#2878c8', '#ad7900', '#22845a', '#292b30'];
const fail = () => { throw new Error('Las anotaciones de esta partitura no son válidas o superan el límite.'); };

// Positions and sizes are fractions of the displayed PDF page, independent of screen size.
export function validateAnnotations(value) {
  if (value == null) return { version: 1, marks: [] };
  if (value.version !== 1 || !Array.isArray(value.marks) || value.marks.length > 2000) fail();
  const ids = new Set();
  let pointCount = 0;
  const marks = value.marks.map(mark => {
    if (!mark || typeof mark.id !== 'string' || !mark.id || mark.id.length > 100 || ids.has(mark.id) ||
      !Number.isInteger(mark.page) || mark.page < 1 || mark.page > 100000 || !MARK_TYPES.includes(mark.type) ||
      !MARK_COLORS.includes(mark.color) || !Number.isFinite(mark.width) || mark.width < .0002 || mark.width > .02 ||
      !Array.isArray(mark.points) || !mark.points.length || mark.points.length > 4000) fail();
    if ((['text', 'fingering'].includes(mark.type) && mark.points.length !== 1) || (!['text', 'fingering', 'pen'].includes(mark.type) && mark.points.length !== 2)) fail();
    pointCount += mark.points.length;
    if (pointCount > 100000) fail();
    const points = mark.points.map(point => {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) fail();
      return { x: point.x, y: point.y };
    });
    ids.add(mark.id);
    const result = { id: mark.id, page: mark.page, type: mark.type, color: mark.color, width: mark.width, points };
    if (['text', 'fingering'].includes(mark.type)) {
      if (typeof mark.text !== 'string' || !mark.text.trim() || mark.text.length > 500) fail();
      if (mark.type === 'fingering' && !/^[1-5]$/.test(mark.text)) fail();
      result.text = mark.text;
    }
    return result;
  });
  return { version: 1, marks };
}

export function pagePoint(clientX, clientY, rect) {
  const clamp = n => Math.max(0, Math.min(1, n));
  return { x: clamp((clientX - rect.left) / rect.width), y: clamp((clientY - rect.top) / rect.height) };
}

// Only a brief, stationary, single-pointer tap can turn a page.
// Zoomed navigation opts in using the visible page width rather than its cropped edges.
// The target is at most 18 CSS px, never an entire third of the score.
export function marginTurn({ x, width, duration, distance, scrollDistance = 0, pointers = 1, tool, zoom, allowZoom = false }) {
  if (tool !== 'read' || (!allowZoom && zoom > 1.01) || pointers !== 1 || duration > 300 || distance > 7 || scrollDistance > 2 || x < 0 || x > width) return 0;
  const edge = Math.min(18, width * .035);
  return x <= edge ? -1 : x >= width - edge ? 1 : 0;
}
