import {block} from './model.js';
import {practiceDefaults} from './practice-defaults.js';
import {ui} from './locale.js';

export function quickPractice(preferences,random=Math.random) {
  const hand=random()<0.5?'right':'left';
  // Diatonic start-key indices, kept in a comfortable register for the chosen clef.
  const starts=hand==='right'?[25,27,29,31]:[16,18,20,22];
  const keyboardStart=starts[Math.min(starts.length-1,Math.floor(random()*starts.length))];
  return {title:ui('Quick practice','Práctica rápida'),context:'mobile',blocks:[block('reading',{
    ...practiceDefaults(preferences,'reading'),minutes:5,hand,timing:'wait',input:'piano',target:'C-major',keyboardStart,quickPractice:true
  })]};
}
