// A MIME label may be repaired only against an original local recording and
// verified remote bytes. Never invent a format for an unavailable recording.
export const recordingFormatProblem='The Drive recording format is not supported. Local files are kept.';
export async function readRecordingCopies({client,rows,load,accountId,notebookId,allowRepair=true,signal}){
 const rejected=[],files=await client.list({onInvalid:(file,error)=>rejected.push({file,error})}),issues=[];
 for(const issue of rejected){
  const {file,error}=issue,p=file.appProperties;
  const row=error.message===recordingFormatProblem&&rows.find(r=>!r.draft&&!r.remoteOnly&&(r.mediaTakeId||r.id)===p?.takeId&&(!r.cloud||r.cloud.accountId===accountId&&r.cloud.notebookId===notebookId));
  if(row&&allowRepair&&client.repairFormat){
   try{
    const original=await load(row.id);if(!original?.blob)throw error;
    const repaired=await client.repairFormat({fileId:file.id,takeId:row.mediaTakeId||row.id,workId:row.workId,blob:original.blob,signal});
    files.push(repaired);continue;
   }catch(repairError){issues.push({file,error:repairError,localId:row.id});continue;}
  }
  issues.push({...issue,...(row?{localId:row.id}:{})});
 }
 return {files,issues};
}
