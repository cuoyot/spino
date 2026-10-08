// SPDX-License-Identifier: GPL-3.0-only
import {eligibleJingles} from './jingles.js';
import {harmonicBridge,phraseKey} from './harmony.js';
// The engine uses active game time in milliseconds; pauses never advance it.
export function difficulty(level){
  return {bpm:Math.min(96,level<=6?[72,74,80,82,84,88][level-1]:88+(level-6)*2),window:Math.max(320,700-(level-1)*20),pitches:level<2?[60,64,67]:level<4?[60,62,64,65,67]:level<6?[60,62,64,65,67,69,71,72]:[60,61,62,63,64,65,66,67,68,69,70,71,72],beats:level<3?4:level<5?2:1};
}
export const timingLimits=window=>({earlyWindow:Math.round(window*1.25),lateWindow:Math.round(window*.65)});
export const keyboardRanges=[{clef:'treble',start:60,shift:0},{clef:'treble',start:67,shift:7},{clef:'bass',start:48,shift:-12},{clef:'bass',start:43,shift:-17}];
export class Game{
  constructor(random=Math.random,startLevel=1){this.startLevel=[1,3,5,6].includes(startLevel)?startLevel:1;this.random=random;this.time=0;this.lives=3;this.goldHealth=0;this.score=0;this.correct=0;this.attempted=0;this.mistakes=0;this.combo=0;this.level=this.startLevel;this.notes=[];this.rests=[];this.nextAt=3500;this.id=0;this.over=false;this.lastPitch=null;this.pitchAppearances=new Map();this.clef='treble';this.rangeIndex=0;this.keyboardStart=60;this.pitchShift=0;this.rangeChanges=[];this.lastRangeChangeAt=0;this.clefChanges=[];this.lastClefChangeAt=0;this.phrase=null;this.phraseIndex=0;this.phraseCount=0;this.randomSincePhrase=0;this.bridge=[];this.pendingJingle=null;this.lastJingle=null;this.lastSettings=null;this.fill();}
  fill(){while(!this.notes.length||this.nextAt<=this.time+6000){
    const d=difficulty(this.level);const eligible=eligibleJingles(d.pitches);
    if(!this.phrase&&!this.bridge.length&&eligible.length&&(this.phraseCount||this.randomSincePhrase>=4)){
      if(!this.pendingJingle){const index=eligible.findIndex(j=>j.id===this.lastJingle?.id);const jingle=eligible[(index+1)%eligible.length];this.pendingJingle=jingle;
        if(this.lastJingle)this.bridge=harmonicBridge(this.lastPitch,jingle.notes[0][0],phraseKey(jingle),d.pitches).map((midi,index)=>({midi,index:index+1,total:4,key:phraseKey(jingle),title:jingle.title}));
      }
      if(!this.bridge.length){const jingle=this.pendingJingle;const settings={...d,bpm:this.lastSettings?Math.min(d.bpm,this.lastSettings.bpm+8):d.bpm};this.phrase={jingle,settings,instance:++this.phraseCount};this.pendingJingle=null;this.phraseIndex=0;this.randomSincePhrase=0;}
    }
    let midi,beats,settings=d,phrase,transition,restAfter=false;
    if(this.bridge.length){transition=this.bridge.shift();midi=transition.midi;settings=this.lastSettings;beats=settings.beats;}
    else if(this.phrase){const p=this.phrase;settings=p.settings;const pair=p.jingle.notes[this.phraseIndex];midi=pair[0];beats=Math.min(4,settings.beats*(settings.beats===4?1:pair[1]));phrase={id:p.jingle.id,title:p.jingle.title,index:this.phraseIndex+1,total:p.jingle.notes.length,instance:p.instance};if(++this.phraseIndex===p.jingle.notes.length){this.lastJingle=p.jingle;this.lastSettings=settings;this.phrase=null;restAfter=this.level>=5&&p.instance%2===0;}}
    else{const pool=d.pitches.filter(p=>[0,4,7].includes(p%12)&&p!==this.lastPitch);midi=pool[Math.floor(this.random()*pool.length)];beats=d.beats;this.randomSincePhrase++;}
    const playedMidi=midi+this.pitchShift;
    const appearance=(this.pitchAppearances.get(playedMidi)||0)+1;this.pitchAppearances.set(playedMidi,appearance);
    this.notes.push({id:++this.id,midi:playedMidi,clef:this.clef,keyboardStart:this.keyboardStart,pitchShift:this.pitchShift,rangeIndex:this.rangeIndex,appearance,showName:appearance<=5,at:this.nextAt,window:settings.window,...timingLimits(settings.window),beats,bpm:settings.bpm,phrase,transition});this.lastPitch=midi;this.nextAt+=60000/settings.bpm*beats;
    const switchRange=restAfter&&this.phraseCount%4===0&&this.nextAt-this.lastRangeChangeAt>=45000;
    if(switchRange){const from=this.clef;this.rangeIndex=(this.rangeIndex+1)%keyboardRanges.length;const range=keyboardRanges[this.rangeIndex];this.clef=range.clef;this.keyboardStart=range.start;this.pitchShift=range.shift;this.pitchAppearances.clear();const start=this.nextAt;this.nextAt+=4500;this.lastRangeChangeAt=start;const change={start,end:this.nextAt,from,to:this.clef,keyboardStart:range.start,positionOnly:from===this.clef};this.rangeChanges.push(change);if(from!==this.clef){this.clefChanges.push(change);this.lastClefChangeAt=start;}this.rests.push({...change,changeTo:from===this.clef?undefined:this.clef,positionTo:range.start});this.nextAt+=2500;}
    else if(restAfter){const start=this.nextAt;this.nextAt+=60000/settings.bpm*4;this.rests.push({start,end:this.nextAt});}
  }}
  clefAt(time=this.time){return this.clefChanges.filter(c=>c.start<=time).at(-1)?.to||'treble';}
  keyboardStartAt(time=this.time){return this.rangeChanges.filter(c=>c.start<=time).at(-1)?.keyboardStart||60;}
  restAt(time=this.time){return this.rests.find(r=>time>=r.start&&time<r.end);}
  mistakeLimit(){return this.attempted<20?4:this.attempted<40?3:this.attempted<60?2:1;}
  finishAttempt(){this.attempted++;if([20,40,60].includes(this.attempted))this.mistakes=0;}
  lose(){const limit=this.mistakeLimit();this.mistakes++;let lifeLost=false;if(this.mistakes>=limit){lifeLost=true;this.mistakes=0;if(this.goldHealth>0){this.goldHealth--;this.lives=3+Math.ceil(this.goldHealth/2);}else this.lives--;if(this.lives<=0){this.lives=0;this.over=true;};}this.combo=0;this.finishAttempt();return {lifeLost,mistakes:this.mistakes,limit:this.mistakeLimit()};}
  advance(time){if(this.over)return [];this.time=Math.max(this.time,time);this.fill();const events=[];while(this.notes.length&&this.time>this.notes[0].at+this.notes[0].lateWindow&&!this.over){const note=this.notes.shift();if(note.failed)continue;const protection=this.lose();events.push({type:'miss',note,...protection});}if(!this.over)this.fill();return events;}
  play(midi,time){const expired=this.advance(time);if(this.over)return {type:'over',expired};if(this.restAt())return {type:'rest',expired};const note=this.notes[0];if(!note)return {type:'idle',expired};const error=this.time-note.at;
    if(midi!==note.midi||error < -note.earlyWindow||error > note.lateWindow){
      if(note.failed)return {type:'retry',note,expired};
      const before={lives:this.lives,goldHealth:this.goldHealth,mistakes:this.mistakes};const protection=this.lose();note.failed={before,after:{lives:this.lives,goldHealth:this.goldHealth,mistakes:this.mistakes}};
      return {type:midi!==note.midi?'wrong':error<0?'early':'late',note,expired,...protection};
    }
    this.notes.shift();this.fill();
    if(note.failed){const {before,after}=note.failed;this.lives=after.lives+(before.lives-after.lives)/2;this.goldHealth=after.goldHealth+(before.goldHealth-after.goldHealth)/2;this.mistakes=before.lives!==after.lives||before.goldHealth!==after.goldHealth?after.mistakes:Math.max(0,(after.mistakes+before.mistakes)/2);this.over=false;this.correct++;const points=100;this.score+=points;return {type:'corrected',note,error,points,expired};}
    this.finishAttempt();this.correct++;this.combo++;const perfect=Math.abs(error)<=Math.min(60,note.window*.3);const points=100+Math.round(100*(1-Math.abs(error)/(error<0?note.earlyWindow:note.lateWindow)))+Math.min(50,(this.combo-1)*5)+(perfect?150:0);const streakBonus=this.combo%10===0?250:0;const recharged=this.combo%20===0&&(this.lives<6||this.goldHealth%2===1);if(recharged){if(this.goldHealth%2===1)this.goldHealth++;else{this.lives++;if(this.lives>3)this.goldHealth+=2;}}this.score+=points+streakBonus;const previous=this.level;this.level=this.startLevel+Math.floor(this.correct/24);this.fill();return {type:perfect?'perfect':'good',note,error,points:points+streakBonus,streakBonus,recharged,levelUp:this.level!==previous,expired};
  }
}
