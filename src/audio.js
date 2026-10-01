// Tiny Web Audio piano-ish synth and metronome click.
let ctx = null;

export function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function now() {
  return ac().currentTime;
}

export function playNote(midi, duration = 1.2, when = 0, gain = 0.25) {
  const a = ac();
  const t = Math.max(a.currentTime, Number.isFinite(when) ? when : 0);
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const out = a.createGain();
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(8000, f * 6);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  out.gain.exponentialRampToValueAtTime(gain * 0.4, t + 0.25);
  out.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([mul, type, g]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.value = f * mul;
    og.gain.value = g;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + duration + 0.05);
  });
  lp.connect(out).connect(a.destination);
}

// A note that sounds for as long as the key is held: returns { stop() } to release it.
export function holdNote(midi, gain = 0.25) {
  const a = ac();
  const t = a.currentTime;
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const out = a.createGain();
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(8000, f * 6);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(gain, t + 0.005);
  out.gain.exponentialRampToValueAtTime(gain * 0.45, t + 0.35); // decay to the sustain level
  out.gain.setTargetAtTime(gain * 0.25, t + 0.35, 2.5); // slow fade while held, like a real string
  const oscs = [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].map(([mul, type, g]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.value = f * mul;
    og.gain.value = g;
    o.connect(og).connect(lp);
    o.start(t);
    return o;
  });
  lp.connect(out).connect(a.destination);
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    const now = a.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now);
    out.gain.exponentialRampToValueAtTime(0.0001, now + 0.18); // release
    oscs.forEach((o) => o.stop(now + 0.2));
  };
  setTimeout(stop, 12000); // safety: never ring forever
  return { stop };
}

export function click(accent = false, when = 0) {
  const a = ac();
  // AudioContext can resume later than the visual clock after a device interruption.
  const t = Math.max(a.currentTime, Number.isFinite(when) ? when : 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.06);
  return { when: t, stop() { o.stop(); } };
}
