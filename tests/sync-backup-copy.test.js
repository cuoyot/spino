import test from 'node:test';
import assert from 'node:assert/strict';
import {syncBackupCopy} from '../src/companion/sync-backup-copy.js';
import {driveSyncMarkup,mediaSyncMarkup,driveManageMarkup} from '../src/companion/drive-sync-view.js';
import {cloudHelpMarkup} from '../src/companion/cloud-backup-view.js';
import {localize,setAppLanguage} from '../src/companion/locale.js';

test('all five languages separate live synchronization, ZIP recovery and JSON portability',()=>{
 const state={transport:'drive',name:'Original musical title.json',enabled:true,status:'saved'};
 for(const lang of ['en','es','ca','de','hu']){
  setAppLanguage(lang);const t=syncBackupCopy(lang);
  const help=cloudHelpMarkup({lang,driveOnly:true});assert.ok(help.includes(t.sync));assert.ok(help.includes(t.backups));assert.ok(help.includes(t.backupHelp));assert.match(t.backupHelp,/ZIP/);
  assert.ok(driveSyncMarkup(state,{lang}).includes(t.sync));
  const media=mediaSyncMarkup({status:'error',completed:2,issues:[{title:'Original musical title',message:'Unknown diagnostic'}]},{lang});
  assert.ok(media.includes('Original musical title'));assert.ok(media.includes('Unknown diagnostic'));assert.ok(!media.includes(t.backups));
  const manage=driveManageMarkup(state,{lang});assert.ok(manage.includes(localize('Export notebook (JSON)','Exportar cuaderno (JSON)',lang)));assert.ok(manage.includes('data-action="import-json"'));assert.ok(manage.includes(localize('Import notebook (JSON)','Importar cuaderno (JSON)',lang)));assert.ok(manage.includes(localize('Practice history, scores and annotations. Does not include multimedia files.','Historial de práctica, partituras y anotaciones. No incluye archivos multimedia.',lang)));assert.ok(!manage.includes('storage-manage'));assert.ok(!manage.includes('export-backup'));
  if(lang!=='en'){assert.notEqual(localize('Cloud synchronization','Sincronización en la nube',lang),'Cloud synchronization');assert.notEqual(localize('Retry recording synchronization','Reintentar sincronización de grabaciones',lang),'Retry recording synchronization');}
 }
 setAppLanguage('en');
});

test('routine multimedia synchronization has no second manual sync control or idle progress bar',()=>{
 for(const status of ['idle','saved','wifi','offline','checking']){const markup=mediaSyncMarkup({status},{lang:'es'});assert.doesNotMatch(markup,/data-action="media-sync"|<progress|cp-more-info|Las exportaciones JSON/);}
 assert.match(mediaSyncMarkup({status:'error'},{lang:'es'}),/data-action="media-sync"/);
 assert.match(mediaSyncMarkup({status:'copying',percent:42},{lang:'es'}),/<progress/);
});
