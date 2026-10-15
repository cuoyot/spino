import {ui} from './locale.js';
import {formatProgressDuration} from './progress-duration.js';
import {localDate,stageLabel,ACTIVITIES} from './model.js';
import {targetById} from './curriculum.js';
import {escapeHTML as esc} from './views.js';

export function techniqueComparisons(sessions,today=localDate()) {
 const groups=new Map();
 for(const s of [...sessions].filter(s=>s.date<=today).sort((a,b)=>a.date.localeCompare(b.date)||(a.startedAt||'').localeCompare(b.startedAt||'')))for(const r of s.results){
  const b=r.block,m=r.measurement;
  if(!['reading','technique'].includes(b.type)||!m||!(m.correct+m.wrong>0))continue;
  const settings=[b.type,b.target,b.hand,b.level??0,b.figures,r.context,m.source,m.timing||b.timing||'timed',m.bpm??b.bpm,m.guide??'unknown',b.input,b.passage||''];
  const key=JSON.stringify(settings);
  if(!groups.has(key))groups.set(key,{block:b,context:r.context,source:m.source,timing:settings[7],bpm:settings[8],guide:settings[9],samples:[]});
  groups.get(key).samples.push({date:s.date,correct:m.correct,wrong:m.wrong});
 }
 return [...groups.values()].map(g=>{
  const rate=items=>Math.round(100*items.reduce((n,r)=>n+r.correct,0)/items.reduce((n,r)=>n+r.correct+r.wrong,0));
  return {...g,before:g.samples.length>=6?rate(g.samples.slice(-6,-3)):null,after:g.samples.length>=6?rate(g.samples.slice(-3)):null};
 });
}
export function repertoireProgressMarkup(data){
 const works=data.works.filter(w=>!w.trashedAt);
 return `<p class="muted">${ui('Your current stage and next step for each piece. Stages are your own assessment; practice time does not measure mastery.','Tu etapa actual y el próximo paso de cada obra. La etapa es tu valoración; el tiempo no mide el dominio musical.')}</p>${works.map(w=>{
 const sessions=data.sessions.filter(s=>s.date<=localDate()&&(s.workIds?.includes(w.id)||s.results.some(r=>r.block.workId===w.id))).sort((a,b)=>b.date.localeCompare(a.date));
 const ms=sessions.reduce((n,s)=>n+s.results.filter(r=>r.block.workId===w.id).reduce((n,r)=>n+r.elapsedMs,0),0);
 return `<article class="cp-card"><h2>${esc(w.title)}</h2><p><span class="cp-tag">${esc(stageLabel(w.stage))}</span></p><p>${sessions.length} ${ui('practices','prácticas')} · ${formatProgressDuration(ms)} ${ui('recorded for this piece','registrados para esta obra')}</p><p class="muted">${sessions.length?ui('Last practice: ','Última práctica: ')+esc(sessions[0].date):ui('No saved practice yet.','Todavía no hay prácticas guardadas.')}</p><h3>${ui('Next step','Próximo paso')}</h3><p>${esc(w.passage||ui('Choose a passage and a concrete goal.','Elige un pasaje y un objetivo concreto.'))}</p><button data-action="work-detail" data-id="${esc(w.id)}">${ui('Review piece and history','Revisar obra e historial')}</button></article>`;
 }).join('')||`<p>${ui('Add a piece to start following its progress.','Añade una obra para empezar a seguir su evolución.')}</p>`}`;
}
export function techniqueProgressMarkup(data){
 const groups=techniqueComparisons(data.sessions);
 return `<p class="muted">${ui('Compare response accuracy at the same tempo, hand, level, rhythm, input and guide settings. This does not assess expression or overall musical mastery.','Compara aciertos con el mismo tempo, mano, nivel, ritmo, entrada y ayudas. No evalúa la expresión ni el dominio musical global.')}</p>${groups.map(g=>`<article class="cp-card"><h2>${ACTIVITIES[g.block.type]} · ${esc(targetById(g.block.target).label)}</h2><p>${esc(({right:ui('Right hand','Mano derecha'),left:ui('Left hand','Mano izquierda'),both:ui('Both hands','Ambas manos')})[g.block.hand]||g.block.hand)} · ${g.bpm} BPM · ${g.source==='midi'?'MIDI':ui('Screen','Pantalla')} · ${g.timing==='wait'?ui('No tempo','Sin tempo'):ui('With tempo','Con tempo')} · ${ui('Level','Nivel')} ${g.block.level??0} · ${ui('Rhythm','Ritmo')} ${esc(g.block.figures)} · ${ui('Guide','Ayuda')}: ${g.guide==='unknown'?ui('Not recorded','Sin registrar'):g.guide==='off'?ui('Off','Desactivada'):ui('On','Activada')}</p><p>${g.samples.length} ${ui('measured blocks','bloques medidos')}</p>${g.before===null?`<p>${ui('Need 6 comparable blocks to compare two groups of 3.','Se necesitan 6 bloques comparables para comparar dos grupos de 3.')}</p>`:`<p class="cp-learning-comparison"><strong>${g.before}% → ${g.after}%</strong></p><p>${ui('Response accuracy: previous 3 vs latest 3 blocks.','Aciertos: 3 bloques anteriores frente a los 3 últimos.')} ${g.after-g.before>0?'+':''}${g.after-g.before} ${ui('percentage points','puntos porcentuales')}.</p>`}<button data-action="target-history" data-id="${esc(g.block.target)}">${ui('Review history','Revisar historial')}</button></article>`).join('')||`<section class="cp-card"><h2>${ui('Build a comparable baseline','Crea una referencia comparable')}</h2><p>${ui('Repeat a short reading or technique exercise with the same settings. Automatically measured responses will appear here; manually recorded time remains in Activity.','Repite un ejercicio corto de lectura o técnica con los mismos ajustes. Los aciertos medidos aparecerán aquí; el tiempo registrado manualmente sigue en Actividad.')}</p></section>`}`;
}
