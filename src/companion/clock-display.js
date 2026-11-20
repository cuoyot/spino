// Transform animations run on the compositor. The accessible text is still
// sampled from the authoritative elapsed time, never incremented by callbacks.
export function updateClockDisplay(element, text, elapsedMs, running) {
  if (!element) return;
  if (!Number.isFinite(elapsedMs) || !element.animate) {
    if (element.textContent !== text) element.textContent = text;
    return;
  }
  let readable = element.querySelector('.clock-readable');
  let overlay = element.querySelector('.clock-digits');
  if (!readable || overlay?.children.length !== text.length) {
    element.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    element.textContent = '';
    element.classList.add('clock-display');
    readable = document.createElement('span'); readable.className = 'clock-readable';
    overlay = document.createElement('span'); overlay.className = 'clock-digits'; overlay.setAttribute('aria-hidden','true');
    for (const symbol of text) {
      const digit = document.createElement('span');
      if (symbol === ':') digit.dataset.symbol = ':';
      else { const track = document.createElement('span'); track.className='clock-track'; digit.append(track); }
      overlay.append(digit);
    }
    element.append(readable, overlay);
  }
  if (readable.textContent !== text) readable.textContent = text;
  // Animation currentTime uses the last rendered frame's timeline time. After
  // a long task it is stale, so seeking it to fresh elapsed time counts the
  // blocked interval twice on the next frame. Anchor to the live monotonic
  // clock instead; all digits share the same origin across frame delays.
  const startTime = performance.now() - Math.max(0, elapsedMs);
  const colon = text.indexOf(':');
  for (let i=0; i<text.length; i++) {
    const track = overlay.children[i].firstElementChild;
    if (!track) continue;
    const seconds = i === colon+1 ? 10 : i === colon+2 ? 1 : 60 * 10 ** (colon-i-1);
    const count = i === colon+1 ? 6 : 10, duration = seconds * count * 1000;
    let animation = track.getAnimations()[0];
    if (!animation) {
      track.dataset.track = Array.from({length:count+1}, (_,n)=>n%count).join('\n');
      animation = track.animate([{transform:'translateY(0)'},{transform:`translateY(-${count}em)`}], {duration,iterations:Infinity,easing:`steps(${count}, end)`});
    }
    if (running) {
      if (animation.startTime == null || animation.playState !== 'running' || Math.abs(animation.startTime - startTime) > 150) animation.startTime = startTime;
    } else {
      animation.pause();
      animation.currentTime = Math.max(0, elapsedMs);
    }
  }
}
