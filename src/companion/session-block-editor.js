import { ui } from './locale.js';
import { ACTIVITIES } from './model.js';
import { TARGETS } from './curriculum.js';
import { HANDS, RANGE_LEVELS } from './practice-defaults.js';
import { rhythmOptions, rhythmLevel } from './rhythm-levels.js';
import { warmupChoices, warmupChoice, readWarmupChoice } from './warmups.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const label = (text, control) => '<label>' + text + control + '</label>';
const select = (name, entries, value) => '<select name="' + name + '">' + entries.map(([id, text]) => '<option value="' + esc(id) + '"' + (String(id) === String(value) ? ' selected' : '') + '>' + esc(text) + '</option>').join('') + '</select>';
const number = (name, value, min, max) => '<input type="number" inputmode="numeric" name="' + name + '" min="' + min + '" max="' + max + '" step="1" value="' + value + '" required>';
const generated = type => ['reading', 'technique', 'theory', 'warmup'].includes(type);

export function sessionBlockEditorMarkup(block, data, {routine=false}={}) {
  const mobile = data.active.context === 'mobile';
  const warm = block.type === 'warmup';
  const types = warm ? ['warmup'] : mobile ? ['reading', 'technique'] : ['reading', 'technique', 'repertoire', 'free'];
  if (block.type === 'theory') types.unshift('theory');
  const works = data.works.filter(work => !work.trashedAt || work.id === block.workId);
  return '<form id="session-block-form" class="cp-block-editor"><div class="cp-block-editor-grid">' +
    label(ui('Activity', 'Actividad'), select('type', types.map(type => [type, ACTIVITIES[type]]), block.type)) +
    label(ui('Minutes', 'Minutos'), number('minutes', block.minutes, 1, 600)) + '</div>' +
    '<div data-editor-generated class="cp-block-editor-grid">' +
    (warm ? label(ui('Exercises', 'Ejercicios'), select('warmup', warmupChoices(data, block), warmupChoice(block))) : label(ui('Scale or mode', 'Escala o modo'), select('target', TARGETS.map(target => [target.id, target.label]), block.target || 'C-major'))) +
    label(ui('Hands', 'Manos'), select('hand', HANDS.filter(([hand]) => !mobile || hand !== 'both' || block.hand === 'both').map(([hand]) => [hand, { right: ui('Right hand', 'Mano derecha'), left: ui('Left hand', 'Mano izquierda'), both: ui('Both hands', 'Ambas manos') }[hand]]), block.hand)) + '</div>' +
    '<div data-editor-work>' + label(ui('Work', 'Obra'), select('workId', [['', ui('Choose when practising', 'Elegir al practicar')], ...works.map(work => [work.id, work.title])], block.workId)) + '</div>' +
    '<div class="cp-block-editor-grid"><div data-editor-tempo '+(routine?'data-routine-tempo hidden':'')+'>' + (routine?'<input type="hidden" name="bpm" value="'+block.bpm+'">':label(ui('Tempo · BPM', 'Tempo · BPM'), number('bpm', block.bpm, 30, 160))) + '</div>' +
    (mobile ? '<div data-editor-generated>' + label(ui('Timing', 'Ritmo'), select('timing', [['timed', ui('With tempo', 'Con tempo')], ['wait', ui('No tempo', 'Sin tempo')]], block.timing || 'timed')) + '</div>' : '') + '</div>' +
    '<details class="cp-block-editor-more"><summary>' + ui('More settings', 'Más ajustes') + '</summary><div data-editor-generated class="cp-block-editor-grid">' +
    label(ui('Reading range', 'Rango de lectura'), select('level', RANGE_LEVELS, block.level ?? 0)) +
    label(ui('Rhythm level', 'Nivel de ritmo'), select('figures', rhythmOptions(), rhythmLevel(block.figures))) +
    label(ui('Score', 'Partitura'), select('presentation', [['auto', ui('Match device', 'Según dispositivo')], ['scroll', ui('Scrolling', 'Desplazamiento')], ['page', ui('Fixed page', 'Página fija')]], block.presentation || 'auto')) +
    (mobile ? label(ui('Answer with', 'Responder con'), select('input', [['piano', ui('On-screen keyboard', 'Teclado en pantalla')], ['names', ui('Note names', 'Nombres de notas')]], block.input)) : '') + '</div>' +
    label(ui('Focus or passage', 'Objetivo o pasaje'), '<textarea name="passage" rows="2" maxlength="10000">' + esc(block.passage) + '</textarea>') + '</details>' +
    (routine?'':'<p class="cp-block-editor-note">' + ui('Previous practice is kept.', 'Se conserva lo ya practicado.') + '</p>') + '<div class="cp-actions"><button type="button" data-action="close-dialog">' + ui('Cancel', 'Cancelar') + '</button><button type="submit" class="primary">' + (routine?ui('Apply block','Aplicar bloque'):ui('Save changes', 'Guardar cambios')) + '</button></div></form>';
}

export function bindSessionBlockEditor(form, data) {
  const fields = form.elements;
  const update = () => {
    const isGenerated = generated(fields.type.value);
    form.querySelectorAll('[data-editor-generated]').forEach(group => group.hidden = !isGenerated);
    form.querySelector('[data-editor-work]').hidden = fields.type.value !== 'repertoire';
    form.querySelector('[data-editor-tempo]').hidden = form.querySelector('[data-editor-tempo]').hasAttribute('data-routine-tempo') || isGenerated && data.active.context === 'mobile' && fields.timing?.value === 'wait';
  };
  fields.type.addEventListener('change', update);
  fields.timing?.addEventListener('change', update);
  fields.workId.addEventListener('change', () => {
    const work = data.works.find(work => work.id === fields.workId.value);
    if (work) { fields.bpm.value = Math.max(30, Math.min(160, work.bpm || 60)); fields.passage.value = work.passage || ''; }
  });
  update();
}

export function readSessionBlockEditor(form, original, data) {
  const type = String(form.get('type')), mobile = data.active.context === 'mobile';
  const work = data.works.find(item => item.id === form.get('workId'));
  if (type === 'repertoire' && work?.trashedAt && work.id !== original.workId) throw Error(ui('Choose a repertoire work.', 'Elige una obra del repertorio.'));
  const values = { type, minutes: Number(form.get('minutes')), bpm: Number(form.get('bpm')), passage: String(form.get('passage') || '') };
  if (generated(type)) {
    Object.assign(values, { ...(type === 'warmup' ? readWarmupChoice(form.get('warmup')) : { target: String(form.get('target')) }), hand: String(form.get('hand')), level: Number(form.get('level')), figures: String(form.get('figures')), presentation: String(form.get('presentation')) });
    if (!generated(original.type)) values.workId = '';
    if (mobile) Object.assign(values, { timing: String(form.get('timing')), input: String(form.get('input')) });
  } else {
    if (type !== original.type) Object.assign(values, { hand: 'right', workId: '', target: null });
    if (type === 'repertoire' && (type !== original.type || (work?.id || '') !== original.workId)) Object.assign(values, { workId: work?.id || '', target: work?.target ?? null });
  }
  // Default-valued controls must not restart an unchanged imported block.
  const defaults = { level: 0, presentation: 'auto', timing: 'timed' };
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key] ?? defaults[key] ?? (key === 'exercises' ? [original.target] : undefined))));
}
