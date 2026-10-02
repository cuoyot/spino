import { ui } from './locale.js';

// Touch scrolling stays native until a stationary press lifts a remaining block.
export function bindSessionDrag(root, { change, pickup, cancelled, report }) {
  const lifetime = new AbortController(), signal = lifetime.signal;
  const bin = root.querySelector('[data-session-bin]');
  const page = root.closest('.cp-page');
  let drag = null, timer = null, frame = null, ghost = null, suppressClick = false;
  const rows = () => [...root.querySelectorAll('[data-session-block]:not(.is-completed)')];
  const clearMarks = () => root.querySelectorAll('.is-drop-before,.is-drop-after').forEach(row => row.classList.remove('is-drop-before', 'is-drop-after'));
  const clear = () => {
    clearTimeout(timer); cancelAnimationFrame(frame); timer = frame = null;
    ghost?.remove(); ghost = null;
    drag?.row.classList.remove('is-lifted');
    bin.hidden = true; bin.classList.remove('is-over');
    root.classList.remove('is-arranging'); clearMarks(); drag = null;
  };
  const cancel = () => { const lifted = drag?.lifted; clear(); if (lifted) cancelled?.(); };
  const contains = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  const mark = () => {
    if (!drag?.lifted) return;
    clearMarks(); drag.target = null;
    const overBin = !bin.disabled && contains(bin.getBoundingClientRect(), drag.x, drag.y);
    bin.classList.toggle('is-over', overBin);
    if (overBin) { drag.target = { type: 'remove', blockId: drag.id }; return; }
    const list = root.querySelector('.cp-session-blocks'), rect = list.getBoundingClientRect();
    if (!contains(page.getBoundingClientRect(), drag.x, drag.y) || drag.x < rect.left || drag.x > rect.right) return;
    const pending = rows(), first = pending[0]?.getBoundingClientRect();
    if (!first || drag.y < first.top || drag.y > rect.bottom + 20) return;
    const others = pending.filter(row => row !== drag.row);
    const before = others.find(row => drag.y < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2);
    const target = before || others.at(-1);
    if (!target) return;
    const completed = root.querySelectorAll('[data-session-block].is-completed').length;
    const toIndex = completed + (before ? others.indexOf(before) : others.length);
    if (toIndex !== drag.from) target.classList.add(before ? 'is-drop-before' : 'is-drop-after');
    drag.target = { type: 'move', blockId: drag.id, toIndex };
  };
  const draw = () => {
    if (!drag?.lifted || !root.isConnected) { clear(); return; }
    const width = ghost.getBoundingClientRect().width;
    ghost.style.left = Math.max(8, Math.min(innerWidth - width - 8, drag.x - width / 2)) + 'px';
    ghost.style.top = Math.max(4, Math.min(innerHeight - 56, drag.y - 64)) + 'px';
    const rect = page.getBoundingClientRect();
    if (!contains(bin.getBoundingClientRect(), drag.x, drag.y)) {
      const edge = 48;
      if (drag.y < rect.top + edge) page.scrollTop -= 7;
      else if (drag.y > rect.bottom - edge) page.scrollTop += 7;
    }
    mark(); frame = requestAnimationFrame(draw);
  };
  const lift = () => {
    if (!drag || !root.isConnected) return;
    drag.lifted = true; suppressClick = true;
    pickup?.(); root.classList.add('is-arranging'); drag.row.classList.add('is-lifted');
    root.querySelectorAll('[data-session-menu]').forEach(menu => menu.hidden = true);
    root.querySelectorAll('[data-session-options]').forEach(handle => handle.setAttribute('aria-expanded', 'false'));
    bin.disabled = rows().length < 2;
    bin.querySelector('span').textContent = bin.disabled ? ui('Keep one block', 'Conserva un bloque') : ui('Drop to remove', 'Suelta para eliminar');
    bin.hidden = false;
    ghost = document.createElement('div'); ghost.className = 'cp-session-drag-ghost';
    const copy = drag.row.querySelector('.cp-session-block-copy');
    ghost.textContent = [copy.querySelector('strong').firstChild.textContent.trim(), copy.querySelector(':scope > span').firstChild.textContent.trim()].join(' · ');
    ghost.setAttribute('aria-hidden', 'true'); document.body.append(ghost);
    frame = requestAnimationFrame(draw);
  };
  const start = (event, point, touch) => {
    if (drag) return;
    const row = event.target.closest('[data-session-block]:not(.is-completed)');
    if (!row || event.target.closest('input,label,select,a,[data-session-menu]') || event.target.closest('button:not([data-session-options])')) return;
    suppressClick = false;
    drag = { row, id: row.dataset.sessionBlock, from: [...root.querySelectorAll('[data-session-block]')].indexOf(row), x: point.clientX, y: point.clientY, startX: point.clientX, startY: point.clientY, touch, lifted: false };
    timer = setTimeout(lift, 380);
  };
  const move = point => {
    if (!drag) return;
    drag.x = point.clientX; drag.y = point.clientY;
    if (!drag.lifted && Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > 10) clear();
  };
  const drop = () => {
    if (!drag) return;
    mark(); const { target, lifted, from } = drag;
    clear();
    if (!lifted) return;
    if (target && (target.type === 'remove' || target.toIndex !== from)) void change(target).catch(error => report(error.message));
    else cancelled?.();
  };
  root.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { cancel(); return; }
    start(event, event.touches[0], true);
  }, { passive: true, signal });
  root.addEventListener('touchmove', event => {
    if (!drag?.touch) return;
    if (event.touches.length !== 1) { cancel(); return; }
    if (drag.lifted) event.preventDefault();
    move(event.touches[0]);
  }, { passive: false, signal });
  root.addEventListener('touchend', event => { if (drag?.touch) { if (drag.lifted) event.preventDefault(); drop(); } }, { passive: false, signal });
  root.addEventListener('touchcancel', cancel, { signal });
  root.addEventListener('pointerdown', event => { if (event.pointerType !== 'touch' && event.button === 0) start(event, event, false); }, { signal });
  window.addEventListener('pointermove', event => { if (drag && !drag.touch) move(event); }, { signal });
  window.addEventListener('pointerup', event => { if (drag && !drag.touch && event.button === 0) drop(); }, { signal });
  window.addEventListener('pointercancel', () => { if (drag && !drag.touch) cancel(); }, { signal });
  window.addEventListener('blur', cancel, { signal });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); }, { signal });
  root.addEventListener('contextmenu', event => { if (event.target.closest('[data-session-block]:not(.is-completed)')) event.preventDefault(); }, { signal });
  root.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; return; }
    const handle = event.target.closest('[data-session-options]');
    if (!handle) return;
    const menu = handle.closest('[data-session-block]').querySelector('[data-session-menu]');
    const open = menu.hidden;
    root.querySelectorAll('[data-session-menu]').forEach(item => item.hidden = true);
    root.querySelectorAll('[data-session-options]').forEach(item => item.setAttribute('aria-expanded', 'false'));
    menu.hidden = !open; handle.setAttribute('aria-expanded', String(open));
    if (open) menu.querySelector('button:not(:disabled)')?.focus();
  }, { capture: true, signal });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (drag) { event.preventDefault(); event.stopPropagation(); cancel(); return; }
    const menu = event.target.closest('[data-session-menu]');
    if (menu) {
      event.preventDefault(); event.stopPropagation(); menu.hidden = true;
      const handle = menu.closest('[data-session-block]').querySelector('[data-session-options]');
      handle.setAttribute('aria-expanded', 'false'); handle.focus();
    }
  }, { signal });
  return { destroy() { clear(); lifetime.abort(); }, get active() { return !!drag; } };
}
