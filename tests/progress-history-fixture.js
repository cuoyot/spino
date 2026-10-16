import { emptyData, beginSession, block, saveSession, localDate, addDays } from '../src/companion/model.js';
import { scorePDF } from './pdf-fixture.js';
import { mxlFixture } from './musicxml-fixture.js';

export function historyFixture() {
  const data = emptyData(), today = localDate();
  Object.assign(data.preferences, { language: 'es', theme: 'light' });
  data.works = [
    { id: 'history-prelude', title: 'Prélude en do majeur', composer: 'Review fixture', assetId: 'history-pdf' },
    { id: 'history-etude', title: 'Étude mélodique', composer: 'Review fixture', assetId: 'history-mxl' },
    { id: 'history-missing', title: 'A long synthetic title with <tags> & several movements', assetId: 'missing-score', trashedAt: '2026-10-15T12:00:00Z' },
  ].map(work => ({ composer: '', stage: 'En estudio', notes: '', passage: '', target: null, bpm: 60, ...work }));
  const rows = [
    ['Práctica de piano', ['free'], 20, 4, null, true],
    ['Repertorio', ['repertoire'], 44, 5, 'history-prelude'],
    ['Lectura y repertorio', ['reading', 'repertoire'], 9, null, 'history-etude'],
    ['Técnica y lectura', ['technique', 'reading'], 90, 2, null, false, true],
    ['Repaso de una obra archivada', ['repertoire'], 12, 1, 'history-missing'],
  ];
  rows.forEach(([title, types, duration, mood, workId, manual, partial], index) => {
    const time = new Date(addDays(today, -index) + 'T12:00:00').getTime();
    const active = beginSession({ title, context: manual ? 'piano' : 'midi', blocks: types.map((type, i) => block(type, { id: `history-block-${index}-${i}`, ...(type === 'repertoire' ? { workId } : {}) })) }, time);
    active.id = `history-session-${index}`;
    active.elapsedMs = duration * 60000; active.blockElapsedMs = active.elapsedMs / active.blocks.length;
    active.results = active.blocks.slice(0, -1).map(block => ({ block, context: active.context, elapsedMs: active.blockElapsedMs, measurement: null, material: null }));
    active.blockIndex = active.blocks.length - 1;
    const saved = saveSession(data, active, { mood, partial }, time + active.elapsedMs);
    saved.manual = !!manual;
  });
  data.sessions.reverse();
  const assets = [
    { id: 'history-pdf', name: 'Synthetic score.pdf', type: 'application/pdf', base64: scorePDF() },
    { id: 'history-mxl', name: 'Synthetic score.mxl', format: 'mxl', type: 'application/vnd.recordare.musicxml', base64: Buffer.from(mxlFixture()).toString('base64') },
  ];
  return { data, assets };
}
