import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReleaseNoticeState, RELEASE_NOTICE_KEY, releaseNoticeCopy, releaseNoticeMarkup} from '../src/companion/release-notice.js';
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};};
test('new installations keep onboarding and do not receive an update prompt',()=>{
 const storage=memory();assert.equal(createReleaseNoticeState({storage,version:'6.2.1',existingNotebook:false}).pending,false);
 assert.equal(storage.getItem(RELEASE_NOTICE_KEY),'6.2.1');
});
test('legacy installations and upgrades receive one dismissible notice per release',()=>{
 const storage=memory();let state=createReleaseNoticeState({storage,version:'6.2.1',existingNotebook:true});
 assert.equal(state.pending,true);state.acknowledge();assert.equal(state.pending,false);
 assert.equal(createReleaseNoticeState({storage,version:'6.2.1',existingNotebook:true}).pending,false);
 assert.equal(createReleaseNoticeState({storage,version:'6.2.2',existingNotebook:true}).pending,true);
});
test('unavailable local preferences never prevent startup or repeatedly request a rating',()=>{
 const storage={getItem(){throw Error('Unavailable');},setItem(){throw Error('Unavailable');}};
 const state=createReleaseNoticeState({storage,version:'6.2.1',existingNotebook:true});assert.equal(state.pending,false);state.acknowledge();
});
test('all five locales provide the three improvements and an optional neutral rating action',()=>{
 for(const lang of ['en','es','ca','de','hu']){
  const copy=releaseNoticeCopy(lang),html=releaseNoticeMarkup('6.2.1',lang);
  assert.equal((html.match(/<li>/g)||[]).length,3);assert.ok(copy.feedback);assert.ok(copy.rate);
  assert.match(html,/data-action="close-dialog"/);assert.match(html,/data-action="release-notice-rate"/);
 }
});
