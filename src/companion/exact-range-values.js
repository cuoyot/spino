import {ui} from './locale.js';

function outputFor(range) {
  return range.closest('#app-shell, #cp-dialog')?.querySelector(`output[for="${CSS.escape(range.id)}"]`);
}

export function syncExactRange(range) {
  const output = outputFor(range);
  if (!output) return;
  const button = output.querySelector('[data-exact-range]');
  if (!button) { output.value = range.value; return; }
  button.textContent = range.value;
  button.setAttribute('aria-label', `${ui('Edit value','Editar valor')}: ${button.dataset.rangeLabel}, ${range.value}`);
}

// Reuse each slider's value, constraints and existing input/change handlers.
export function bindExactRangeValues(container) {
  for (const output of container.querySelectorAll('output[for]')) {
    const range = container.querySelector(`#${CSS.escape(output.htmlFor.value)}`);
    if (range?.type !== 'range' || output.querySelector('[data-exact-range]')) continue;
    const label = (range.labels?.[0] || range.closest('label'))?.cloneNode(true);
    label?.querySelectorAll('output,input,button').forEach(node => node.remove());
    const name = range.getAttribute('aria-label') || label?.textContent.trim() || ui('Value','Valor');
    if (!range.hasAttribute('aria-label')) range.setAttribute('aria-label', name);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cp-exact-range-value';
    button.dataset.exactRange = range.id;
    button.dataset.rangeLabel = name;
    output.replaceChildren(button);
    syncExactRange(range);
    range.addEventListener('input', () => syncExactRange(range));
    button.addEventListener('click', event => {
      event.preventDefault();
      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'cp-exact-range-input';
      input.min = range.min;
      input.max = range.dataset.exactMax || range.max;
      input.step = range.step || '1';
      input.value = range.value;
      input.required = true;
      input.setAttribute('aria-label', name);
      let closed = false;
      const close = (commit, focus = false) => {
        if (closed) return;
        if (commit && !input.checkValidity()) {
          if (focus) { input.reportValidity(); return; }
          commit = false;
        }
        closed = true;
        if (commit) {
          const value = Number(input.value);
          if (value > Number(range.max)) range.max = String(value);
          range.value = input.value;
        }
        input.remove();
        button.hidden = false;
        syncExactRange(range);
        if (commit) {
          range.dispatchEvent(new Event('input', {bubbles: true}));
          range.dispatchEvent(new Event('change', {bubbles: true}));
        }
        if (focus) button.focus({preventScroll: true});
      };
      input.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === 'Escape') {
          event.preventDefault();
          close(event.key === 'Enter', true);
        }
      });
      input.addEventListener('blur', () => close(true));
      button.hidden = true;
      output.append(input);
      input.focus();
      input.select();
    });
  }
}
