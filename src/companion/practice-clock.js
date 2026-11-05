import { ui } from './locale.js';

export const practiceTotalMarkup = () => `<div class="practice-total-clock" aria-label="${ui('Total practice time', 'Tiempo total de práctica')}"><span>${ui('Total', 'Total')}</span><b data-session-clock>0:00</b></div>`;

export function updatePracticeTotal(container, info) {
  const clock = container.querySelector('.practice-total-clock [data-session-clock]');
  if (clock) clock.textContent = info.totalTime ?? info.time;
}

// Frames provide prompt updates; a timer also works when a WebView delays frames.
export function watchPracticeClock(read, update) {
  let frame, previous, stopped = false;
  function refresh() {
    if (stopped) return;
    const current = read();
    if (current && (!previous || current.time !== previous.time || current.totalTime !== previous.totalTime || current.blockTime !== previous.blockTime || current.running !== previous.running)) update(current);
    previous = current;
  }
  function tick() {
    if (stopped) return;
    refresh();
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  const timer = setInterval(refresh, 100);
  return () => { stopped = true; cancelAnimationFrame(frame); clearInterval(timer); };
}
