import {formatProgressDuration} from './progress-duration.js';
import {ui} from './locale.js';

// Only attributed saved blocks count; session tags do not assign time to a piece.
export function workPracticeTotals(sessions) {
  const totals = new Map();
  for (const session of sessions || []) {
    for (const result of session.results || []) {
      const id = result.block?.workId;
      if (id) totals.set(id, (totals.get(id) || 0) + Math.max(0, Number(result.elapsedMs) || 0));
    }
  }
  return totals;
}

export function workPracticeLabel(ms = 0) {
  return `${ui('Total practiced', 'Total practicado')}: ${formatProgressDuration(ms)}`;
}
