export function headerPDF() {
  const text = 'BT /F1 30 Tf 230 780 Td (Nocturne) Tj ET\nBT /F1 14 Tf 405 740 Td (Clara Schumann) Tj ET\nBT /F1 12 Tf 60 690 Td (Andante) Tj ET\nBT /F1 12 Tf 60 670 Td (q = 88) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${text.length} >>\nstream\n${text}\nendstream`];
  return Buffer.from(pdfObjects(objects)).toString('base64');
}

function pdfObjects(objects) {
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const start = pdf.length;
  return pdf + `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
}

// Runs in the browser: a JPEG-only PDF ensures the real OCR path is exercised.
export function scannedScorePDF() {
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 2264;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 1600, 2264); ctx.fillStyle = 'black';
  ctx.font = 'bold 76px Georgia'; ctx.textAlign = 'center'; ctx.fillText('Noche serena', 800, 170);
  ctx.font = '42px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Clara Schumann', 1480, 310);
  ctx.font = 'italic 32px Georgia'; ctx.textAlign = 'left'; ctx.fillText('Andante', 120, 480);
  ctx.font = '40px Arial'; ctx.fillText('♩ = 96', 120, 525);
  for (let staff = 0; staff < 5; staff++) for (let line = 0; line < 5; line++) {
    const y = 550 + staff * 270 + line * 22; ctx.beginPath(); ctx.moveTo(120, y); ctx.lineTo(1480, y); ctx.stroke();
  }
  const jpeg = atob(canvas.toDataURL('image/jpeg', .96).split(',')[1]);
  const stream = 'q 595 0 0 842 0 0 cm /Im1 Do Q';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>',
    `<< /Type /XObject /Subtype /Image /Width 1600 /Height 2264 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n${jpeg}\nendstream`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  return btoa(pdfObjects(objects));
}

export const scannedFixtureScript = `window.pdfObjects=${pdfObjects.toString()};window.scannedFixture=(${scannedScorePDF.toString()})();`;
