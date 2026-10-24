// Normal playback always preserves the attack, even after a delayed scheduler tick.
// Only a deliberate seek/resume starts inside a note that was already sounding.
export function midiVoiceTiming(note, origin, now, resumePosition = null) {
  const start = note.time / 1000;
  const offset = resumePosition === null ? 0 : Math.max(0, resumePosition / 1000 - start);
  if (offset >= note.duration) return null;
  const when = Math.max(now, origin + start);
  return {when, offset, off: when + Math.max(.01, note.duration - offset)};
}
