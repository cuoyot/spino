import { catalogueWorkId } from './catalogue-identity.js';

// Broad browsing categories, not difficulty ratings or edition-rights claims.
// Original edition credits remain on the source record.
const composers = {
  albeniz: ['Isaac Albéniz', 'romantic'],
  bach: ['Johann Sebastian Bach', 'baroque'],
  petzold: ['Christian Petzold', 'baroque'],
  pachelbel: ['Johann Pachelbel', 'baroque'],
  mozart: ['Wolfgang Amadeus Mozart', 'classical'],
  beethoven: ['Ludwig van Beethoven', 'classical'],
  schubert: ['Franz Schubert', 'romantic'],
  chopin: ['Frédéric Chopin', 'romantic'],
  liszt: ['Franz Liszt', 'romantic'],
  schumann: ['Robert Schumann', 'romantic'],
  burgmuller: ['Johann Friedrich Franz Burgmüller', 'romantic'],
  tchaikovsky: ['Pyotr Ilyich Tchaikovsky', 'romantic'],
  rimsky: ['Nikolai Rimsky-Korsakov', 'romantic'],
  debussy: ['Claude Debussy', 'impressionist'],
  satie: ['Erik Satie', 'modern'],
  joplin: ['Scott Joplin', 'modern'],
  hill: ['Patty and Mildred Hill', 'modern'],
};
export const CATALOGUE_PERIODS = [
  ['baroque', 'Baroque', 'Barroco'],
  ['classical', 'Classical', 'Clasicismo'],
  ['romantic', 'Romantic', 'Romanticismo'],
  ['impressionist', 'Impressionism', 'Impresionismo'],
  ['modern', 'Early modernism', 'Primer modernismo'],
  ['unclassified', 'Unclassified', 'Sin clasificar'],
];
export function catalogueMusicMetadata(item) {
  const identity = catalogueWorkId(item), known = composers[identity?.split('-')[0]];
  return { composer: known?.[0] || item.composer || '', period: known?.[1] || 'unclassified' };
}
