// Paint second changes on the next frame, independent of save/checkpoint timers.
export function watchPracticeClock(read, update) {
  let frame, previous, stopped = false;
  function tick() {
    if (stopped) return;
    const current = read();
    if (current && (!previous || current.time !== previous.time || current.blockTime !== previous.blockTime || current.running !== previous.running)) update(current);
    previous = current;
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return () => { stopped = true; cancelAnimationFrame(frame); };
}
