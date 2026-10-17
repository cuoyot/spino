import test from 'node:test';
import assert from 'node:assert/strict';
import {notebookConflictReview} from '../src/companion/cloud-conflict-review.js';
import {cloudConflictMarkup} from '../src/companion/cloud-backup-view.js';
test('review names the plan link conflict and explicitly retains both independent practices',()=>{
 const session=(id,title)=>({id,title,date:'2026-10-17',elapsedMs:120000});
 const a=session('phone','Phone practice'),b=session('tablet','Tablet practice');
 const notebook=(sessions,id)=>({data:{sessions,plans:[{id:'plan',title:'Shared plan',sessionId:id}]}});
 const local=notebook([a],a.id),remote=notebook([b],b.id),merged=notebook([a,b],a.id),conflicts=['/data/plans/plan/sessionId'];
 const review=notebookConflictReview(local,remote,merged,conflicts);
 assert.equal(review.practiceCount,2);assert.deepEqual(review.practices.map(s=>s.id),['phone','tablet']);
 assert.equal(review.values[0].field,'sessionId');assert.equal(review.values[0].local.title,a.title);assert.equal(review.values[0].remote.title,b.title);
 const html=cloudConflictMarkup({conflicts,conflictReview:review},{lang:'es'});
 for(const expected of ['2 prácticas independientes','Phone practice','Tablet practice','Práctica vinculada a este plan','Preferir aquí en los conflictos'])assert.ok(html.includes(expected),expected);
});
test('review excludes contested practice versions from its preserved count and escapes user text',()=>{
 const local={data:{sessions:[{id:'same',title:'<img onerror=alert(1)>',notes:'<b>Here</b>'}]}},remote=structuredClone(local);remote.data.sessions[0].notes='Cloud';
 const conflicts=['/data/sessions/same/notes'],review=notebookConflictReview(local,remote,local,conflicts);
 assert.equal(review.practiceCount,0);
 const html=cloudConflictMarkup({conflicts,conflictReview:review},{lang:'en'});assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;b&gt;Here&lt;/b&gt;'));assert.ok(!html.includes('<img onerror='));
});
test('review handles encoded graph IDs, raw legacy IDs and empty values without score contents',()=>{
 const notebook={data:{works:[{id:'raw%id',title:'Keep original title',notes:''}],sessions:[]}};
 for(const [path,remote] of [['/data/works/raw%id/notes',[]],['/data/works/raw%25id/notes',['/data/works/raw%25id/notes']]]){
  const r=notebookConflictReview(notebook,notebook,notebook,[path],remote);assert.equal(r.values[0].title,'Keep original title');assert.equal(r.values[0].local.kind,'empty');
 }
});
