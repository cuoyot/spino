// Fixed keyboard and contact blueprint; generated hand art must respect these anchors.
const { createCanvas } = require('@napi-rs/canvas');
const { writeFileSync } = require('node:fs');
const { join } = require('node:path');
const canvas = createCanvas(800, 800), ctx = canvas.getContext('2d');
ctx.fillStyle = '#171c24'; ctx.fillRect(0, 0, 800, 800);
const left = 80, top = 70, width = 90, bottom = 450, blackBottom = 280;
ctx.strokeStyle = '#252a32'; ctx.lineWidth = 3;
const notes = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'];
notes.forEach((note, i) => {
  ctx.fillStyle = '#f5f1e8'; ctx.fillRect(left + i * width, top, width, bottom - top);
  ctx.strokeRect(left + i * width, top, width, bottom - top);
  ctx.fillStyle = '#525967'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(note, left + (i + .5) * width, bottom - 8);
});
for (const boundary of [1, 2, 4, 5, 6]) {
  ctx.fillStyle = '#0d1118';
  ctx.fillRect(left + boundary * width - 26, top, 52, blackBottom - top);
}
const targets = [
  { finger: 5, key: 0, y: 400 }, { finger: 4, key: 2, y: 340 },
  { finger: 3, key: 3, y: 320 }, { finger: 2, key: 4, y: 340 },
  { finger: 1, key: 5, y: 400 },
].map(p => ({ ...p, x: left + (p.key + .5) * width }));
for (const p of targets) {
  if (p.y - 20 <= blackBottom || p.y + 20 >= bottom) throw Error('Unsafe contact depth');
  ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
  ctx.fillStyle = '#69b8e6'; ctx.fill(); ctx.strokeStyle = '#236094'; ctx.stroke();
  ctx.fillStyle = '#102a43'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText(String(p.finger), p.x, p.y + 8);
}
ctx.fillStyle = '#dbe4ef'; ctx.font = '22px sans-serif';
ctx.fillText('HANON 1 · LEFT HAND · FIXED WHITE-KEY CONTACTS', 400, 40);
ctx.font = '18px sans-serif'; ctx.fillText('Palm and wrist belong below the contact points', 400, 730);
const out = 'docs/quality-review/captures/warmups/2026-10-09-frame-pilot';
writeFileSync(join(out, 'hanon1-fixed-contact-blueprint.png'), canvas.toBuffer('image/png'));
writeFileSync(join(out, 'hanon1-fixed-contact-blueprint.json'), JSON.stringify({width:800,height:800,left,top,keyWidth:width,bottom,blackBottom,targets}, null, 2));
