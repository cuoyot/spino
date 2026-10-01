// Small valid score fixture with different page sizes and a rotated second page.
export function scorePDF() {
  const stream = label => {
    let text = `BT /F1 24 Tf 60 730 Td (${label}) Tj ET\n`;
    for (let staff = 0; staff < 6; staff++) {
      for (let line = 0; line < 5; line++) { const y = 665 - staff * 90 - line * 8; text += `60 ${y} m 535 ${y} l S\n`; }
      text += `BT /F1 16 Tf 95 ${647 - staff * 90} Td (o   o   o   o   o   o   o   o) Tj ET\n`;
    }
    return `<< /Length ${text.length} >>\nstream\n${text}\nendstream`;
  };
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 2 /Kids [3 0 R 4 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Rotate 90 /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', stream('SPino - Page one'), stream('SPino - Page two')];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const start = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(pdf).toString('base64');
}
