// Rebuild first-page PDF previews from the exact catalogue editions. No source PDF is shipped here.
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { CATALOG } from '../src/companion/catalog.js';
const output=new URL('../public/catalogue-previews/pdf/',import.meta.url), temporary=await mkdtemp(join(tmpdir(),'spino-catalogue-previews-'));
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
await mkdir(output,{recursive:true});
const previews=[];
try {
  for(const item of CATALOG) {
    const response=await fetch(item.download,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error(`${item.id}: HTTP ${response.status}`);
    const bytes=Buffer.from(await response.arrayBuffer());
    if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error(`${item.id}: not a PDF`);
    if(item.downloadEvidence && sha256(bytes)!==item.downloadEvidence.sha256)throw Error(`${item.id}: edition hash changed`);
    const source=join(temporary,`${item.id}.pdf`), target=join(temporary,item.id);
    await writeFile(source,bytes);
    execFileSync(process.env.PDFTOPPM || 'pdftoppm',['-f','1','-singlefile','-scale-to','1500','-png',source,target]);
    const image=await readFile(target+'.png');await writeFile(new URL(item.id+'.png',output),image);
    previews.push({id:item.id,revision:item.revision,page:1,source:item.source,download:item.download,edition:item.edition,license:item.licenseLabel,licenseUrl:item.licenseUrl || 'https://www.mutopiaproject.org/legal.html',pdfSha256:sha256(bytes),pngSha256:sha256(image),bytes:image.length});
  }
  await writeFile(new URL('index.json',output),JSON.stringify({generatedAt:new Date().toISOString(),renderer:'pdftoppm',maxDimension:1500,previews},null,2)+'\n');
  console.log(JSON.stringify({previews:previews.length,bytes:previews.reduce((n,item)=>n+item.bytes,0)}));
} finally {await rm(temporary,{recursive:true,force:true});}
