import './dialog.css';

let dialogHost = null;

function ensureDialogHost() {
  if (dialogHost) return dialogHost;

  dialogHost = document.createElement('div');
  dialogHost.className = 'app-dialog';
  dialogHost.hidden = true;
  dialogHost.innerHTML = `
    <div class="app-dialog__overlay" data-dialog-action="cancel"></div>
    <div class="app-dialog__panel" role="dialog" aria-modal="true" aria-label="Потвърждение">
      <h3 class="app-dialog__title" data-dialog-title>Потвърждение</h3>
      <p class="app-dialog__message" data-dialog-message></p>
      <input class="app-dialog__input" data-dialog-input hidden />
      <div class="app-dialog__actions">
        <button type="button" class="btn btn-outline-secondary btn-sm" data-dialog-action="cancel">Отказ</button>
        <button type="button" class="btn btn-primary btn-sm" data-dialog-action="confirm">Потвърди</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialogHost);
  return dialogHost;
}

function openDialog({
  title = 'Потвърждение',
  message = 'Сигурни ли сте?',
  confirmText = 'Потвърди',
  cancelText = 'Отказ',
  confirmClass = 'btn-primary',
  mode = 'confirm',
  initialValue = '',
  placeholder = ''
} = {}) {
  const host = ensureDialogHost();
  const titleEl = host.querySelector('[data-dialog-title]');
  const messageEl = host.querySelector('[data-dialog-message]');
  const inputEl = host.querySelector('[data-dialog-input]');
  const cancelBtn = host.querySelector('[data-dialog-action="cancel"]:not(.app-dialog__overlay)');
  const confirmBtn = host.querySelector('[data-dialog-action="confirm"]');

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmBtn.textContent = confirmText;
  cancelBtn.textContent = cancelText;

  confirmBtn.classList.remove('btn-primary', 'btn-danger', 'btn-success', 'btn-warning', 'btn-info');
  confirmBtn.classList.add(confirmClass);

  if (mode === 'prompt') {
    inputEl.hidden = false;
    inputEl.value = initialValue;
    inputEl.placeholder = placeholder || '';
  } else {
    inputEl.hidden = true;
    inputEl.value = '';
  }

  host.hidden = false;

  return new Promise((resolve) => {
    const close = (result) => {
      host.removeEventListener('click', handleClick);
      host.hidden = true;
      resolve(result);
    };

    const handleClick = (event) => {
      const actionEl = event.target.closest('[data-dialog-action]');
      if (!actionEl) return;

      const action = actionEl.dataset.dialogAction;
      if (action === 'cancel') {
        close(mode === 'confirm' ? false : null);
        return;
      }

      if (action === 'confirm') {
        if (mode === 'confirm') {
          close(true);
          return;
        }

        close(inputEl.value.trim());
      }
    };

    host.addEventListener('click', handleClick);

    if (mode === 'prompt') {
      setTimeout(() => inputEl.focus(), 10);
    }
  });
}

export function showConfirm(options = {}) {
  return openDialog({
    ...options,
    mode: 'confirm'
  });
}

export function showPrompt(options = {}) {
  return openDialog({
    ...options,
    mode: 'prompt'
  });
}
