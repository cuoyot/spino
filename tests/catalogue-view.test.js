import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { importLibrary, catalogueRecords } from '../src/companion/library.js';
import { catalogueItems, catalogueMarkup } from '../src/companion/catalogue-view.js';
import { libraryDetailMarkup } from '../src/companion/library-view.js';
import { downloadMarkup } from '../src/companion/download-view.js';
import { emptyData } from '../src/companion/model.js';

const library = await importLibrary({ read: path => readFile(`Exercises_Library/${path}`,'utf8') });
const xml = catalogueRecords(library).find(record => record.assets.length);
test('one catalogue searches both formats, sorts titles and excludes research', () => {
  const items = catalogueItems(library);
  assert.equal(items.length,65);
  assert.equal(items.filter(item=>item.format==='pdf').length,10);
  const bach = catalogueItems(library,{}, {query:'Bach'});
  assert.ok(bach.some(item=>item.format==='pdf'));
  assert.ok(bach.some(item=>item.format==='musicxml'));
  assert.equal(catalogueItems(library,{}, {query:'Czerny Op.821'}).length,0);
  const before = structuredClone(library);
  const html = catalogueMarkup(library,{},1);
  assert.equal((html.match(/class="cp-catalogue-row"/g)||[]).length,48);
  assert.doesNotMatch(html,/data-action="(?:library-add-work|add-catalog-work)"/);
  assert.match(html,/data-action="library-more"/);
  assert.deepEqual(library,before);
});
test('downloaded filter and repertoire controls require a local score in either format', () => {
  const local = structuredClone(library), data = emptyData();
  local.executions[xml.piece_id]={assetId:'synthetic-xml'};
  data.downloads=[{catalogId:'mutopia-202',assetId:'synthetic-pdf'}];
  const items=catalogueItems(local,data,{state:'downloaded'});
  assert.equal(items.length,2);
  assert.ok(items.every(item=>item.assetId));
  const html=catalogueMarkup(local,{state:'downloaded'},0,false,{data});
  assert.match(html,/data-action="library-add-work"/);
  assert.match(html,/data-action="add-catalog-work"/);
  assert.doesNotMatch(libraryDetailMarkup(library,xml.piece_id),/data-action="library-add-work"/);
  assert.equal(catalogueItems(local,data,{state:'downloaded',format:'pdf'}).length,1);
});
test('transfers combine formats in one queue and do not duplicate empty panels', () => {
  const data=emptyData(), local=structuredClone(library);
  assert.match(downloadMarkup(data,false,local),/No pending transfers/);
  assert.doesNotMatch(downloadMarkup(data,false,local),/MusicXML \/ MXL transfers|Included library/);
  data.downloadJobs=[{catalogId:'mutopia-202',status:'failed',error:'Failed to fetch'}];
  local.executions[xml.piece_id]={job:{status:'waiting-wifi'}};
  const html=downloadMarkup(data,false,local);
  assert.match(html,/data-action="download-piece"/);
  assert.match(html,/data-action="library-pause"/);
  assert.match(html,/data-action="catalogue-local"/);
});

test('every PDF has a bundled first-page preview with exact edition and licence evidence', async () => {
  const {createHash}=await import('node:crypto');
  const {CATALOG}=await import('../src/companion/catalog.js');
  const index=JSON.parse(await readFile('public/catalogue-previews/pdf/index.json','utf8'));
  assert.equal(index.previews.length,CATALOG.length);
  for(const item of CATALOG) {
    const preview=index.previews.find(preview=>preview.id===item.id);
    assert.equal(preview.revision,item.revision);assert.equal(preview.page,1);
    assert.equal(preview.source,item.source);assert.equal(preview.license,item.licenseLabel);
    const bytes=await readFile(`public/catalogue-previews/pdf/${item.id}.png`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),preview.pngSha256);
    assert.equal(bytes.readUInt32BE(0),0x89504e47);
    if(item.downloadEvidence)assert.equal(preview.pdfSha256,item.downloadEvidence.sha256);
  }
});
