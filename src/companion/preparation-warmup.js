import { block, copy } from './model.js';
import { warmupPreferences, warmupBlockValues } from './warmups.js';
import { practiceMinutes, resizePractice } from './practice-duration.js';

export function preparationWarmup(source, data) {
  const prefs = warmupPreferences(data.preferences);
  return {kind: 'hanon', minutes: prefs.minutes, target: 'C-major', exercise: prefs.exercise, ...source.warmupBlock};
}

// Enabling or changing the optional warm-up reallocates the selected total.
export function resizePreparationWarmup(source, data, requestedTotal) {
  const next = copy(source), count = next.blocks.length;
  const total = Math.max(count, Math.round(Number(requestedTotal) || practiceMinutes(next.blocks)));
  const available = !next.routinePolicy && next.context !== 'mobile' && !next.blocks.some(b => b.type === 'warmup' || b.warmupKind);
  if (!available || total <= count) next.includeWarmup = false;
  let reserved = 0;
  if (next.includeWarmup) {
    next.warmupBlock = preparationWarmup(next, data);
    reserved = Math.min(30, total - count, Math.max(1, Math.round(next.warmupBlock.minutes)));
    next.warmupBlock.minutes = reserved;
  }
  next.blocks = resizePractice(next.blocks, total - reserved);
  return next;
}

// Materialize optional preparation into normal, independently timed blocks.
// Plans retain the configuration; existing block identities stay untouched.
export function practiceWithWarmup(source, data) {
  if (source.routinePolicy || source.context === 'mobile' || !source.includeWarmup || source.blocks.some(b => b.type === 'warmup' || b.warmupKind)) return source;
  const warm = preparationWarmup(source, data);
  const type = {free: 'free', hanon: 'warmup', reading: 'reading', scales: 'technique'}[warm.kind] || 'warmup';
  const values = type === 'warmup' ? warmupBlockValues(data, warm.exercise === 'rotate' ? null : warm.exercise) : {target: warm.target, hand: type === 'free' ? 'right' : 'both'};
  return {...copy(source), includeWarmup: false, blocks: [block(type, {...values, minutes: warm.minutes, warmupKind: warm.kind}), ...copy(source.blocks)]};
}
