import {localDate,weekOf,addDays} from './model.js';
import {ui,getAppLanguage} from './locale.js';

export function progressMetrics(data,today=localDate()) {
  const current=weekOf(today), totals=new Map(),goal=data.preferences.weeklyMinutes;
  for(const session of data.sessions) {
    if(session.date>today||!(session.elapsedMs>0))continue;
    const week=weekOf(session.date);
    totals.set(week,(totals.get(week)||0)+session.elapsedMs/60000);
  }
  // An unfinished current week does not break a streak earned through last week.
  const streak=predicate=>{
    let cursor=predicate(totals.get(current)||0)?current:addDays(current,-7),count=0;
    while(predicate(totals.get(cursor)||0)){count++;cursor=addDays(cursor,-7);}
    return count;
  };
  return {goal,practiceStreak:streak(n=>n>0),goalStreak:goal>0?streak(n=>n>=goal):null,
    weeks:Array.from({length:4},(_,i)=>{const start=addDays(current,(i-3)*7),minutes=Math.round(totals.get(start)||0);return {start,minutes,current:start===current,percent:goal>0?Math.min(100,Math.round(minutes/goal*100)):0};})};
}

export function progressMetricsMarkup(data,{includeWeeks=true}={}) {
  const metrics=progressMetrics(data),date=d=>new Intl.DateTimeFormat(getAppLanguage(),{day:'numeric',month:'short'}).format(new Date(d+'T12:00:00'));
  return `<section class="cp-card cp-consistency"><h2>${ui('Keep your rhythm','Mantén tu ritmo')}</h2><div class="cp-streaks"><div><strong>${metrics.practiceStreak}</strong><span>${ui('weeks practising','semanas practicando')}</span></div><div><strong>${metrics.goalStreak??'—'}</strong><span>${ui('weeks meeting your goal','semanas cumpliendo tu objetivo')}</span></div></div><p class="muted">${ui('Consecutive weeks. This week stays open until Sunday.','Semanas consecutivas. Esta semana sigue abierta hasta el domingo.')}</p></section>${includeWeeks?`<section class="cp-card cp-four-weeks"><h2>${ui('Last 4 weeks','Últimas 4 semanas')}</h2><p class="muted">${metrics.goal>0?ui(`Compared with your current goal: ${metrics.goal} min/week.`,`Comparadas con tu objetivo actual: ${metrics.goal} min/semana.`):ui('Set a weekly goal in Profile whenever you like.','Puedes fijar un objetivo semanal en Perfil cuando quieras.')}</p><div class="cp-week-comparison">${metrics.weeks.map(w=>`<div class="cp-week-result"><div><span>${w.current?ui('This week','Esta semana'):date(w.start)+' – '+date(addDays(w.start,6))}</span><strong>${w.minutes}${metrics.goal>0?' / '+metrics.goal:''} min</strong></div><div class="cp-progress" ${metrics.goal>0?`role="progressbar" aria-label="${date(w.start)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${w.percent}" aria-valuetext="${w.minutes} / ${metrics.goal} min"`:''}><span style="width:${w.percent}%"></span></div></div>`).join('')}</div></section>`:''}`;
}
