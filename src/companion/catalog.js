// Reviewed PDF collection. Score viewing/manual tracking only; no inferred difficulty.
// Edition evidence and source links are retained in exported attachments.
import { getAppLanguage } from './locale.js';
import { localize } from './locale.js';
import { CATALOGUE_ADDITIONS } from './catalogue-additions.js';
export const CATALOG_VERSION = 7;
export const CATALOG = [
  {
    id: 'mutopia-75', title: 'Minueto en Sol mayor · BWV Anh. 114', composer: 'Christian Petzold (atribución indicada en la edición)',
    targets: ['G-major'], keyLabel: 'Sol mayor',
    reason: 'Aplica la armadura de Sol mayor en una pieza real. Empieza con la primera frase, manos separadas; revisa las alteraciones antes de ampliar el pasaje.',
    passage: 'Primera frase: reconocer fa sostenido y mantener el pulso en 3/4. Manos separadas.',
    edition: 'Mutopia 2017/01/19-75 · edición de Allen Garvin',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=75',
    download: 'https://www.mutopiaproject.org/ftp/BachJS/BWVAnh114/anna-magdalena-04/anna-magdalena-04-a4.pdf',
    licenseLabel: 'Dominio público, según la edición y Mutopia', reviewed: '2026-09-30',
  },
  {
    id: 'mutopia-1612', title: 'Minueto en La menor · BWV Anh. 120', composer: 'J. S. Bach (atribución del catálogo Mutopia)',
    targets: ['A-natural', 'A-harmonic'], keyLabel: 'La menor · con alteraciones',
    reason: 'Aplicación tonal relacionada con las lecciones de La menor. La pieza contiene alteraciones: no está limitada a las siete notas de la menor natural. Identifícalas antes de tocar.',
    passage: 'Primera frase, manos separadas. Localizar las alteraciones y compararlas con la menor natural y armónica.',
    edition: 'Mutopia 2009/01/06-1612 · edición de Steven McDougall',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1612',
    download: 'https://www.mutopiaproject.org/ftp/BachJS/BWVAnh120/BWV-120/BWV-120-a4.pdf',
    licenseLabel: 'Dominio público, según la edición y Mutopia', reviewed: '2026-09-30',
  },
  {
    id: 'mutopia-202', title: 'La Candeur · Op. 100 No. 1', composer: 'Johann Friedrich Franz Burgmüller',
    targets: ['C-major'], keyLabel: 'C major',
    reason: 'Practice reading the opening phrase in C major, then connect it to the next phrase.',
    passage: 'Opening phrase; choose a comfortable tempo and mark any difficult changes.',
    edition: 'Mutopia 2013/01/12-202 · Bas Wassink · Collection Litolff, 19th century', editor: 'Bas Wassink',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=202',
    download: 'https://www.mutopiaproject.org/ftp/BurgmullerJFF/O100/25EF-01/25EF-01-a4.pdf', filename: '25EF-01-a4.pdf',
    licenseLabel: 'Public Domain · edition dedicated by the typesetter', licenseUrl: 'https://www.mutopiaproject.org/legal.html', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 64659, sha256: 'd65e0d8132da464b7c2f1e2f1c7b649946f89b8596b95e7373c454d0d223d319' },
  },
  {
    id: 'mutopia-203', title: "l'Arabesque · Op. 100 No. 2", composer: 'Johann Friedrich Franz Burgmüller',
    targets: ['A-natural', 'A-harmonic'], keyLabel: 'A minor · includes accidentals',
    reason: 'Read the opening patterns in A minor. Check written accidentals before increasing speed.',
    passage: 'Opening phrase, then the next contrasting phrase. Keep the written articulation visible.',
    edition: 'Mutopia 2013/01/12-203 · Bas Wassink · Collection Litolff, 19th century', editor: 'Bas Wassink',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=203',
    download: 'https://www.mutopiaproject.org/ftp/BurgmullerJFF/O100/25EF-02/25EF-02-a4.pdf', filename: '25EF-02-a4.pdf',
    licenseLabel: 'Public Domain · edition dedicated by the typesetter', licenseUrl: 'https://www.mutopiaproject.org/legal.html', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 66907, sha256: '38e77d34af818774ff888a7ba64637b8820b0ace4e7ece5aa67c0d157cd2a661' },
  },
  {
    id: 'mutopia-218', title: 'La Pastorale · Op. 100 No. 3', composer: 'Johann Friedrich Franz Burgmüller',
    targets: ['G-major'], keyLabel: 'G major',
    reason: 'Apply the G major key signature while reading the opening in 6/8.',
    passage: 'Opening phrase. Count the compound pulse before joining the hands.',
    edition: 'Mutopia 2013/01/12-218 · Bas Wassink · Collection Litolff, 19th century', editor: 'Bas Wassink',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=218',
    download: 'https://www.mutopiaproject.org/ftp/BurgmullerJFF/O100/25EF-03/25EF-03-a4.pdf', filename: '25EF-03-a4.pdf',
    licenseLabel: 'Public Domain · edition dedicated by the typesetter', licenseUrl: 'https://www.mutopiaproject.org/legal.html', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 67060, sha256: '278500ead2c9f578a6a7158fd382ecf7210cc89cf063b643026661044bddd43c' },
  },
  {
    id: 'mutopia-219', title: 'La Petite Réunion · Op. 100 No. 4', composer: 'Johann Friedrich Franz Burgmüller',
    targets: ['C-major'], keyLabel: 'C major',
    reason: 'Read the opening in C major slowly, checking every written interval before repeating it.',
    passage: 'Opening phrase. Mark places that need separate practice and return to the complete phrase.',
    edition: 'Mutopia 2013/01/12-219 · Bas Wassink · Collection Litolff, 19th century', editor: 'Bas Wassink',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=219',
    download: 'https://www.mutopiaproject.org/ftp/BurgmullerJFF/O100/25EF-04/25EF-04-a4.pdf', filename: '25EF-04-a4.pdf',
    licenseLabel: 'Public Domain · edition dedicated by the typesetter', licenseUrl: 'https://www.mutopiaproject.org/legal.html', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 68505, sha256: '42fa49948bbe6f04583b6a660fe7ee8c4743474ce0ee8ce5e757839b6765c26a' },
  },
  {
    id: 'mutopia-214', title: 'Innocence · Op. 100 No. 5', composer: 'Johann Friedrich Franz Burgmüller',
    targets: ['F-major'], keyLabel: 'F major',
    reason: 'Read in F major with a steady three-beat pulse and notice the B flats in the key signature.',
    passage: 'Opening phrase. Read slowly before repeating with the written dynamics.',
    edition: 'Mutopia 2013/01/12-214 · Bas Wassink · Collection Litolff, 19th century', editor: 'Bas Wassink',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=214',
    download: 'https://www.mutopiaproject.org/ftp/BurgmullerJFF/O100/25EF-05/25EF-05-a4.pdf', filename: '25EF-05-a4.pdf',
    licenseLabel: 'Public Domain · edition dedicated by the typesetter', licenseUrl: 'https://www.mutopiaproject.org/legal.html', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 64189, sha256: 'a94740fa90a20752564b103456b6bae941cd65c0539bbab2db239e08b20e7301' },
  },
  {
    id: 'mutopia-215', title: 'Progrès · Op. 100 No. 6', composer: 'Johann Friedrich Franz Burgmüller',
    targets: ['C-major'], keyLabel: 'C major',
    reason: 'Apply C major reading to a complete study. Start slowly enough to follow the score continuously.',
    passage: 'Opening phrase; isolate difficult changes before extending the passage.',
    edition: 'Mutopia 2013/01/12-215 · Bas Wassink · Collection Litolff, 19th century', editor: 'Bas Wassink',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=215',
    download: 'https://www.mutopiaproject.org/ftp/BurgmullerJFF/O100/25EF-06/25EF-06-a4.pdf', filename: '25EF-06-a4.pdf',
    licenseLabel: 'Public Domain · edition dedicated by the typesetter', licenseUrl: 'https://www.mutopiaproject.org/legal.html', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 64932, sha256: 'cb1f238292b6164eeff7425aea36ce3ffbc07cbb734d7aaa0dab5c9176d02fa8' },
  },
  {
    id: 'mutopia-40', title: 'Invention 1 · BWV 772', composer: 'Johann Sebastian Bach',
    targets: [], keyLabel: 'Key not classified',
    reason: 'Follow each voice separately, then practise the opening with both voices visible.',
    passage: 'Opening phrase. Choose and annotate a short passage before joining the voices.',
    edition: 'Mutopia 2008/06/15-40 · jeff covey · Bach-Gesellschaft', editor: 'jeff covey',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=40',
    download: 'https://www.mutopiaproject.org/ftp/BachJS/BWV772/bach-invention-01/bach-invention-01-a4.pdf', filename: 'bach-invention-01-a4.pdf',
    licenseLabel: 'Creative Commons Attribution-ShareAlike 3.0 · jeff covey', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 66384, sha256: '065368cc0357b7fb0666c179be47d9829bb0fb785ead2592b41d2fc8a2d28018' },
  },
  {
    id: 'mutopia-354', title: 'Von fremden Ländern und Menschen · Op. 15 No. 1', composer: 'Robert Schumann',
    targets: ['G-major'], keyLabel: 'G major',
    reason: 'Read a complete score in G major and mark passages to revisit in your next session.',
    passage: 'Opening phrase. Read each staff before coordinating the parts.',
    edition: 'Mutopia 2006/01/01-354 · Ying-Chun Liu · Leichte Stucke, 1900', editor: 'Ying-Chun Liu',
    source: 'https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=354',
    download: 'https://www.mutopiaproject.org/ftp/SchumannR/O15/SchumannOp15No01/SchumannOp15No01-a4.pdf', filename: 'SchumannOp15No01-a4.pdf',
    licenseLabel: 'Public Domain · edition dedicated by the typesetter', licenseUrl: 'https://www.mutopiaproject.org/legal.html', reviewed: '2026-09-30',
    downloadEvidence: { checked: '2026-09-30', bytes: 42286, sha256: '55f58753bc8309128bee008fe90c9d2499db79079cd1b4a4d3ae08b6603e7e9d' },
  },
  ...CATALOGUE_ADDITIONS,
].map(item => ({ revision: '1', ...item }));

