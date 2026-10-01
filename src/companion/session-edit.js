import { copy, emptyData, pause, validateData } from './model.js';
import { ui } from './locale.js';

const MAX_BLOCKS = 30;
const validMinutes = value => Number.isInteger(value) && value >= 1 && value <= 600;
const performed = runtime => runtime.elapsedMs > 0 || (runtime.measurement?.correct || 0) > 0 || (runtime.measurement?.wrong || 0) > 0;
const current = active => active.blocks[active.blockIndex];

function validate(active) {
  if (!active || !Array.isArray(active.blocks) || active.blocks.length > MAX_BLOCKS) throw new Error(ui('The session cannot contain more than 30 blocks.', 'La sesión no puede contener más de 30 bloques.'));
  if (new Set(active.blocks.map(b => b.id)).size !== active.blocks.length) throw new Error(ui('Each session block must have a unique ID.', 'Cada bloque de la sesión debe tener un identificador único.'));
  validateData({ ...emptyData(), active });
}

function runtimeOf(active) {
  return {
    blockId: current(active).id,
    context: active.context,
    elapsedMs: active.blockElapsedMs,
    measurement: copy(active.currentMeasurement ?? null),
    readerSnapshot: copy(active.readerSnapshot ?? null),
  };
}

function resultOf(block, runtime, extra = {}) {
  const snapshot = runtime.readerSnapshot;
  return {
    block: copy(block), context: runtime.context, elapsedMs: runtime.elapsedMs,
    measurement: copy(runtime.measurement ?? null),
    material: snapshot ? {
      generator: 'scale-pattern-v1', target: block.target,
      notes: copy(snapshot.line.notes), onsets: copy(snapshot.line.onsets),
    } : null,
    ...extra,
  };
}

function suspendCurrent(active) {
  const runtime = runtimeOf(active);
  active.blockRuntime = (active.blockRuntime || []).filter(item => item.blockId !== runtime.blockId);
  if (runtime.elapsedMs || runtime.measurement || runtime.readerSnapshot) active.blockRuntime.push(runtime);
}

function restore(active) {
  active.blockElapsedMs = 0;
  delete active.currentMeasurement;
  delete active.readerSnapshot;
  const runtime = active.blockRuntime?.find(item => item.blockId === current(active)?.id);
  if (runtime) {
    if (runtime.context !== active.context) throw new Error(ui('Preserve earlier block results before changing the session context.', 'Conserva los resultados anteriores antes de cambiar el contexto de la sesión.'));
    active.blockElapsedMs = runtime.elapsedMs;
    if (runtime.measurement) active.currentMeasurement = copy(runtime.measurement);
    if (runtime.readerSnapshot) active.readerSnapshot = copy(runtime.readerSnapshot);
    active.blockRuntime = active.blockRuntime.filter(item => item !== runtime);
  }
  if (!active.blockRuntime?.length) delete active.blockRuntime;
  return active;
}

// Call after finishing the previous block and clearing its mounted exercise.
export function restoreCurrentRuntime(input) {
  const active = restore(copy(input));
  validate(active);
  return active;
}

// Finalization or a context change must retain work from blocks postponed earlier.
// This does not mark unplayed blocks complete or change the session's total time.
export function settleSuspendedBlocks(input) {
  const active = copy(input);
  validate(active);
  for (const runtime of active.blockRuntime || []) {
    const block = active.blocks.find(item => item.id === runtime.blockId);
    if (!block) throw new Error(ui('A postponed block is missing from the session.', 'Falta un bloque aplazado en la sesión.'));
    if (performed(runtime)) active.results.push(resultOf(block, runtime, { partial: true }));
  }
  delete active.blockRuntime;
  return active;
}

