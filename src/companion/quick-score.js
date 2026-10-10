import {ui} from './locale.js';
export const emptyQuickScore=()=>({version:1,correct:0,wrong:0,bonus:0,points:0});
export function addQuickAnswer(score,correct,ms=0) {
  const next={...(score||emptyQuickScore())};
  if(correct){next.correct++;next.bonus+=Math.max(0,100-Math.floor(Math.max(0,ms)/30));}else next.wrong++;
  next.points=Math.max(0,next.correct*100+next.bonus-next.wrong*50);return next;
}
export function validQuickScore(s) {
  return !!s&&s.version===1&&['correct','wrong','bonus','points'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0)&&s.bonus<=s.correct*100&&s.points===Math.max(0,s.correct*100+s.bonus-s.wrong*50);
}
export function quickRecords(sessions) {
  return sessions.filter(s=>s.quickScore?.correct>0).sort((a,b)=>b.quickScore.points-a.quickScore.points||b.date.localeCompare(a.date)).slice(0,5);
}
export function quickRecordsMarkup(sessions) {
  const records=quickRecords(sessions);
  return `<section class="cp-card cp-quick-records"><h2>${ui('Quick practice records','Récords de práctica rápida')}</h2>${records.length?`<ol>${records.map(s=>`<li><strong>${s.quickScore.points} ${ui('points','puntos')}</strong> · ${s.date} · ${ui('Level','Nivel')} ${s.blocks[0].figures}</li>`).join('')}</ol>`:`<p class="muted">${ui('Finish a quick practice to set your first record.','Termina una práctica rápida para registrar tu primer récord.')}</p>`}<p class="muted">${ui('100 per correct note + up to 100 for speed; −50 per error. Scores accumulate throughout the practice.','100 por acierto + hasta 100 por rapidez; −50 por error. Los puntos se acumulan durante la práctica.')}</p></section>`;
}

const trophy='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0zM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 14v5m-4 2h8m-6-2h4"/></svg>';
export function quickHudMarkup(points,best) {
  return `<div class="quick-game-points"><small>${ui('SCORE','PUNTOS')}</small><strong id="practice-quick-score">${points}</strong></div><div class="quick-game-best">${trophy}<span><small>${ui('BEST','RÉCORD')}</small><b data-quick-best>${best||'—'}</b></span></div><span class="quick-game-meter" aria-hidden="true"><i style="width:${best?Math.min(100,points/best*100):0}%"></i></span><span class="quick-record-banner" role="status">${ui('New record!','¡Nuevo récord!')}</span>`;
}
export function quickResultMarkup(saved,previousBest) {
  const score=saved.quickScore,record=score.points>previousBest&&score.correct>0,first=previousBest===0;
  const accuracy=score.correct+score.wrong?Math.round(score.correct/(score.correct+score.wrong)*100):0;
  const label=record?(first?ui('First score!','¡Primera puntuación!'):ui('New personal best!','¡Nuevo récord personal!')):ui('Practice complete','Práctica completada');
  return `<div class="cp-quick-result${record?' is-new-record':''}"><div class="quick-result-hero"><div class="quick-result-medal">${trophy}</div><p class="quick-result-label">${label}</p><strong class="quick-result-score">${score.points}</strong><span class="quick-result-unit">${ui('POINTS','PUNTOS')}</span>${record?`<div class="quick-confetti" aria-hidden="true">${Array.from({length:12},(_,i)=>`<i style="--n:${i}"></i>`).join('')}</div>`:''}</div><div class="quick-result-comparison">${previousBest?`${ui('Previous best','Récord anterior')} <b>${previousBest}</b>${record?`<span class="quick-result-improvement">+${score.points-previousBest}</span>`:''}`:ui('Your next practice is a chance to beat this score.','Tu próxima práctica es una oportunidad para superar esta puntuación.')}</div><div class="quick-result-stats"><div><b>${score.correct}</b><small>${ui('Correct','Aciertos')}</small></div><div><b>${accuracy}%</b><small>${ui('Accuracy','Precisión')}</small></div><div><b>+${score.bonus}</b><small>${ui('Speed bonus','Bonus de rapidez')}</small></div></div><p class="quick-result-errors">${score.wrong} ${ui('errors','errores')} · −${score.wrong*50} ${ui('points','puntos')}</p><div class="quick-result-actions"><button type="button" class="primary" data-action="quick-practice">▶ ${ui('Play again','Otra práctica')}</button><button type="button" class="quiet" data-action="close-dialog">${ui('Done','Hecho')}</button></div><details class="quick-result-rules"><summary>${ui('How points work','Cómo se puntúa')}</summary><p>${ui('100 per correct note, up to 100 extra for speed, −50 per error. Points accumulate throughout the practice.','100 por acierto, hasta 100 extra por rapidez y −50 por error. Los puntos se acumulan durante la práctica.')}</p></details></div>`;
}
