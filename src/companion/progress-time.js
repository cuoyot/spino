import {localDate, weekOf, addDays, daysUntil, ACTIVITIES} from './model.js';
import {ui, getAppLanguage} from './locale.js';
import {formatProgressDuration as durationLabel} from './progress-duration.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel = (date, options={day:'numeric',month:'short'}) => new Intl.DateTimeFormat(getAppLanguage(),options).format(new Date(date+'T12:00:00'));
const dateRange = (start,end) => `${dateLabel(start,{day:'numeric',month:'short',year:'numeric'})} – ${dateLabel(end,{day:'numeric',month:'short',year:'numeric'})}`;
export const TIME_RANGES = ['7d','1m','3m','6m','ytd','1y'];

// Calendar months are clamped before shifting so month-end dates never overflow.
function monthsBefore(date, count) {
  const d=new Date(date+'T12:00:00'),day=d.getDate();
  d.setDate(1); d.setMonth(d.getMonth()-count);
  const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  d.setDate(Math.min(day,last));return localDate(d);
}
export function practiceTime(data,{range='3m',type='',workId='',today=localDate(),overview=false}={}) {
  if(!TIME_RANGES.includes(range))range='3m';
  const start=overview?addDays(weekOf(today),-77):range==='7d'?addDays(today,-6):range==='ytd'?today.slice(0,4)+'-01-01':addDays(monthsBefore(today,{'1m':1,'3m':3,'6m':6,'1y':12}[range]),1);
  const length=daysUntil(today,start)+1,previousStart=addDays(start,-length),previousEnd=addDays(start,-1);
  const daily=!overview&&['7d','1m'].includes(range),buckets=[];
  for(let cursor=daily?start:weekOf(start);cursor<=today;cursor=addDays(cursor,daily?1:7)) {
    buckets.push({start:cursor<start?start:cursor,end:daily?cursor:[addDays(cursor,6),today].sort()[0],ms:0});
  }
  let totalMs=0,previousMs=0,weekMs=0;
  const sessions=[],days=new Set(),week=weekOf(today),byDate=new Map();
  for(const session of data.sessions) {
    if(session.date>today||!(session.elapsedMs>0))continue;
    // Only explicitly timed blocks may be assigned to a type or a piece.
    // Session-wide work tags cannot divide a mixed practice's time reliably.
    const ms=!type&&!workId?session.elapsedMs:(session.results||[]).reduce((sum,r)=>sum+((!type||r.block.type===type)&&(!workId||r.block.workId===workId)?Math.max(0,r.elapsedMs):0),0);
    if(!(ms>0))continue;
    if(session.date>=week)weekMs+=ms;
    if(session.date>=previousStart&&session.date<=previousEnd)previousMs+=ms;
    if(session.date<start)continue;
    totalMs+=ms;sessions.push(session);days.add(session.date);byDate.set(session.date,(byDate.get(session.date)||0)+ms);
  }
  for(const bucket of buckets)for(let date=bucket.start;date<=bucket.end;date=addDays(date,1))bucket.ms+=byDate.get(date)||0;
  return {start,end:today,previousStart,previousEnd,totalMs,previousMs,weekMs,sessions,days:days.size,buckets,daily};
}

export function timeChartMarkup(metrics) {
  const {buckets}=metrics,w=420,h=230,left=10,top=18,bottom=42;
  const peak=Math.max(1,...buckets.map(b=>b.ms/60000)),step=peak<=30?10:peak<=90?30:peak<=180?60:peak<=360?120:Math.ceil(peak/180)*60,max=Math.ceil(peak/step)*step;
  const tickLabels=[0,.5,1].map(f=>durationLabel(max*f*60000));
  const right=Math.max(58,...tickLabels.map(label=>label.length*8+16)),plotW=w-left-right,plotH=h-top-bottom;
  const x=i=>left+i*plotW/Math.max(1,buckets.length-1),y=ms=>top+plotH*(1-ms/60000/max);
  const path=buckets.map((b,i)=>`${i?'L':'M'}${x(i).toFixed(2)},${y(b.ms).toFixed(2)}`).join(' '),last=buckets.length-1;
  const ticks=[0,.5,1].map((f,i)=>{const py=top+plotH*(1-f);return `<line x1="${left}" y1="${py}" x2="${w-right}" y2="${py}" class="cp-time-grid"/><text x="${w-right+12}" y="${py+4}">${tickLabels[i]}</text>`;}).join('');
  const labels=[...new Set([0,Math.round(last/3),Math.round(last*2/3),last])].map(i=>`<text x="${x(i)}" y="${h-12}" text-anchor="${i===0?'start':i===last?'end':'middle'}">${esc(dateLabel(buckets[i].start,metrics.daily?{day:'numeric',month:'short'}:{month:'short',day:'numeric'}))}</text>`).join('');
  return `<figure class="cp-time-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(ui('Recorded practice time','Tiempo de práctica registrado'))}"><title>${esc(dateRange(metrics.start,metrics.end))}</title><defs><linearGradient id="practice-time-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="currentColor" stop-opacity=".32"/><stop offset="100%" stop-color="currentColor" stop-opacity=".02"/></linearGradient></defs>${ticks}<path d="${path} L${x(last)},${top+plotH} L${left},${top+plotH} Z" fill="url(#practice-time-fill)"/><path d="${path}" class="cp-time-line"/>${buckets.map((b,i)=>`<circle cx="${x(i)}" cy="${y(b.ms)}" r="${i===last?6:3.5}" class="cp-time-point"><title>${esc(dateRange(b.start,b.end))}: ${durationLabel(b.ms)}</title></circle>`).join('')}<circle cx="${x(last)}" cy="${y(buckets[last].ms)}" r="12" fill="currentColor" opacity=".16"/>${labels}</svg><figcaption class="muted">${metrics.daily?ui('Daily practice','Práctica diaria'):ui('Weekly practice · current week in progress','Práctica semanal · semana actual en curso')}</figcaption></figure>${!metrics.totalMs?`<p class="cp-time-empty muted" role="status">${ui('No saved practice in this period.','No hay práctica guardada en este periodo.')}</p>`:''}`;
}

