import {localDate,weekOf,addDays} from './model.js';
import {ui,getAppLanguage} from './locale.js';
import {progressMetrics} from './progress-metrics.js';
import {activityIcon,escapeHTML,filterRecordings,monthCalendarMarkup} from './activity-calendar.js';

export function progressHighlightsMarkup(data,records=[],today=localDate()) {
  const m=progressMetrics(data,today),takes=filterRecordings(records,{from:weekOf(today),to:today});
  const audios=takes.filter(r=>r.kind==='audio').length,videos=takes.filter(r=>r.kind==='video').length,midis=takes.filter(r=>r.kind==='midi').length;
  const days=Array.from({length:7},(_,i)=>addDays(weekOf(today),i));
  return `<div class="cp-progress-highlights"><button type="button" class="cp-card cp-rhythm-card" data-action="progress-streak"><span class="cp-highlight-heading">${ui('Keep your rhythm','Mantén tu ritmo')}<span aria-hidden="true">›</span></span><span class="cp-rhythm-emblem">${activityIcon('practice')}<strong>${m.practiceStreak}</strong></span><span class="cp-highlight-unit">${ui('weeks practising','semanas practicando')}</span><span class="cp-rhythm-days" aria-hidden="true">${days.map(d=>`<i class="${data.sessions.some(s=>s.date===d&&s.date<=today&&s.elapsedMs>0)?'is-active':''}"></i>`).join('')}</span><span class="cp-highlight-foot">${ui('Goal streak','Racha de objetivos')}: ${m.goalStreak??'—'} · ${ui('weeks','semanas')}</span></button><button type="button" class="cp-card cp-recordings-card" data-action="progress-media-week"><span class="cp-highlight-heading">${ui('Recordings','Grabaciones')}<span aria-hidden="true">›</span></span><span class="cp-recordings-symbol" aria-hidden="true">${activityIcon('audio')}${activityIcon('video')}</span><strong class="cp-recordings-total">${takes.length}</strong><span class="cp-highlight-unit">${ui('This week','Esta semana')}</span><span class="cp-highlight-foot cp-recordings-kinds"><span>${activityIcon('audio')}${audios} ${ui('Audio','Audio')}</span><span>${activityIcon('video')}${videos} ${ui('Video','Vídeo')}</span>${midis?`<span>${activityIcon('midi')}${midis} MIDI</span>`:''}</span></button></div>`;
}
export function streakDetailMarkup(data,month=localDate(),today=localDate()) {
  const metrics=progressMetrics(data,today),valid=data.sessions.filter(s=>s.date<=today&&s.elapsedMs>0),daily=new Map();
  valid.forEach(s=>daily.set(s.date,(daily.get(s.date)||0)+1));
  const current=weekOf(today),last=valid.some(s=>weekOf(s.date)===current)?current:addDays(current,-7),start=addDays(last,-7*(metrics.practiceStreak-1));
  const streakSessions=metrics.practiceStreak?valid.filter(s=>s.date>=start&&s.date<=addDays(last,6)).length:0;
  const dateLabel=d=>new Intl.DateTimeFormat(getAppLanguage(),{dateStyle:'full'}).format(new Date(d+'T12:00:00'));
  return `<div class="cp-streak-detail"><div class="cp-streak-summary"><div><span>${ui('Practice streak','Racha de práctica')}</span><strong>${metrics.practiceStreak} <small>${ui('weeks','semanas')}</small></strong></div><div><span>${ui('Streak sessions','Sesiones de la racha')}</span><strong>${streakSessions}</strong></div></div>${monthCalendarMarkup(month,{prefix:'streak',day:(date,inMonth)=>`<div class="cp-activity-day ${inMonth?'':'is-outside'} ${daily.has(date)?'is-practiced':''} ${date===today?'is-today':''}" aria-label="${escapeHTML(dateLabel(date))}: ${daily.get(date)||0} ${ui('sessions','sesiones')}"><span>${Number(date.slice(-2))}</span>${daily.has(date)?activityIcon('practice'):''}</div>`,week:days=>{
    const end=days[6],week=days[0],active=valid.some(s=>weekOf(s.date)===week),count=active?progressMetrics(data,end<today?end:today).practiceStreak:0;
    return `<div class="cp-streak-week ${active?'is-active':''}" aria-label="${ui('Weekly streak','Racha semanal')}: ${count}">${active?`<span aria-hidden="true">♫</span><b>${count}</b>`:week===current?'…':'·'}</div>`;
  }})}<p class="muted">${ui('One saved practice keeps a week in your rhythm. This week stays open until Sunday.','Una práctica guardada mantiene tu ritmo semanal. Esta semana sigue abierta hasta el domingo.')}</p><p class="muted">${ui('Goal streak','Racha de objetivos')}: <b>${metrics.goalStreak??'—'}</b> ${ui('weeks','semanas')}${metrics.goal>0?` · ${metrics.goal} ${ui('min/week','min/semana')}`:''}</p><div class="cp-actions"><button type="button" data-action="close-dialog">${ui('Close','Cerrar')}</button></div></div>`;
}
