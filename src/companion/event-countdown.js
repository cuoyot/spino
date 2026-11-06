import {getAppLanguage, ui} from './locale.js';
import {daysUntil} from './model.js';

export function eventCountdown(date, from) {
  const days = daysUntil(date, from);
  if (days < 0) return ui('Past event', 'Evento pasado');
  if (days === 0) return ui('Today', 'Hoy');
  const weeks = Math.floor(days / 7), rest = days % 7;
  const unit = (value, name) => new Intl.NumberFormat(getAppLanguage(), {style:'unit', unit:name, unitDisplay:'long'}).format(value);
  return new Intl.ListFormat(getAppLanguage(), {style:'long', type:'conjunction'}).format([
    ...(weeks ? [unit(weeks, 'week')] : []), ...(rest ? [unit(rest, 'day')] : []),
  ]);
}