// Only this session is edited. Source plans and routines are never mutated.
// Reordering across the current position parks its runtime under its stable ID.
export function editSession(input, action, options = {}) {
  validate(input);
  if (!current(input) && action.type !== 'add') throw new Error(ui('This session has no remaining blocks to edit.', 'Esta sesión no tiene bloques pendientes para editar.'));
  const active = copy(input), now = options.now ?? Date.now();
  pause(active, now);
  if (Object.hasOwn(options, 'measurement')) active.currentMeasurement = copy(options.measurement);
  if (Object.hasOwn(options, 'readerSnapshot')) active.readerSnapshot = copy(options.readerSnapshot);
  const previous = current(active), index = active.blocks.findIndex(item => item.id === action.blockId);
  let removedResult = null;
  if (!['minutes', 'move', 'remove', 'add'].includes(action.type)) throw new Error(ui('Unknown session change.', 'Cambio de sesión desconocido.'));
  if (action.type !== 'add') {
    if (index < 0) throw new Error(ui('This block no longer exists.', 'Este bloque ya no existe.'));
    if (index < active.blockIndex) throw new Error(ui('Completed blocks cannot be edited.', 'Los bloques completados no se pueden editar.'));
  }

  if (action.type === 'minutes') {
    if (!validMinutes(action.minutes)) throw new Error(ui('Choose a duration between 1 and 600 whole minutes.', 'Elige una duración de entre 1 y 600 minutos enteros.'));
    active.blocks[index].minutes = action.minutes;
  } else if (action.type === 'move') {
    if (!Number.isInteger(action.toIndex) || action.toIndex < active.blockIndex || action.toIndex >= active.blocks.length) throw new Error(ui('Move the block within the remaining session.', 'Mueve el bloque dentro de la parte pendiente de la sesión.'));
    suspendCurrent(active);
    active.blocks.splice(action.toIndex, 0, ...active.blocks.splice(index, 1));
    restore(active);
  } else if (action.type === 'remove') {
    if (active.blocks.length - active.blockIndex <= 1) throw new Error(ui('Keep at least one remaining block, or finish the session.', 'Mantén al menos un bloque pendiente o termina la sesión.'));
    const runtime = index === active.blockIndex ? runtimeOf(active) : active.blockRuntime?.find(item => item.blockId === action.blockId);
    if (runtime && performed(runtime)) {
      removedResult = resultOf(active.blocks[index], runtime, { removed: true });
      active.results.push(removedResult);
    }
    active.blockRuntime = (active.blockRuntime || []).filter(item => item.blockId !== action.blockId);
    active.blocks.splice(index, 1);
    if (index === active.blockIndex) restore(active);
    else if (!active.blockRuntime.length) delete active.blockRuntime;
  } else {
    if (active.blocks.length >= MAX_BLOCKS) throw new Error(ui('The session cannot contain more than 30 blocks.', 'La sesión no puede contener más de 30 bloques.'));
    if (!action.block?.id || active.blocks.some(item => item.id === action.block.id) || active.results.some(item => item.block.id === action.block.id)) throw new Error(ui('The new block needs a unique ID.', 'El bloque nuevo necesita un identificador único.'));
    if (!validMinutes(action.block.minutes)) throw new Error(ui('Choose a duration between 1 and 600 whole minutes.', 'Elige una duración de entre 1 y 600 minutos enteros.'));
    if (active.context === 'mobile' && !['reading', 'technique'].includes(action.block.type)) throw new Error(ui('Without a piano, choose reading or technique.', 'Sin piano, elige lectura o técnica.'));
    const toIndex = action.toIndex ?? active.blocks.length;
    if (!Number.isInteger(toIndex) || toIndex < active.blockIndex || toIndex > active.blocks.length) throw new Error(ui('Add the block within the remaining session.', 'Añade el bloque dentro de la parte pendiente de la sesión.'));
    if (toIndex === active.blockIndex && previous) suspendCurrent(active);
    active.blocks.splice(toIndex, 0, copy(action.block));
    if (toIndex === active.blockIndex) restore(active);
  }
  validate(active);
  return { active, currentChanged: current(active).id !== previous?.id, removedResult };
}
