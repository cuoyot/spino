import { beginSession, block, emptyData, validateData } from '../../src/companion/model.js';

export const REVIEW_DATE = '2026-10-04';
export const REVIEW_NOW = '2026-10-04T10:00:00+02:00';

function notebook(type, timing) {
  const data = emptyData();
  data.preferences.language = 'es';
  data.preferences.name = 'Pianista de prueba';
  data.preferences.context = 'mobile';
  data.active = beginSession({
    title: type === 'reading' ? 'Lectura sin piano' : 'Técnica sin piano',
    context: 'mobile',
    blocks: [block(type, {
      id: `review-${type}-${timing}`,
      minutes: 10,
      bpm: 60,
      timing,
      target: type === 'reading' ? 'G-major' : 'D-natural',
      hand: 'right',
      input: 'piano',
      figures: type === 'reading' ? '1' : 'hqe',
      presentation: 'page',
    })],
  }, Date.parse(REVIEW_NOW));
  data.active.id = `review-active-${type}-${timing}`;
  data.active.date = REVIEW_DATE;
  return validateData(data);
}

export function generatedPracticeFixtures() {
  const multiBlock = notebook('reading', 'timed');
  multiBlock.active.blocks.push(block('technique', {
    id: 'review-next-technique', minutes: 8, bpm: 72, timing: 'timed', target: 'D-major', hand: 'right', input: 'piano', figures: 'hq', presentation: 'page',
  }));
  return {
    'timed-reading': notebook('reading', 'timed'),
    'next-block': validateData(multiBlock),
    'self-paced-reading': notebook('reading', 'wait'),
    'adapted-range': notebook('reading', 'wait'),
    'self-paced-technique': notebook('technique', 'wait'),
  };
}

export const generatedPracticeStateLabels = {
  'timed-reading': 'Timed reading · paused score and keyboard',
  'next-block': 'Timed reading · next block is Technique',
  'self-paced-reading': 'Self-paced reading · correct and wrong answer',
  'adapted-range': 'Self-paced reading · keyboard range changed',
  'self-paced-technique': 'Self-paced technique · active exercise',
};
