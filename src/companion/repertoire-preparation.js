import { block, copy } from './model.js';
import { practiceMinutes, resizePractice } from './practice-duration.js';

export const isRepertoirePreparation = draft => !draft.routinePolicy && draft.blocks.length > 0
  && draft.blocks.every(b => b.type === 'repertoire' && (b.workId || draft.blocks.length === 1))
  && new Set(draft.blocks.map(b => b.workId)).size === draft.blocks.length;

// Keep the existing activity model and identities behind the multiple-piece picker.
export function togglePreparationPiece(source, work) {
  const next = copy(source), total = practiceMinutes(next.blocks);
  const existing = next.blocks.find(b => b.workId === work.id);
  if (existing) {
    next.blocks = next.blocks.filter(b => b.workId !== work.id);
    if (!next.blocks.length) next.blocks = [{...existing, workId: '', target: null, passage: ''}];
  } else {
    const empty = next.blocks.find(b => !b.workId);
    if (empty) Object.assign(empty, {workId: work.id, target: work.target || null, passage: empty.passage || work.passage || ''});
    else {
      if (next.blocks.length >= Math.min(20, total)) return null;
      next.blocks.push(block('repertoire', {workId: work.id, target: work.target || null, passage: work.passage || '', bpm: work.bpm || 60}));
    }
  }
  next.blocks = resizePractice(next.blocks.map(b => ({...b, minutes: 1})), total);
  return next;
}
