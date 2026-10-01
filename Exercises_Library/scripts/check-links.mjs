import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));
const lib=read('library.json'),config=read('config/ingestion.json');
const all=lib.manifests.flatMap(m=>read(m.path).pieces).flatMap(p=>p.assets.map(a=>({piece_id:p.piece_id,...a})));
// Default: all piano candidates plus 12 evenly spread Lieder. --all checks every asset.
const piano=all.filter(a=>a.source_id==='musetrainer'),songs=all.filter(a=>a.source_id==='openscore');
const subset=process.argv.includes('--all')?all:[...piano,...Array.from({length:Math.min(12,songs.length)},(_,i)=>songs[Math.floor(i*songs.length/12)])];
let cursor=0;const results=[];
async function worker(){while(cursor<subset.length){const a=subset[cursor++];const url=new URL(a.download_url);if(!config.download.allowed_hosts.includes(url.hostname))throw Error('Host not allowed');let result;
 try{const r=await fetch(url,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(config.download.timeout_ms)});result={asset_id:a.asset_id,url:a.download_url,status:r.status,ok:r.ok,content_type:r.headers.get('content-type'),checked_at:new Date().toISOString()};}
 catch(e){result={asset_id:a.asset_id,url:a.download_url,status:null,ok:false,error:e.message,checked_at:new Date().toISOString()};}results.push(result);
}}
await Promise.all(Array.from({length:config.download.concurrency},worker));
results.sort((a,b)=>a.asset_id.localeCompare(b.asset_id));
const report={method:'HEAD',scope:process.argv.includes('--all')?'all_assets':'all_piano_candidates_and_12_lieder_sample',total_assets:all.length,checked:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,notes:['HTTP availability only; no score payload downloaded, no content/parser validation.','Does not mutate manifests or upgrade licence/readiness states.'],results};
fs.writeFileSync(path.join(root,'reports/link-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checked:report.checked,passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
