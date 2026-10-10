import { loadPDF } from './pdf-document.js';
import { validateAnnotations } from './pdf-annotations.js';
import { drawSVG } from './score-print.js';
const NS='http://www.w3.org/2000/svg';
const element=(name,attributes={})=>{const node=document.createElementNS(NS,name);for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);return node;};
export function markNode(mark, dimensions) {
    const { width: pageWidth, height: pageHeight } = dimensions;
    const group = element('g', { 'data-mark-id': mark.id });
    const points = mark.points.map(p => ({ x: p.x * pageWidth, y: p.y * pageHeight }));
    const a = points[0], b = points.at(-1), width = mark.width * pageWidth;
    const style = { stroke: mark.color, 'stroke-width': width, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    if (mark.type === 'text' || mark.type === 'fingering') {
      const text = element('text', { x: a.x, y: a.y, fill: mark.color, 'font-size': pageWidth * (mark.fontSize ?? .025), 'dominant-baseline': mark.type === 'fingering' ? 'central' : 'hanging',
        ...(mark.type === 'fingering' ? { 'text-anchor': 'middle', 'font-weight': '650', stroke: '#fff', 'stroke-width': pageWidth * .0025, 'paint-order': 'stroke fill' } : {}) });
      mark.text.split('\n').forEach((line, i) => { const span = element('tspan', { x: a.x, dy: i ? '1.2em' : '0' }); span.textContent = line; text.append(span); });
      group.append(text);
    } else if (mark.type === 'pen') {
      const d = `M${a.x} ${a.y} ` + (points.length === 1 ? `l.01 .01` : points.slice(1).map(p => `L${p.x} ${p.y}`).join(' '));
      group.append(element('path', { ...style, d }));
    } else if (mark.type === 'highlight' || mark.type === 'rectangle') {
      group.append(element('rect', { ...style, x: left, y: top, width: w, height: h,
        ...(mark.type === 'highlight' ? { fill: mark.color, stroke: 'none', opacity: .24 } : {}) }));
    } else if (mark.type === 'ellipse') {
      group.append(element('ellipse', { ...style, cx: left + w / 2, cy: top + h / 2, rx: w / 2, ry: h / 2 }));
    } else {
      const endY = mark.type === 'underline' ? a.y : b.y;
      group.append(element('line', { ...style, x1: a.x, y1: a.y, x2: b.x, y2: endY }));
      if (mark.type === 'arrow') {
        const angle = Math.atan2(b.y - a.y, b.x - a.x), size = Math.max(9, width * 4);
        group.append(element('path', { ...style, d: `M${b.x - size * Math.cos(angle - .5)} ${b.y - size * Math.sin(angle - .5)} L${b.x} ${b.y} L${b.x - size * Math.cos(angle + .5)} ${b.y - size * Math.sin(angle + .5)}` }));
      }
    }
    return group;
  }

export async function pdfPrintPages(asset) {
  const task=loadPDF(asset.base64);
  try {
    const pdf=await task.promise,snapshot=validateAnnotations(asset.annotations).marks,pages=[];
    for(let index=1;index<=pdf.numPages;index++){
      const source=await pdf.getPage(index),view=source.getViewport({scale:1}),render=source.getViewport({scale:3});
      const buffer=document.createElement('canvas');buffer.width=Math.ceil(render.width);buffer.height=Math.ceil(render.height);
      await source.render({canvasContext:buffer.getContext('2d'),viewport:render}).promise;
      const overlay=element('svg',{width:view.width,height:view.height,viewBox:`0 0 ${view.width} ${view.height}`});overlay.style.fontFamily='system-ui';
      overlay.append(...snapshot.filter(m=>m.page===index).sort((a,b)=>Number(b.type==='highlight')-Number(a.type==='highlight')).map(m=>markNode(m,{width:view.width,height:view.height})));
      await drawSVG(buffer,overlay);pages.push({width:view.width,height:view.height,image:buffer.toDataURL('image/png')});buffer.width=buffer.height=0;
    }
    return pages;
  } finally { await task.destroy(); }
}
