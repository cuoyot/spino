import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import library from '../../Exercises_Library/schemas/library.schema.json' with { type: 'json' };
import manifest from '../../Exercises_Library/schemas/manifest.schema.json' with { type: 'json' };
import piece from '../../Exercises_Library/schemas/piece.schema.json' with { type: 'json' };
import analysis from '../../Exercises_Library/schemas/analysis.schema.json' with { type: 'json' };
import segment from '../../Exercises_Library/schemas/segment.schema.json' with { type: 'json' };
import sources from '../../Exercises_Library/schemas/sources.schema.json' with { type: 'json' };
import evidence from '../../Exercises_Library/schemas/evidence.schema.json' with { type: 'json' };
import ingestion from '../../Exercises_Library/schemas/ingestion.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
for (const schema of [analysis, piece, manifest, library, segment, sources, evidence, ingestion]) ajv.addSchema(schema);
export function checkContract(kind, value, context = kind) {
  const validate = ajv.getSchema(`urn:sightreader:v2:${kind}`);
  if (!validate || !validate(value)) throw new Error(`${context}: ${validate ? ajv.errorsText(validate.errors, { separator: '; ' }) : 'Unknown schema'}`);
  return value;
}
export const emptyMetrics = () => Object.fromEntries(analysis.properties.metrics.required.map(key => [key, null]));
export const pendingAnalysis = () => ({ status: 'pending', parser_version: null, algorithm_version: null, input_asset_id: null, input_sha256: null, computed_at: null, error: null, metrics: emptyMetrics(), warnings: [] });
