import {getAppLanguage} from './locale.js';
import {escapeHTML as esc} from './views.js';

// Share the same calendar date presentation between Today and event details.
export function eventDateTileMarkup(date) {
  const value = new Date(`${date}T12:00:00`);
  const part = options => new Intl.DateTimeFormat(getAppLanguage(), options).format(value);
  return `<time class="cp-event-date-tile" datetime="${esc(date)}" aria-label="${esc(part({dateStyle:'full'}))}"><span class="cp-event-month">${esc(part({month:'short',year:'numeric'}))}</span><strong>${esc(part({day:'numeric'}))}</strong><span class="cp-event-weekday">${esc(part({weekday:'long'}))}</span></time>`;
}
