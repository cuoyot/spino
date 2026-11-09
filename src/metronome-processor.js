// Beat synthesis stays on the audio rendering thread, independent of UI work.
class MetronomeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.config = null;
    this.voice = null;
    this.port.onmessage = ({data}) => {
      this.config = data;
      this.voice = null;
      this.pending = !!data;
      if (data) {
        this.period = sampleRate * 60 / data.bpm / (data.subdivision || 1);
        this.step = Math.max(data.firstStep || 0, Math.ceil((currentFrame - data.origin * sampleRate) / this.period));
      }
    };
  }
  process(inputs, outputs) {
    const out = outputs[0][0], c = this.config;
    if (!c) return true;
    if (this.pending) {
      if (c.startNow) { c.origin = currentFrame / sampleRate; this.step = 0; }
      else this.step = Math.max(c.firstStep || 0, Math.ceil((currentFrame - c.origin * sampleRate) / this.period));
      this.pending = false;
    }
    // A resumed audio device may advance its frame clock between render calls.
    // Keep the original grid and skip missed beats rather than emitting a burst.
    if (Math.round(c.origin * sampleRate + this.step * this.period) < currentFrame) this.step = Math.ceil((currentFrame - c.origin * sampleRate) / this.period);
    for (let i = 0; i < out.length; i++) {
      const frame = currentFrame + i;
      if (frame >= Math.round(c.origin * sampleRate + this.step * this.period)) {
        const step = this.step++, subdivision = c.subdivision || 1;
        const beat = Math.floor(step / subdivision), accent = ((beat % c.beats) + c.beats) % c.beats === 0 && step % subdivision === 0;
        if (c.enabled !== false || step < 0) this.voice = {frame, frequency: accent ? 1600 : 1000};
        this.port.postMessage({step, beat: ((beat % c.beats) + c.beats) % c.beats, accent, time: frame / sampleRate});
      }
      if (this.voice) {
        const age = (frame - this.voice.frame) / sampleRate;
        if (age < 0.05) out[i] = Math.sin(2 * Math.PI * this.voice.frequency * age) * 0.3 * (c.volume ?? 1) * Math.exp(-160 * age);
        else this.voice = null;
      }
    }
    return true;
  }
}
registerProcessor('spino-metronome', MetronomeProcessor);
