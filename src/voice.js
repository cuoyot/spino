// Sung note names: a small formant synthesizer that sings "Do", "Re", "C", "ハ"… at the exact pitch of the note.
// A sawtooth "voice" at f0 runs through three resonant formant filters that shape the vowel; consonants are
// approximated with short noise bursts, murmurs and formant glides.
import { ac } from './audio.js';

// Formant frequencies (Hz) and relative amplitudes per vowel
const VOWELS = {
  a: { F: [800, 1250, 2600], A: [1, 0.7, 0.35] },
  e: { F: [450, 1900, 2600], A: [1, 0.5, 0.35] },
  i: { F: [300, 2300, 3000], A: [1, 0.4, 0.3] },
  o: { F: [480, 850, 2500], A: [1, 0.6, 0.15] },
  u: { F: [330, 800, 2400], A: [1, 0.3, 0.1] },
};

// Consonants as short segments. voice/noise are source levels; nf/nq shape the noise band.
const CONSONANTS = {
  d: [{ dur: 0.035, voice: 0.25, F: [250, 1700, 2600], A: [1, 0.2, 0.1] }, { dur: 0.012, voice: 0.2, noise: 0.5, nf: 4000, nq: 1.2, F: [300, 1700, 2600] }],
  t: [{ dur: 0.045 }, { dur: 0.02, noise: 0.9, nf: 4500, nq: 1 }, { dur: 0.02, voice: 0.2, noise: 0.3, nf: 2000, nq: 0.8 }],
  b: [{ dur: 0.035, voice: 0.25, F: [250, 800, 2200], A: [1, 0.2, 0.1] }, { dur: 0.01, voice: 0.2, noise: 0.4, nf: 1500, nq: 0.8 }],
  g: [{ dur: 0.035, voice: 0.25, F: [250, 2100, 2500], A: [1, 0.2, 0.1] }, { dur: 0.015, voice: 0.2, noise: 0.5, nf: 2500, nq: 1.5 }],
  r: [{ dur: 0.03, voice: 0.35, F: [350, 1400, 1700], A: [1, 0.4, 0.2] }],
  m: [{ dur: 0.08, voice: 0.55, F: [260, 1000, 2300], A: [1, 0.08, 0.04] }],
  n: [{ dur: 0.075, voice: 0.55, F: [260, 1600, 2500], A: [1, 0.08, 0.04] }],
  l: [{ dur: 0.06, voice: 0.7, F: [360, 1100, 2700], A: [1, 0.35, 0.15] }],
  f: [{ dur: 0.09, noise: 0.35, nf: 4000, nq: 0.4 }],
  s: [{ dur: 0.11, noise: 0.8, nf: 6500, nq: 1.8 }],
  sh: [{ dur: 0.08, voice: 0.15, noise: 0.7, nf: 3000, nq: 1.4 }],
  h: [{ dur: 0.07, noise: 0.35, nf: 1600, nq: 0.6 }],
  ts: [{ dur: 0.03 }, { dur: 0.07, noise: 0.8, nf: 6000, nq: 1.5 }],
};

// How each naming system pronounces c d e f g a b (as phoneme lists)
const SYLLABLES = {
  english: [['s', 'i'], ['d', 'i'], ['i'], ['e', 'f'], ['d', 'sh', 'i'], ['e', 'i'], ['b', 'i']],
  solfege: [['d', 'o'], ['r', 'e'], ['m', 'i'], ['f', 'a'], ['s', 'o', 'l'], ['l', 'a'], ['s', 'i']],
  french: [['d', 'o'], ['r', 'e'], ['m', 'i'], ['f', 'a'], ['s', 'o', 'l'], ['l', 'a'], ['s', 'i']],
  german: [['ts', 'e'], ['d', 'e'], ['e'], ['e', 'f'], ['g', 'e'], ['a'], ['h', 'a']],
  russian: [['d', 'o'], ['r', 'e'], ['m', 'i'], ['f', 'a'], ['s', 'o', 'l'], ['l', 'a'], ['s', 'i']],
  japanese: [['h', 'a'], ['n', 'i'], ['h', 'o'], ['h', 'e'], ['t', 'o'], ['i'], ['r', 'o']],
};
const LETTER_INDEX = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

export function syllableFor(naming, letter, acc) {
  if (naming === 'german' && letter === 'b' && acc === 'b') return ['b', 'e']; // German "B" = B♭
  return (SYLLABLES[naming] || SYLLABLES.english)[LETTER_INDEX[letter]];
}

