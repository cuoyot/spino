import {getAppLanguage, ui} from './locale.js';
import {daysUntil} from './model.js';

export function eventCountdownUnits(date, from) {
  const days = daysUntil(date, from);
  if (days <= 0) return [];
  const weeks = Math.floor(days / 7), rest = days % 7;
  return [...(weeks ? [{value:weeks, unit:'week'}] : []), ...(rest ? [{value:rest, unit:'day'}] : [])];
}

export function eventCountdown(date, from) {
  const days = daysUntil(date, from);
  if (days < 0) return ui('Past event', 'Evento pasado');
  if (days === 0) return ui('Today', 'Hoy');
  return new Intl.ListFormat(getAppLanguage(), {style:'long', type:'conjunction'}).format(
    eventCountdownUnits(date, from).map(({value, unit}) => new Intl.NumberFormat(getAppLanguage(), {style:'unit', unit, unitDisplay:'long'}).format(value)),
  );
}