export function practiceTimeOverviewMarkup(data) {
  const m=practiceTime(data,{overview:true});
  return `<section class="cp-card cp-time-overview"><h2>${ui('This week','Esta semana')}</h2><div class="cp-time-stats"><div><strong>${durationLabel(m.weekMs)}</strong><span>${ui('Practice time','Tiempo de práctica')}</span></div>${data.preferences.weeklyMinutes>0?`<div><strong>${durationLabel(data.preferences.weeklyMinutes*60000)}</strong><span>${ui('Weekly goal','Objetivo semanal')}</span></div>`:''}</div><p class="cp-time-caption muted">${ui('Past 12 weeks','Últimas 12 semanas')}</p>${timeChartMarkup(m)}<button type="button" class="cp-time-more" data-action="progress-time">${ui('More details','Más detalles')} <span aria-hidden="true">→</span></button></section>`;
}

export function practiceTimeDetailMarkup(data,filters={}) {
  const m=practiceTime(data,filters),type=filters.type||'',workId=filters.workId||'',range=filters.range||'3m';
  const recorded=new Set(data.sessions.flatMap(s=>(s.results||[]).map(r=>r.block.workId).filter(Boolean)));
  const works=new Map(data.works.filter(w=>!w.trashedAt||recorded.has(w.id)).map(w=>[w.id,w.title]));
  for(const id of recorded)if(!works.has(id))works.set(id,ui('Unavailable piece','Obra no disponible'));
  const options=(entries,value)=>entries.map(([id,label])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(label)}</option>`).join('');
  const percentage=m.previousMs>0?Math.round((m.totalMs-m.previousMs)/m.previousMs*100):null;
  const rangeLabels=[ui('7D','7D'),ui('1M','1M'),ui('3M','3M'),ui('6M','6M'),ui('YTD','Año'),ui('1Y','1A')];
  const rangeNames=[ui('7 days','7 días'),ui('1 month','1 mes'),ui('3 months','3 meses'),ui('6 months','6 meses'),ui('Year to date','Año actual'),ui('1 year','1 año')];
  return `<div class="cp-time-filters"><label>${ui('Practice type','Tipo de práctica')}<select id="progress-time-type" data-time-filter="type">${options([['',ui('All practice','Toda la práctica')],...Object.entries(ACTIVITIES).filter(([id])=>id!=='theory'||data.sessions.some(s=>s.results?.some(r=>r.block.type===id)))],type)}</select></label><label>${ui('Repertoire piece','Pieza del repertorio')}<select id="progress-time-work" data-time-filter="workId">${options([['',ui('All pieces','Todas las piezas')],...works],workId)}</select></label></div><section class="cp-card cp-time-detail"><h2>${ui('Total practice time','Tiempo total de práctica')}</h2><div class="cp-time-total" aria-live="polite"><strong>${durationLabel(m.totalMs)}</strong><span class="muted">${esc(dateRange(m.start,m.end))}</span></div><p class="cp-time-comparison muted">${percentage===null?ui('No practice in the previous period','Sin práctica en el periodo anterior'):`${percentage>0?'+':''}${percentage}% ${ui('vs. previous period','frente al periodo anterior')}`}<span>${esc(dateRange(m.previousStart,m.previousEnd))}</span></p>${timeChartMarkup(m)}<nav class="cp-time-ranges" aria-label="${ui('Date range','Rango de fechas')}">${TIME_RANGES.map((id,i)=>`<button type="button" data-action="progress-time-range" data-id="${id}" aria-label="${rangeNames[i]}" aria-pressed="${id===range}">${rangeLabels[i]}</button>`).join('')}</nav><p class="cp-time-scope muted">${ui('Filters count only time recorded for matching blocks.','Los filtros cuentan solo el tiempo registrado en los bloques que coinciden.')}</p>${timeChartValues(m)}</section>`;
}
function timeChartValues(m) {
  return `<details class="cp-time-values"><summary>${ui('View chart values','Ver valores de la gráfica')}</summary><table><thead><tr><th>${ui('Period','Periodo')}</th><th>${ui('Practice time','Tiempo de práctica')}</th></tr></thead><tbody>${m.buckets.map(b=>`<tr><td>${esc(b.start===b.end?dateLabel(b.start):dateRange(b.start,b.end))}</td><td>${durationLabel(b.ms)}</td></tr>`).join('')}</tbody></table></details>`;
}
