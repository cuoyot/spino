import {block,copy} from './model.js';
import {practiceDefaults} from './practice-defaults.js';
import {warmupPreferences,warmupBlockValues} from './warmups.js';

export function routineDraft(source,data) {
  const draft=copy(source),warm=draft.blocks.find(b=>b.type==='warmup');
  draft.context='piano';
  draft.routinePolicy={autoMidi:true,dynamicTempo:true,warmup:warm?true:warmupPreferences(data.preferences).enabled,warmupMinutes:warm?.minutes||warmupPreferences(data.preferences).minutes,...draft.routinePolicy};
  draft.blocks=draft.blocks.filter(b=>b.type!=='warmup');
  if(!draft.blocks.length)draft.blocks=[block('reading',{...practiceDefaults(data.preferences,'reading'),minutes:10})];
  return draft;
}
export function routineForPractice(source,data,connected,{keepTempo=false}={}) {
  if(!source.routinePolicy)return source;
  const planned=copy(source),policy=planned.routinePolicy;
  planned.context=connected?'midi':'piano';
  planned.blocks=planned.blocks.filter(b=>b.type!=='warmup').map(b=>({...b,bpm:keepTempo?b.bpm:['reading','technique'].includes(b.type)?practiceDefaults(data.preferences,b.type).bpm:60}));
  if(policy.warmup) {
    const runtimeData={...data,preferences:{...data.preferences,warmup:{...warmupPreferences(data.preferences),minutes:policy.warmupMinutes,exercise:'rotate'}}};
    planned.blocks.unshift(block('warmup',warmupBlockValues(runtimeData)));
  }
  return planned;
}
