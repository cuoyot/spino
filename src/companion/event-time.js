import {ui} from './locale.js';

// Explicit selects also work in WebViews without a usable HTML time picker.
export function eventTimeMarkup(time = '') {
  const [hour = '', minute = '00'] = time.split(':');
  const options = (count, selected) => Array.from({length: count}, (_, i) => {
    const value = String(i).padStart(2, '0');
    return `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`;
  }).join('');
  return `<fieldset class="cp-event-time"><legend>${ui('Time','Hora')}</legend><div class="cp-event-time-controls"><select name="eventHour" aria-label="${ui('Hour','Hora')}"><option value="">--</option>${options(24, hour)}</select><span aria-hidden="true">:</span><select name="eventMinute" aria-label="${ui('Minute','Minuto')}">${options(60, minute)}</select></div><input type="hidden" name="time" /></fieldset>`;
}

export function bindEventTime(form) {
  const {eventHour: hour, eventMinute: minute, time} = form.elements;
  const update = () => { time.value = hour.value ? `${hour.value}:${minute.value}` : ''; };
  hour.addEventListener('change', update);
  minute.addEventListener('change', update);
  update();
}
