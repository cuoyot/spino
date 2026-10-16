import {localDate,weekOf,addDays} from './model.js';
import {getAppLanguage,ui} from './locale.js';

export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function activityIcon(kind) {
  const path=kind==='video'?'<rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 6-4v12l-6-4z"/>':kind==='audio'?'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3m-3 0h6"/>':'<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}
export function recordingDate(record) {
  const date=new Date(record.createdAt);
  return Number.isFinite(date.getTime())?localDate(date):'';
}
export function filterRecordings(records,{workId='',type='',from='',to=''}={}) {
  return records.filter(r=>{const date=recordingDate(r);return (!workId||r.workId===workId)&&(!type||r.kind===type)&&(!from||date>=from)&&(!to||(date&&date<=to));});
}
export function shiftMonth(month,delta) {
  const d=new Date(month.slice(0,7)+'-01T12:00:00');d.setMonth(d.getMonth()+delta);return localDate(d);
}
export function monthWeeks(month) {
  const first=month.slice(0,7)+'-01',next=shiftMonth(first,1),weeks=[];
  for(let start=weekOf(first);start<next;start=addDays(start,7))weeks.push(Array.from({length:7},(_,i)=>addDays(start,i)));
  return weeks;
}
export function monthCalendarMarkup(month,{prefix,day,week=null,mode='month',toggleAction=''}) {
  const weekly=mode==='week',start=weekOf(month),groups=weekly?[Array.from({length:7},(_,i)=>addDays(start,i))]:monthWeeks(month);
  const label=weekly?new Intl.DateTimeFormat(getAppLanguage(),{day:'numeric',month:'short',year:'numeric'}).formatRange(new Date(start+'T12:00:00'),new Date(addDays(start,6)+'T12:00:00')):new Intl.DateTimeFormat(getAppLanguage(),{month:'long',year:'numeric'}).format(new Date(month.slice(0,7)+'-01T12:00:00'));
  const monthFormat=new Intl.DateTimeFormat(getAppLanguage(),{month:'long',year:'numeric'});
  const monthLabel=weekly?monthFormat.formatRange(new Date(start+'T12:00:00'),new Date(addDays(start,6)+'T12:00:00')).replace(/\s*–\s*/g,' – '):monthFormat.format(new Date(month.slice(0,7)+'-01T12:00:00'));
  const heading=toggleAction?`<button type="button" class="cp-media-calendar-title" data-action="${toggleAction}" aria-expanded="${!weekly}" aria-label="${escapeHTML(monthLabel)}. ${weekly?ui('Show month','Mostrar mes'):ui('Show week','Mostrar semana')}"><span>${escapeHTML(monthLabel)}</span></button>`:`<h3 aria-live="polite">${escapeHTML(label)}</h3>`;
  const weekdays=Array.from({length:7},(_,i)=>new Intl.DateTimeFormat(getAppLanguage(),{weekday:'short'}).format(new Date(addDays('2026-10-12',i)+'T12:00:00')));
  return `<section class="cp-activity-calendar ${week?'has-weeks':''}" aria-label="${escapeHTML(label)}"><header><button type="button" data-action="${prefix}-month" data-id="-1" aria-label="${weekly?ui('Previous week','Semana anterior'):ui('Previous month','Mes anterior')}">‹</button>${heading}<button type="button" data-action="${prefix}-month" data-id="1" aria-label="${weekly?ui('Next week','Semana siguiente'):ui('Next month','Mes siguiente')}">›</button></header><div class="cp-activity-weekdays">${weekdays.map(d=>`<span>${escapeHTML(d)}</span>`).join('')}${week?`<span aria-label="${ui('Weekly streak','Racha semanal')}">♫</span>`:''}</div>${groups.map(days=>`<div class="cp-activity-week">${days.map(date=>day(date,weekly||date.slice(0,7)===month.slice(0,7))).join('')}${week?week(days):''}</div>`).join('')}</section>`;
}
