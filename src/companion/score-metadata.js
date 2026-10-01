// Coordinates are fractions of the displayed first page, shared by PDF text and OCR.
const clean = value => String(value || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
const excluded = /https?:|www\.|copyright|all rights|public domain|creative commons|mutopia|imslp|typeset|engraved|lilypond|musescore|sibelius|finale|scanner|untitled|microsoft|adobe|arrang|transcri|edited|editor|edici[oó]n|digitiz/i;
const direction = /^(?:piano(?:forte)?|violin|viol[ií]n|flute|flauta|guitar|guitarra|cello|voz|voice|allegro|allegretto|andante|andantino|adagio|moderato|presto|largo|lento|vivace|cantabile|dolce|espressivo|rit\.?|cresc\.?|dim\.?|con moto|tempo|page|p[aá]gina|score)(?:\s|\.|$)/i;
const titlePrefix = /^(?:title|t[ií]tulo|obra)\s*:\s*/i;
const composerPrefix = /^(?:composer|compositor(?:a)?|composed by|music by|m[uú]sica(?: de)?|autor(?:a)?)\s*:?\s+/i;
const letters = value => value.match(/\p{L}/gu) || [];
const usable = text => letters(text).length >= 3 && new Set(letters(text.toLowerCase())).size >= 3 && !excluded.test(text) && !direction.test(text);
const nameOnly = text => clean(text).replace(/\s*\(?\d{4}\s*[-–—]\s*\d{0,4}\)?\s*$/, '').trim();
const isName = text => {
  const parts = nameOnly(text).split(/\s+/);
  return parts.length >= 2 && parts.length <= 7 && !/[\d:=/]/.test(nameOnly(text)) && usable(text)
    && parts.every(part => /^(?:\p{Lu}[\p{L}.'’\-]*|de|del|da|di|van|von|der|la|le)$/u.test(part));
};

export function suggestTempo(lines) {
  for (const line of [...lines].sort((a, b) => a.y - b.y)) {
    if (line.confidence != null && line.confidence < 60) continue;
    const text = clean(line.text);
    // OCR may read a musical stem as J/d/q or 1/I/l. Keep the mark for visual review.
    const match = text.match(/(?:[♩♪♫𝅘𝅥𝅘𝅥𝅮𝅗𝅥𝅘𝅥𝅯𝅝qdhJ][.·]?\s*=\s*|^=\s*|\b(?:tempo|bpm|m\.\s*m\.)\s*[:=]?\s*)(\d{2,3})(?:\s*[-–—]\s*(\d{2,3}))?(?!\d)/iu)
      || text.match(/\b(\d{2,3})(?:\s*[-–—]\s*(\d{2,3}))?\s*bpm\b/i)
      || (line.confidence != null && text.match(/^[1Il][.·]?\s*=\s*(\d{2,3})(?:\s*[-–—]\s*(\d{2,3}))?\s*$/));
    if (!match) continue;
    const first = Number(match[1]), last = match[2] ? Number(match[2]) : first;
    if (first < 20 || first > 400 || last < first || last > 400) continue;
    return { bpm: first === last && first >= 30 && first <= 160 ? first : null, tempoMark: text.slice(0, 120) };
  }
  const verbal = [...lines].sort((a, b) => a.y - b.y).find(line => line.y >= .12 && line.y < .42
    && (line.confidence == null || line.confidence >= 60)
    && /^(?:allegro|allegretto|andante|andantino|adagio|adagietto|moderato|presto|prestissimo|largo|larghetto|lento|vivace|grave|tempo (?:di|giusto|primo))\b/i.test(clean(line.text)));
  return { bpm: null, tempoMark: verbal ? clean(verbal.text).slice(0, 120) : '' };
}

export function groupHeaderLines(boxes) {
  const rows = [];
  for (const box of boxes.filter(b => b.text?.trim() && b.y >= 0 && b.y < .42 && b.confidence !== 0).sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.find(r => Math.abs((r.y + r.h) - (box.y + box.h)) < Math.max(r.h, box.h) * .5
      && box.x >= r.x && box.x - (r.x + r.w) < Math.max(r.h, box.h) * 2.5);
    if (row) {
      row.text += ' ' + box.text; row.w = Math.max(row.w, box.x + box.w - row.x); row.h = Math.max(row.h, box.h);
    } else rows.push({ ...box });
  }
  return rows.map(row => ({ ...row, text: clean(row.text) })).sort((a, b) => a.y - b.y);
}

export function suggestScoreDetails(lines, info = {}) {
  const tempo = suggestTempo(lines);
  const rows = lines.filter(row => usable(row.text) && !suggestTempo([row]).tempoMark && (row.confidence == null || row.confidence >= 60));
  const explicitTitle = rows.find(r => titlePrefix.test(r.text));
  const explicitComposer = rows.find(r => composerPrefix.test(r.text));
  // Conventional score headers place a prominent centred title above a right-aligned composer.
  const titleRows = rows.filter(r => !composerPrefix.test(r.text) && !(r.x > .5 && isName(r.text)) && r.y < .28);
  const ranked = [...titleRows].sort((a, b) => (b.h * 5 - Math.abs(b.x + b.w / 2 - .5) * .12 - b.y * .08)
    - (a.h * 5 - Math.abs(a.x + a.w / 2 - .5) * .12 - a.y * .08));
  const titleRow = explicitTitle || ranked[0];
  let title = titleRow?.text.replace(titlePrefix, '') || '';
  const composerRow = explicitComposer || rows.find(r => r !== titleRow && isName(r.text) && r.y < .3
    && (r.x > .45 || (titleRow && r.y > titleRow.y + titleRow.h * .7 && r.y < titleRow.y + .12)));
  let composer = composerRow ? nameOnly(composerRow.text.replace(composerPrefix, '')) : '';
  // A nearby opus/catalogue line belongs with the title, never in the author field.
  const opus = titleRow && rows.find(r => r !== titleRow && /^(?:op\.?|opus|BWV|K\.?|KV|D\.|Hob\.)\s*\d/i.test(r.text)
    && r.y >= titleRow.y && r.y - titleRow.y < .07);
  if (opus && !title.includes(opus.text)) title = `${title} · ${opus.text}`;
  const metadataTitle = clean(info.Title), metadataAuthor = nameOnly(info.Author);
  if (!title && usable(metadataTitle) && !/\.(?:pdf|musx?|sib|ly|docx?)$/i.test(metadataTitle)) title = metadataTitle;
  if (!composer && isName(metadataAuthor)) composer = metadataAuthor;
  return { title: title.slice(0, 200), composer: composer.slice(0, 200), ...tempo };
}
