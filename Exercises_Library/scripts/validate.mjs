import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root=process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');
const ajv=new Ajv({allErrors:true,strict:false});addFormats(ajv);
let syntaxCount=0,schemaCount=0,validated=0;
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.name==='node_modules'?[]:e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(root).filter(f=>f.endsWith('.json'));
for(const f of files){JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));syntaxCount++;}
for(const f of fs.readdirSync(path.join(root,'schemas')).filter(f=>f.endsWith('.json'))){const s=read('schemas/'+f);assert(ajv.validateSchema(s),JSON.stringify(ajv.errors));ajv.addSchema(s);schemaCount++;}
// Compile all schemas, including those not used by a production manifest.
for(const f of fs.readdirSync(path.join(root,'schemas')).filter(f=>f.endsWith('.json')))ajv.getSchema(read('schemas/'+f).$id);
for(const f of files){const data=JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));if(data.$schema&&!f.includes(path.sep+'schemas'+path.sep)){
 const schemaFile=path.resolve(path.dirname(f),data.$schema);assert(schemaFile.startsWith(root+path.sep));
 const schema=JSON.parse(fs.readFileSync(schemaFile,'utf8'));const check=ajv.getSchema(schema.$id);assert(check(data),path.relative(root,f)+' '+JSON.stringify(check.errors));validated++;
}}
const lib=read('library.json'),sources=read(lib.config.sources).sources;
const sourceIds=new Set(sources.map(s=>s.source_id));assert.equal(sourceIds.size,sources.length);
const evidence=read('provenance/evidence.json').items;const evidenceIds=new Set(evidence.map(e=>e.evidence_id));assert.equal(evidenceIds.size,evidence.length);
const records=[],assetIds=new Set(),manifestIds=new Set();
for(const m of lib.manifests){assert(!manifestIds.has(m.manifest_id));manifestIds.add(m.manifest_id);const d=read(m.path);assert.equal(d.manifest_id,m.manifest_id);assert.equal(d.group,m.group);assert.equal(m.sha256,sha(m.path),'Manifest checksum '+m.path);assert.equal(d.pieces.length,m.record_count);for(const p of d.pieces)assert.equal(p.catalogue_group,m.group);records.push(...d.pieces);}
const pieceIds=new Set(records.map(p=>p.piece_id));assert.equal(records.length,pieceIds.size,'Duplicate piece_id');
for(const s of sources)for(const e of s.evidence_ids)assert(evidenceIds.has(e));
for(const p of records){
 for(const e of [...p.provenance.map(x=>x.evidence_id),...p.rights.evidence_ids])assert(evidenceIds.has(e),p.piece_id+' unknown evidence '+e);
 if(p.canonical_work_id!==null)assert(pieceIds.has(p.canonical_work_id),'Unknown canonical_work_id');
 if(p.analysis.status==='pending')assert(Object.values(p.analysis.metrics).every(v=>v===null),'Derived metadata in pending analysis');
 if(p.availability.selected_asset_id!==null)assert(p.assets.some(a=>a.asset_id===p.availability.selected_asset_id));
 if(p.availability.status==='asset_located')assert(p.assets.some(a=>a.download_url!==null));
 for(const a of p.assets){assert(sourceIds.has(a.source_id));assert(!assetIds.has(a.asset_id),'Duplicate asset_id');assetIds.add(a.asset_id);assert(evidenceIds.has(a.license_evidence_id));
  if(a.verification.status==='repository_path_verified'){
   const inv=read('provenance/'+a.source_id+'.inventory.json');const row=inv.files.find(f=>f.path===a.source_path);
   assert(row);assert.equal(a.revision,inv.revision);assert.equal(row.git_blob_sha1,a.git_blob_sha1);assert.equal(row.size_bytes,a.size_bytes);
   const expected='https://raw.githubusercontent.com/'+inv.repository+'/'+inv.revision+'/'+row.path.split('/').map(encodeURIComponent).join('/');assert.equal(a.download_url,expected);
  }
 }
}
const core=records.filter(p=>p.catalogue_group==='piano_core');
assert.equal(core.length,lib.counts.piano_core_works);assert.equal(records.filter(p=>p.catalogue_group==='piano_candidates').length,lib.counts.piano_candidate_editions);assert.equal(records.filter(p=>p.catalogue_group==='accompaniment_optional').length,lib.counts.optional_accompaniment_editions);assert.equal(records.length,lib.counts.total_records);assert.equal(assetIds.size,lib.counts.located_musicxml_assets);assert.equal(records.filter(p=>p.availability.download_status==='complete').length,lib.counts.downloaded_scores);assert.equal(records.filter(p=>p.analysis.status==='complete').length,lib.counts.analyzed_records);assert.equal(records.filter(p=>p.availability.playable).length,lib.counts.playable_records);
for(const seg of read('segments/index.json').segments){assert(pieceIds.has(seg.piece_id));if(seg.asset_id!==null)assert(records.find(p=>p.piece_id===seg.piece_id).assets.some(a=>a.asset_id===seg.asset_id));if(seg.start_measure_index!==null&&seg.end_measure_index_exclusive!==null)assert(seg.end_measure_index_exclusive>seg.start_measure_index);}
// Contract checks: a playable shell and a ready segment without boundaries must fail.
const badPiece=structuredClone(records[0]);badPiece.availability.playable=true;assert.equal(ajv.getSchema('urn:sightreader:v2:piece')(badPiece),false);
const badSegment=read('examples/segment.pending.json');badSegment.status='ready';assert.equal(ajv.getSchema('urn:sightreader:v2:segment')(badSegment),false);
const good=read('examples/segment.pending.json');assert(pieceIds.has(good.piece_id));assert(ajv.getSchema('urn:sightreader:v2:segment')(good));
const report={status:'passed',checked_at:new Date().toISOString(),json_files_syntax_checked:syntaxCount,schemas_checked:schemaCount,documents_validated_against_schema:validated,manifest_count:lib.manifests.length,counts:lib.counts,checks:['JSON syntax','JSON Schema 2020-12','unique piece/asset/manifest IDs','source and evidence references','manifest SHA-256','repository paths/blob IDs','counts','pending metrics remain null','negative readiness checks','segment references'],limitations:['No MusicXML downloaded or parsed.','Repository path verification is not full HTTP/content validation.','No repertoire difficulty or hand assignment calculated.','Licenses and compositions still require the per-edition workflow documented in README.']};
fs.mkdirSync(path.join(root,'reports'),{recursive:true});fs.writeFileSync(path.join(root,'reports/validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
