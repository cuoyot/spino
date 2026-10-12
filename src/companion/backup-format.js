import { VERSION, validateBackup } from './model.js';

export const ORGANIZED_BACKUP_VERSION = 2;
export const ORGANIZED_BACKUP_READER = '6.0.0-beta.3';
const LIMIT = 60000000;
const tooNew = () => new Error('This backup uses a newer format. Update SPino before restoring it. No data has been changed.');
function readJSON(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > LIMIT) throw new Error('The backup exceeds the 60 MB limit.');
  try {return JSON.parse(text);} catch {throw new Error('The backup is not valid JSON.');}
}
export function inspectBackup(text) {
  const source=readJSON(text);
  if(source?.format==='cuaderno-piano') {
    if(Number.isInteger(source.version)&&source.version>VERSION)throw tooNew();
    return {text,backup:validateBackup(text),containerVersion:1,converted:false};
  }
  if(source?.format!=='spino-backup')throw new Error('This file is not a supported SPino backup.');
  if(source.version>ORGANIZED_BACKUP_VERSION || source.dataVersion>VERSION)throw tooNew();
  if(source.version!==2||source.dataVersion!==VERSION||!source.notebook||!source.repertoire||!Array.isArray(source.scores)||!Array.isArray(source.annotations)||!Array.isArray(source.scoreViews))throw new Error('The organized backup is incomplete.');
  const assetIds=new Set(source.scores.map(a=>a.id));
  const map=entries=>{const result=new Map();for(const item of entries){if(!item||!assetIds.has(item.assetId)||result.has(item.assetId))throw new Error('The backup contains duplicate or missing score references.');result.set(item.assetId,item.value);}return result;};
  const annotations=map(source.annotations),views=map(source.scoreViews);
  const assets=source.scores.map(a=>({...a,...(annotations.has(a.id)?{annotations:annotations.get(a.id)}:{}),...(views.has(a.id)?{scoreView:views.get(a.id)}:{})}));
  const normalized=JSON.stringify({format:'cuaderno-piano',version:VERSION,exportedAt:source.exportedAt,data:{...source.notebook,works:source.repertoire.works,downloads:source.repertoire.downloads},assets,legacy:source.legacy,...(source.library?{library:source.library}:{})});
  if(new TextEncoder().encode(normalized).length>LIMIT)throw new Error('The converted backup exceeds the 60 MB limit.');
  return {text:normalized,backup:validateBackup(normalized),containerVersion:2,converted:true};
}
export function convertBackup(text,targetVersion) {
  const inspected=inspectBackup(text),backup=inspected.backup;
  if(targetVersion===1)return inspected.text;
  if(targetVersion!==2)throw new Error('Unsupported backup conversion.');
  const {works,downloads,...notebook}=backup.data;
  const annotations=[],scoreViews=[];
  const scores=backup.assets.map(asset=>{const {annotations:marks,scoreView,...score}=asset;if(marks!=null)annotations.push({assetId:asset.id,value:marks});if(scoreView!=null)scoreViews.push({assetId:asset.id,value:scoreView});return score;});
  const converted=JSON.stringify({format:'spino-backup',version:2,dataVersion:VERSION,minimumReader:ORGANIZED_BACKUP_READER,exportedAt:backup.exportedAt,notebook,repertoire:{works,downloads},scores,annotations,scoreViews,legacy:backup.legacy,...(backup.library?{library:backup.library}:{})});
  inspectBackup(converted);
  return converted;
}
export function backupCounts(backup) {
  return {works:backup.data.works.length,scores:backup.assets.length,annotatedScores:backup.assets.filter(a=>a.annotations!=null).length,marks:backup.assets.reduce((sum,a)=>sum+(a.annotations?.marks?.length||0),0),sessions:backup.data.sessions.length};
}
