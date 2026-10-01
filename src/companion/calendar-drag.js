// A dedicated grip keeps ordinary card taps and calendar scrolling unchanged.
export function bindCalendarDrag(root, move, report) {
  let drag = null, frame = null;
  const targetAt = (x, y) => document.elementFromPoint(x, y)?.closest('[data-agenda-date], [data-action="select-day"]');
  const clear = () => {
    cancelAnimationFrame(frame); frame = null;
    root.querySelectorAll('.cp-drop-target,.cp-dragging').forEach(n => n.classList.remove('cp-drop-target', 'cp-dragging'));
    drag = null;
  };
  const mark = () => {
    root.querySelectorAll('.cp-drop-target').forEach(n => n.classList.remove('cp-drop-target'));
    const target = targetAt(drag.x, drag.y); target?.classList.add('cp-drop-target');
    drag.date = target?.dataset.agendaDate || target?.dataset.id;
  };
  const scroll = () => {
    if (!drag?.moved || !root.isConnected) { clear(); return; }
    const page = root.closest('.cp-page'), rect = page?.getBoundingClientRect();
    if (rect) { const delta = drag.y < rect.top + 65 ? -10 : drag.y > rect.bottom - 65 ? 10 : 0; if (delta) page.scrollTop += delta; }
    mark(); frame = requestAnimationFrame(scroll);
  };
  root.addEventListener('pointerdown', event => {
    const handle = event.target.closest('[data-move-plan]');
    if (!handle || event.button > 0 || drag) return;
    event.preventDefault(); handle.setPointerCapture(event.pointerId);
    drag = { pointer: event.pointerId, id: handle.dataset.movePlan, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, handle, moved: false };
  });
  root.addEventListener('pointermove', event => {
    if (drag?.pointer !== event.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.moved && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 6) {
      drag.moved = true; drag.handle.closest('.cp-agenda-card')?.classList.add('cp-dragging'); frame = requestAnimationFrame(scroll);
    }
    if (drag.moved) mark();
  });
  root.addEventListener('pointerup', event => {
    if (drag?.pointer !== event.pointerId) return;
    const { id, date, moved } = drag; clear();
    if (moved && date) void move(id, date).catch(error => report(error.message));
  });
  for (const name of ['pointercancel', 'lostpointercapture']) root.addEventListener(name, clear);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drag) { event.preventDefault(); clear(); return; }
    const handle = event.target.closest('[data-move-plan]');
    if (!handle) return;
    if (event.key === 'Escape') { clear(); return; }
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    void move(handle.dataset.movePlan, null, event.key === 'ArrowRight' ? 1 : -1).catch(error => report(error.message));
  });
}
