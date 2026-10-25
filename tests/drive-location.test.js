import test from 'node:test';import assert from 'node:assert/strict';
import {driveSyncMarkup,driveManageMarkup} from '../src/companion/drive-sync-view.js';
import {driveNotebookPickerMarkup} from '../src/companion/drive-notebook-view.js';
const state={transport:'drive',name:'5_Piano.json',enabled:true,status:'saved',account:{email:'test@example.invalid'},fileId:'first-notebook-reference-123456789012',folderId:'objects',storageFolderId:'chosen-folder',storageFolderName:'My piano folder'};
test('connected card, manage and picker expose one matching notebook reference and the chosen folder',()=>{
 for(const html of [driveSyncMarkup(state,{lang:'es'}),driveManageMarkup(state,{lang:'es'})]){
  assert.match(html,/5_Piano/);assert.doesNotMatch(html,/3_Old|4_Old/);assert.match(html,/123456789012/);assert.match(html,/My piano folder/);assert.match(html,/https:\/\/drive.google.com\/drive\/folders\/chosen-folder/);
 }
 const picker=driveNotebookPickerMarkup(state.account,[{id:state.fileId,name:state.name,appProperties:{}}],{lang:'es'});assert.match(picker,/123456789012/);
});
