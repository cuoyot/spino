// Optional network diagnostic. Artifacts are local review inputs, never bundled repertoire.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { importLibrary, catalogueRecords, digest } from '../src/companion/library.js';
import { libraryCounts, practiceState } from '../src/companion/library-state.js';
import { processScore } from '../src/companion/library-pipeline.js';
import { downloadScore } from '../src/companion/score-transfer.js';
import { bytesFromBase64, readMusicXML } from '../src/companion/musicxml-document.js';

const library = await importLibrary({ read: path => readFile(`Exercises_Library/${path}`, 'utf8') });
if (library.report.errors.length) throw new Error(library.report.errors.join('\n'));
const report = { package: libraryCounts(library), imports: library.report, diagnostics: [] };
if (process.argv.includes('--download')) {
  const id = process.argv.find(arg => arg.startsWith('--id='))?.slice(5) || 'mt_eb69b7b3cfc165d7';
  const record = catalogueRecords(library).find(r => r.piece_id === id), origin = record?.assets[0];
  if (!origin?.download_url) throw new Error('Choose a catalogue record with an observed acquisition URL.');
  const receipt = await downloadScore(origin.download_url, { id, wifiOnly: false, network: async () => ({ online: true, wifi: null, metered: null }) });
  if (!receipt.complete) throw new Error(receipt.error);
  const bytes = bytesFromBase64(receipt.base64), sha256 = await digest(bytes);
  const asset = { id: `${origin.asset_id}_${sha256.slice(0,12)}`, sourceAssetId: origin.asset_id, pieceId: id, format: origin.format, name: origin.source_path.split('/').at(-1), base64: receipt.base64, sha256, origin, rights: record.rights, provenance: record.provenance, receipt: { ...receipt, base64: undefined } };
  const result = await processScore(asset, record);
  const { xml } = readMusicXML(bytes, origin.format);
  // Exercise uncompressed MusicXML with the same genuine score, recording its derivation.
  const normalizedBytes = new TextEncoder().encode(xml), normalizedHash = await digest(normalizedBytes);
  const normalized = { ...asset, format: 'musicxml', sha256: normalizedHash, base64: Buffer.from(normalizedBytes).toString('base64') };
  const plainResult = await processScore(normalized, record);
  const execution = { ...result, assetId: asset.id, sourceAssetId: asset.sourceAssetId, sha256 };
  report.diagnostics.push({ piece_id: id, downloaded: 1, bytes: bytes.length, sha256, analyzed: result.analysis.status === 'complete' ? 1 : 0, normalized_musicxml_analyzed: plainResult.analysis.status === 'complete', segments: result.segments.length, ready: practiceState(record, execution).playable ? 1 : 0, blockers: practiceState(record, execution).reasons });
  await mkdir('artifacts/repertoire', { recursive: true });
  await writeFile(`artifacts/repertoire/${id}.mxl`, bytes);
  await writeFile(`artifacts/repertoire/${id}.musicxml`, xml);
  await writeFile(`artifacts/repertoire/${id}.json`, JSON.stringify({ record, asset, execution, normalized: { sha256: normalizedHash, derived_from_sha256: sha256 } }, null, 2));
}
await mkdir('artifacts/repertoire', { recursive: true });
await writeFile('artifacts/repertoire/integration-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
