import {ui} from './locale.js';

// Explicit selects also work in WebViews without a usable HTML time picker.
export function eventTimeMarkup(time = '') {
  const [hour = '', minute = '00'] = time.split(':');
  const options = (count, selected) => Array.from({length: count}, (_, i) => {
    const value = String(i).padStart(2, '0');
    return `<option value="${value}"${value === selected ? ' selected' : ''}>${value}</option>`;
  }).join('');
  return `<fieldset class="cp-event-time"><legend>${ui('Time','Hora')}</legend><button type="button" data-show-event-time${hour ? ' hidden' : ''}>${ui('No time','Sin hora')}</button><div class="cp-event-time-controls"${hour ? '' : ' hidden'}><select name="eventHour" aria-label="${ui('Hour','Hora')}"><option value="">${ui('No time','Sin hora')}</option>${options(24, hour)}</select><span aria-hidden="true">:</span><select name="eventMinute" aria-label="${ui('Minute','Minuto')}">${options(60, minute)}</select></div><input type="hidden" name="time" /></fieldset>`;
}

export function bindEventTime(form) {
  const {eventHour: hour, eventMinute: minute, time} = form.elements;
  const toggle = form.querySelector('[data-show-event-time]');
  const controls = hour.parentElement;
  const reveal = visible => {
    controls.hidden = !visible;
    toggle.hidden = visible;
  };
  toggle.addEventListener('click', () => { reveal(true); hour.focus(); });
  const update = () => { time.value = hour.value ? `${hour.value}:${minute.value}` : ''; };
  hour.addEventListener('change', () => {
    if (!hour.value) { reveal(false); toggle.focus(); }
  });
  hour.addEventListener('change', update);
  minute.addEventListener('change', update);
  update();
}
