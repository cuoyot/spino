import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { setAppLanguage } from '../src/companion/locale.js';
import { block, emptyData } from '../src/companion/model.js';
import { calendarMarkup, dashboardMarkup, feedbackFields, MOODS, orientationAdvice, preparationMarkup } from '../src/companion/views.js';
import { agendaCard, todayMarkup, weekAgendaMarkup } from '../src/companion/agenda.js';
import { plannerMarkup, proposeSchedule } from '../src/companion/planner.js';
import { TARGETS, targetById } from '../src/companion/curriculum.js';

afterEach(() => setAppLanguage('en'));
const text = markup => markup.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

function fixture() {
  const data = emptyData();
  data.preferences.name = 'Alex';
  const blocks = [block('reading', { passage: 'Keep my passage', timing: 'wait' }), block('technique')];
  data.works.push({ id: 'work', title: 'The Entertainer', composer: 'Scott Joplin', stage: 'En estudio' });
  data.routines.push({ id: 'routine', title: 'Morning routine', context: 'mobile', blocks });
  data.plans.push({ id: 'plan', title: 'My custom plan', context: 'mobile', blocks, status: 'planned', date: '2026-10-01' });
  data.events.push({ id: 'lesson', title: 'My private lesson', type: 'Clase', date: '2026-10-02', time: '18:00' });
  return data;
}

test('Spanish preparation translates timing, ranges, catalogue actions and editing hints', () => {
  const data = fixture(), snapshot = JSON.stringify(data);
  setAppLanguage('es');
  const markup = preparationMarkup(data.routines[0], 'edit-plan', data);
  for (const label of ['Editar práctica prevista', 'Duración total', '+ Catálogo', 'Manos', 'Rango de lectura', 'Sin tempo', '+ Añadir bloque', 'Revisar fecha y guardar']) assert.ok(markup.includes(label), label);
  assert.doesNotMatch(text(markup), /Edit planned|Total duration|Catalogue|Hands|Reading range|Both hands|Add block|Review date|Changes apply/);
  assert.match(markup, /value="Keep my passage"/);
  assert.match(markup, /Morning routine/);
  assert.equal(JSON.stringify(data), snapshot);
});

test('calendar, agenda and recurring planner switch their dates and actions at runtime', () => {
  const data = fixture();
  const render = () => [calendarMarkup(data, '2026-10-01', 'month'), weekAgendaMarkup(data, '2026-10-01'), todayMarkup(data, () => '', '2026-10-01'), plannerMarkup(data, '2026-10-01')].join('');
  setAppLanguage('es');
  const spanish = render();
  assert.match(spanish, /octubre de 2026/);
  for (const label of ['Editar práctica', 'Arrastrar a otro día', 'Solo esta semana', 'Cada semana durante 4 semanas', 'Guardar semana', 'Próximos compromisos']) assert.ok(spanish.includes(label), label);
  assert.doesNotMatch(text(spanish), /Edit practice|Repeat|This week only|Every week|Save week|Thursday|October/);
  setAppLanguage('en');
  const english = render();
  for (const label of ['October 2026', 'Edit practice', 'Every week for 4 weeks', 'Save week', 'Coming up']) assert.ok(english.includes(label), label);
  assert.doesNotMatch(text(english), /Calendario|Organiza tu semana|Días de práctica|Próximos compromisos/);
  assert.ok(spanish.includes('My custom plan') && english.includes('My custom plan'));
  assert.ok(spanish.includes('My private lesson') && english.includes('My private lesson'));
});

test('feedback, dashboard, orientation and event labels follow the language without changing user content', () => {
  const data = fixture(), original = JSON.stringify(data);
  setAppLanguage('es');
  assert.equal(MOODS[0], 'Muy difícil');
  assert.match(feedbackFields({ title: 'Private title', notes: 'Private note', next: 'Private next', blocks: [] }, data.works), /Comentarios y anotaciones/);
  assert.match(orientationAdvice('midi', 'auto', 390, 844), /apaisado/);
  setAppLanguage('en');
  assert.equal(MOODS[0], 'Very difficult');
  const dashboard = dashboardMarkup(data);
  assert.match(dashboard, /Library/);
  assert.match(dashboard, /Catalogue/);
  assert.doesNotMatch(dashboard, /cp-dashboard-week|View progress/);
  assert.match(dashboard, /Learning/);
  assert.match(dashboard, /The Entertainer/);
  assert.match(agendaCard({ event: data.events[0], id: 'lesson' }), /Lesson/);
  assert.match(orientationAdvice('midi', 'auto', 390, 844), /landscape/);
  assert.equal(JSON.stringify(data), original);
});

test('scale labels update immediately while IDs, pitches and keys remain unchanged', () => {
  const target = targetById('D-dorian');
  const musicalData = () => TARGETS.map(t => ({ id: t.id, key: t.key, tonic: t.tonic, mode: t.mode, notes: t.notes.map(({ letter, acc, degree }) => ({ letter, acc, degree })) }));
  const original = musicalData();
  setAppLanguage('es');
  assert.equal(target.label, 'Re dórico');
  assert.match(target.detail, /tercera menor/);
  assert.equal(target.notes[0].label, 'Re');
  setAppLanguage('en');
  assert.equal(target, targetById('D-dorian'));
  assert.equal(target.label, 'D Dorian');
  assert.match(target.detail, /minor third/);
  assert.equal(target.notes[0].label, 'D');
  assert.deepEqual(musicalData(), original);
});

test('planner validation and generated defaults use the selected language with stable event types', () => {
  const data = emptyData();
  const settings = { week: '2026-10-05', weeks: 4, days: [0], minutes: 40, context: 'mobile', tutor: true, tutorDay: 2, tutorTime: '18:00' };
  setAppLanguage('es');
  assert.throws(() => proposeSchedule(data, { ...settings, weeks: 0 }, '2026-10-01'), /Elige entre 1 y 52 semanas/);
  const spanish = proposeSchedule(data, settings, '2026-10-01');
  assert.equal(spanish.events[0].title, 'Clase con tutor');
  setAppLanguage('en');
  const english = proposeSchedule(data, settings, '2026-10-01');
  assert.equal(english.events[0].title, 'Lesson with a tutor');
  assert.equal(english.events[0].type, spanish.events[0].type);
  assert.equal(english.events[0].type, 'Clase');
  assert.equal(english.plans.length, spanish.plans.length);
  assert.throws(() => proposeSchedule(data, { ...settings, weeks: 0 }, '2026-10-01'), /Choose between 1 and 52 weeks/);
});