// Only app-authored practice guidance is translated. Edition credits, source
// evidence, musical titles and acquisition metadata retain their original text.
const GUIDANCE = {
  'mutopia-75': {
    en: { keyLabel: 'G major', reason: 'Apply the G major key signature in a complete piece. Start with the first phrase, hands separately; check accidentals before extending the passage.', passage: 'First phrase: recognize F sharp and keep the pulse in 3/4. Hands separately.' },
  },
  'mutopia-1612': {
    en: { keyLabel: 'A minor · includes accidentals', reason: 'Apply the A minor lessons to a complete piece. This score includes accidentals and is not limited to the seven notes of natural minor. Identify them before playing.', passage: 'First phrase, hands separately. Find the accidentals and compare them with natural and harmonic minor.' },
  },
  'mutopia-202': {
    es: { keyLabel: 'Do mayor', reason: 'Practica la lectura de la primera frase en Do mayor y después enlázala con la siguiente.', passage: 'Primera frase: elige un tempo cómodo y marca los cambios difíciles.' },
  },
  'mutopia-203': {
    es: { keyLabel: 'La menor · con alteraciones', reason: 'Lee los patrones iniciales en La menor. Comprueba las alteraciones escritas antes de aumentar la velocidad.', passage: 'Primera frase y después la siguiente frase contrastante. Mantén visibles las indicaciones de articulación.' },
  },
  'mutopia-218': {
    es: { keyLabel: 'Sol mayor', reason: 'Aplica la armadura de Sol mayor al leer el comienzo en 6/8.', passage: 'Primera frase: cuenta el pulso compuesto antes de juntar las manos.' },
  },
  'mutopia-219': {
    es: { keyLabel: 'Do mayor', reason: 'Lee despacio el comienzo en Do mayor y comprueba cada intervalo escrito antes de repetirlo.', passage: 'Primera frase: marca los puntos que necesitan práctica por separado y vuelve a la frase completa.' },
  },
  'mutopia-214': {
    es: { keyLabel: 'Fa mayor', reason: 'Lee en Fa mayor con un pulso estable de tres tiempos y fíjate en los si bemoles de la armadura.', passage: 'Primera frase: lee despacio antes de repetir con las dinámicas escritas.' },
  },
  'mutopia-215': {
    es: { keyLabel: 'Do mayor', reason: 'Aplica la lectura en Do mayor a un estudio completo. Empieza lo bastante despacio para seguir la partitura sin interrupciones.', passage: 'Primera frase: trabaja por separado los cambios difíciles antes de ampliar el pasaje.' },
  },
  'mutopia-40': {
    es: { keyLabel: 'Tonalidad sin clasificar', reason: 'Sigue cada voz por separado y después practica el comienzo con ambas voces visibles.', passage: 'Primera frase: elige y anota un pasaje corto antes de juntar las voces.' },
  },
  'mutopia-354': {
    es: { keyLabel: 'Sol mayor', reason: 'Lee una partitura completa en Sol mayor y marca los pasajes que quieras repasar en la próxima sesión.', passage: 'Primera frase: lee cada pentagrama antes de coordinar las partes.' },
  },
};

export function catalogPresentation(item, lang = getAppLanguage()) {
  const generic = item.canonicalWorkId ? { keyLabel: 'Tonalidad sin clasificar', reason: 'Consulta la vista previa y elige un pasaje corto para practicar.', passage: 'Primera frase. Elige un tempo cómodo y anota los pasajes que quieras repasar.' } : {};
  if (['ca','de','hu'].includes(lang)) {
    const guidance = { keyLabel: item.keyLabel, reason: item.reason, passage: item.passage, ...GUIDANCE[item.id]?.en };
    return { ...item, ...localize(guidance,null,lang) };
  }
  return { ...item, ...(lang === 'es' ? generic : {}), ...GUIDANCE[item.id]?.[lang === 'es' ? 'es' : 'en'] };
}
