// Measure rendered SVG geometry, not the renderer's estimated guide bounds.
// SVG text boxes include the music font's full ascender/descender, so use the
// notehead baseline for pitch and the glyph's horizontal box for its centre.
export function measureScoreGuides(beat = 0) {
  const { layout, line } = window.__sr;
  const rect = element => {
    const r = element.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };
  const rowIndex = layout.page ? layout.systemOf(beat) : 0;
  const score = layout.page ? document.querySelectorAll('#staff .page-row')[rowIndex] : document.querySelector('#staff .score-strip');
  const staves = [...score.querySelectorAll('.vf-stave')].map(rect);
  const top = Math.min(...staves.map(r => r.top)), bottom = Math.max(...staves.map(r => r.bottom));
  const indices = [];
  for (let i = layout.from; i < layout.to; i++) if (Math.abs(line.onsets[i] - beat) < .00001) indices.push(i);
  const groups = [...document.querySelectorAll('#staff .vf-stavenote')];
  const heads = indices.map(i => {
    const head = groups[i - layout.from]?.querySelector('.vf-notehead text');
    if (!head) return null;
    const p = new DOMPoint(head.x.baseVal[0].value, head.y.baseVal[0].value).matrixTransform(head.getScreenCTM());
    return { ...rect(head), pitchY: p.y, duration: line.notes[i].dur };
  }).filter(Boolean);
  return { page: !!layout.page, rowIndex, staves, staffCentre: (top + bottom) / 2, staffTop: top, staffBottom: bottom,
    playhead: rect(document.querySelector('#playhead')), light: rect(document.querySelector('#read-window')), heads,
    staff: rect(document.querySelector('#staff')), notes: groups.length };
}