// Expand phonemes into timed segments; vowels share whatever time the consonants leave.
function segments(phonemes, total) {
  const vowelIdx = phonemes.map((p, i) => (VOWELS[p] ? i : -1)).filter((i) => i >= 0);
  const fixed = phonemes.reduce((s, p, i) => s + (VOWELS[p] ? 0 : CONSONANTS[p].reduce((a, c) => a + c.dur, 0) * (i === phonemes.length - 1 ? 1.5 : 1)), 0);
  const vowelDur = Math.max(0.12, total - fixed) / Math.max(1, vowelIdx.length);
  const out = [];
  phonemes.forEach((p, i) => {
    if (VOWELS[p]) out.push({ dur: vowelDur, voice: 1, ...VOWELS[p] });
    else {
      // a final consonant ("Sol", "ef") is held a little longer
      const k = i === phonemes.length - 1 ? 1.5 : 1;
      CONSONANTS[p].forEach((c) => out.push({ ...c, dur: c.dur * k }));
    }
  });
  // consonant segments without their own formants borrow the neighbouring vowel's, for smooth glides
  out.forEach((s, i) => {
    if (!s.F) {
      const v = out.slice(i).find((x) => x.F && x.voice === 1) || out.find((x) => x.F);
      s.F = v ? v.F : VOWELS.a.F;
      s.A = s.A || (v ? v.A : VOWELS.a.A);
    }
    s.A = s.A || [1, 0.5, 0.2];
  });
  return out;
}

let noiseBuffer = null;
function noise(a) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== a.sampleRate) {
    noiseBuffer = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = a.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  return src;
}

/**
 * Sing a syllable at a MIDI pitch. `a` may be an OfflineAudioContext (used for tests).
 */
export function sing(midi, phonemes, { when = 0, duration = 0.7, gain = 0.6, a = ac() } = {}) {
  const t0 = when || a.currentTime + 0.01;
  const f0 = 440 * Math.pow(2, (midi - 69) / 12);
  const segs = segments(phonemes, duration);
  const end = t0 + segs.reduce((s, x) => s + x.dur, 0);
  const smooth = 0.012; // formant glide time constant

  // sources
  const osc = a.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = f0;
  const lfo = a.createOscillator();
  const lfoDepth = a.createGain();
  lfo.frequency.value = 5.5;
  lfoDepth.gain.setValueAtTime(0, t0);
  lfoDepth.gain.linearRampToValueAtTime(f0 * 0.006, t0 + 0.25);
  lfo.connect(lfoDepth).connect(osc.frequency);
  const nz = noise(a);

  const voiceGain = a.createGain();
  const noiseGain = a.createGain();
  const noiseBand = a.createBiquadFilter();
  noiseBand.type = 'bandpass';
  osc.connect(voiceGain);
  nz.connect(noiseBand).connect(noiseGain);

  // formant bank
  const master = a.createGain();
  const Q = [5, 10, 14];
  const formants = [0, 1, 2].map((k) => {
    const f = a.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = Q[k];
    const g = a.createGain();
    voiceGain.connect(f).connect(g).connect(master);
    return { f, g };
  });
  noiseGain.connect(master);

  // timeline
  let t = t0;
  segs.forEach((s, i) => {
    const set = (param, v) => (i === 0 ? param.setValueAtTime(v, t) : param.setTargetAtTime(v, t, smooth));
    set(voiceGain.gain, s.voice || 0);
    set(noiseGain.gain, s.noise || 0);
    if (s.nf) {
      set(noiseBand.frequency, s.nf);
      set(noiseBand.Q, s.nq || 1);
    }
    formants.forEach(({ f, g }, k) => {
      set(f.frequency, s.F[k]);
      set(g.gain, s.A[k] * 4); // bandpass filters pass little energy; boost to a usable level
    });
    t += s.dur;
  });

  // envelope
  const env = a.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  env.gain.setValueAtTime(gain, Math.max(t0 + 0.02, end - 0.09));
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  // even out loudness: vowels and pitches line up with the formants very differently
  const comp = a.createDynamicsCompressor();
  comp.threshold.value = -26;
  comp.knee.value = 10;
  comp.ratio.value = 6;
  comp.attack.value = 0.005;
  comp.release.value = 0.1;
  master.connect(comp).connect(env).connect(a.destination);

  [osc, lfo, nz].forEach((n) => {
    n.start(t0);
    n.stop(end + 0.05);
  });
  return end;
}
