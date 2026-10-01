export const DEFAULT_PRACTICE_MINUTES = 40;
export const practiceMinutes = blocks => blocks.reduce((sum, b) => sum + (Number(b.minutes) || 0), 0);

// Preserve block proportions, with whole minutes and at least one minute per block.
export function resizePractice(blocks, requested) {
  if (!blocks.length) return [];
  const total = Math.max(blocks.length, Math.min(600 * blocks.length, Math.round(Number(requested) || blocks.length)));
  const weights = blocks.map(b => Math.max(1, Number(b.minutes) || 1));
  const weight = weights.reduce((sum, value) => sum + value, 0);
  const ideal = weights.map(value => value * total / weight);
  const minutes = ideal.map(value => Math.min(600, Math.max(1, Math.floor(value))));
  let remaining = total - minutes.reduce((sum, value) => sum + value, 0);
  while (remaining) {
    const direction = Math.sign(remaining);
    let best = -1;
    for (let i = 0; i < minutes.length; i++) {
      if (direction > 0 ? minutes[i] >= 600 : minutes[i] <= 1) continue;
      if (best < 0 || direction * (ideal[i] - minutes[i]) > direction * (ideal[best] - minutes[best])) best = i;
    }
    minutes[best] += direction; remaining -= direction;
  }
  return blocks.map((b, i) => ({ ...b, minutes: minutes[i] }));
}
