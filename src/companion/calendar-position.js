// Anchor to a date rather than an absolute pixel offset: synchronization can
// add cards above the visible day while keeping the selected calendar range.
export function captureCalendarPosition(root) {
  const page = root.querySelector('.cp-page[data-view="calendar"]');
  if (!page) return null;
  const top = page.getBoundingClientRect().top;
  const day = [...page.querySelectorAll('[data-agenda-date]')].find(el => el.getBoundingClientRect().bottom > top + 1);
  return {scroll: page.scrollTop, date: day?.dataset.agendaDate, offset: day ? day.getBoundingClientRect().top - top : 0};
}

export function restoreCalendarPosition(root, position) {
  const page = root.querySelector('.cp-page[data-view="calendar"]');
  if (!page || !position) return;
  const day = [...page.querySelectorAll('[data-agenda-date]')].find(el => el.dataset.agendaDate === position.date);
  page.scrollTop = day ? page.scrollTop + day.getBoundingClientRect().top - page.getBoundingClientRect().top - position.offset : position.scroll;
}
