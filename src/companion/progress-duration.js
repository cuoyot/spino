import {getAppLanguage} from './locale.js';

// Preserve Progress's whole-minute rounding while making longer totals easier to read.
export function formatProgressDuration(ms) {
  const minutes=Math.max(0,Math.round(ms/60000)),hours=Math.floor(minutes/60),rest=minutes%60;
  const number=value=>value.toLocaleString(getAppLanguage());
  const hourLabel=({de:'Std.',hu:'óra'})[getAppLanguage()]||'hr',minuteLabel=getAppLanguage()==='hu'?'perc':'min';
  return hours ? `${number(hours)} ${hourLabel}${rest ? ` ${number(rest)} ${minuteLabel}` : ''}` : `${number(minutes)} ${minuteLabel}`;
}
