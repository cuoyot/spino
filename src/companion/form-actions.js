// Keep form controls together while allowing long dialog fields to scroll independently.
export function mountDialogFormActions(dialog) {
  const body = dialog.querySelector('.cp-dialog-body');
  const form = body?.querySelector(':scope > form');
  const actions = form?.querySelector(':scope > .cp-actions, :scope > .cp-save-actions');
  if (!actions) return;
  const fields = document.createElement('div');
  fields.className = 'cp-form-fields';
  for (const node of [...form.childNodes]) if (node !== actions) fields.append(node);
  form.prepend(fields);
  form.classList.add('cp-action-form');
  actions.classList.add('cp-form-actions');
  const error = body.querySelector('#cp-form-error');
  if (error) actions.prepend(error);
  body.classList.add('cp-dialog-body-form');
}
