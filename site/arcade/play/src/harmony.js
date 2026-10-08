// SPDX-License-Identifier: GPL-3.0-only
const chords={
 C:[[60,64,67,72],[60,65,69],[62,67,71],[60,64,67,72]],
 F:[[60,65,69],[62,65,70],[60,64,67],[60,65,69]],
 Am:[[60,64,69],[62,65,69],[64,68,71],[60,64,69]],
};
export const phraseKey=jingle=>jingle.id==='birthday'?'F':jingle.id==='tarantella'?'Am':'C';
// Voice-leading through tonic, subdominant, dominant and tonic. Prefer small
// melodic intervals, and account for both the departing and arriving melody.
export function harmonicBridge(from,to,key,pitches){
 const progression=chords[key]||chords.C;
 const move=(a,b)=>Math.abs(a-b)+(Math.abs(a-b)>5?12:0)+(a===b?1:0);
 let paths=[{last:from,score:0,notes:[]}];
 for(const chord of progression){const allowed=chord.filter(p=>pitches.includes(p));const choices=allowed.length?allowed:pitches.filter(p=>[0,4,7].includes(p%12));
  paths=choices.map(p=>{const best=paths.reduce((a,b)=>a.score+move(a.last,p)<=b.score+move(b.last,p)?a:b);return {last:p,score:best.score+move(best.last,p),notes:[...best.notes,p]};});
 }
 return paths.reduce((a,b)=>a.score+move(a.last,to)<=b.score+move(b.last,to)?a:b).notes;
}
