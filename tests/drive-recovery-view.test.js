import test from 'node:test';
import assert from 'node:assert/strict';
import {driveNotebookPickerMarkup} from '../src/companion/drive-notebook-view.js';
import {driveComparisonMarkup,driveRenameMarkup} from '../src/companion/drive-recovery-view.js';
import {backupExportName} from '../src/companion/backup-export-name.js';
const files=['first','second'].map((id,i)=>({id,name:'Same name',appProperties:{notebookId:'shared'},summary:{sessions:i?[{id:'practice',date:'2026-10-22',elapsedMs:7620000}]:[],works:2,weeklyMinutes:i?240:90}}));
test('duplicate names have content differences and no automatic selection; exact QR filters by file',()=>{
 const html=driveNotebookPickerMarkup({},files,{lang:'en'});
 assert.doesNotMatch(html,/checked/);assert.match(html,/Saved sessions/);assert.match(html,/first/);assert.match(html,/second/);
 const detail=driveComparisonMarkup(files[1],files,'en',new Date(2026,9,22));
 assert.match(detail,/127 min/);assert.match(detail,/Sessions absent from the other copies/);
 const filtered=driveNotebookPickerMarkup({},files,{lang:'en',expectedId:'shared',expectedFileId:'second'});
 assert.match(filtered,/value="second" checked/);assert.doesNotMatch(filtered,/value="first"/);
 assert.doesNotMatch(driveRenameMarkup('<script>','en'),/<script>/);
});
test('same-device beta and stable local exports have distinct channel, version and timestamp names',()=>{
 const now=new Date('2026-10-22T10:00:00Z');
 const beta=backupExportName('6.1.2-beta.1',1,{now}),stable=backupExportName('6.1.1',1,{now});
 assert.match(beta,/spino-beta-6.1.2-beta.1/);assert.match(stable,/spino-stable-6.1.1/);assert.notEqual(beta,stable);
 assert.notEqual(beta,backupExportName('6.1.2-beta.1',1,{now:new Date(now.getTime()+1)}));
});
