// Channels have separate native storage, but exports can share a Downloads folder.
export function backupExportName(version,format,{converting=false,now=new Date()}={}){
 const channel=version.includes('-beta')?'beta':'stable';
 const safeVersion=version.replace(/[^a-zA-Z0-9.-]/g,'_');
 const timestamp=now.toISOString().replace(/[:.]/g,'-');
 return `spino-${channel}-${safeVersion}-${timestamp}-${converting?'converted-':''}format-${format}.json`;
}
