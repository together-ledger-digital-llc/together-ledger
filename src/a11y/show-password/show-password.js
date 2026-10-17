export function showPassword(input, t) {
  const container = document.createElement('div');
  container.className = 'show-password-container';
  input.parentNode.insertBefore(container, input);
  container.appendChild(input);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'show-password-button';
  button.setAttribute('data-i18n-aria-label', 'common.password.show');
  button.setAttribute('aria-label', t('common.password.show'));

  // Use inline SVG for eye and eye-with-slash
  const eyeIcon = `<svg class="show-password-eye" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`;
  const eyeSlashIcon = `<svg class="show-password-eye-slash" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" stroke-width="1.6"/></svg>`;

  button.innerHTML = eyeIcon;
  container.appendChild(button);

  function hide() {
    input.type = 'password';
    button.setAttribute('data-i18n-aria-label', 'common.password.show');
    button.setAttribute('aria-label', t('common.password.show'));
    button.innerHTML = eyeIcon;
  }

  function toggle() {
    if (input.type === 'password') {
      input.type = 'text';
      button.setAttribute('data-i18n-aria-label', 'common.password.hide');
      button.setAttribute('aria-label', t('common.password.hide'));
      button.innerHTML = eyeSlashIcon;
    } else {
      hide();
    }
  }

  button.addEventListener('click', toggle);

  if (input.form) {
    input.form.addEventListener('submit', hide);
  }

  input.closest('dialog')?.addEventListener('close', hide);

  window.addEventListener('pagehide', hide);
}
