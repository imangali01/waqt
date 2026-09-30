import { signIn } from './auth.js';

let dialog;

function build() {
  dialog = document.createElement('dialog');
  dialog.className = 'login';
  dialog.innerHTML = `
    <form method="dialog" class="login-form" novalidate>
      <h2>Вход в Waqt</h2>
      <p>Аккаунт тот же, что в приложении для компьютера. Отметки синхронизируются.</p>
      <input name="email" type="email" placeholder="Email" autocomplete="username" required>
      <input name="password" type="password" placeholder="Пароль" autocomplete="current-password" required>
      <div class="login-err" role="alert"></div>
      <div class="login-row">
        <button type="button" class="login-cancel">Отмена</button>
        <button type="submit" class="login-go">Войти</button>
      </div>
    </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const err = dialog.querySelector('.login-err');
  const go = dialog.querySelector('.login-go');
  dialog.querySelector('.login-cancel').addEventListener('click', () => dialog.close());
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    go.disabled = true;
    const res = await signIn(form.email.value.trim(), form.password.value);
    go.disabled = false;
    if (res.ok) { dialog.close(); dialog.dispatchEvent(new CustomEvent('signed-in')); } else err.textContent = res.error;
  });
}

// Открывает окно входа; onSuccess вызывается после удачного входа.
export function openLogin(onSuccess) {
  if (!dialog) build();
  dialog.addEventListener('signed-in', () => onSuccess?.(), { once: true });
  dialog.showModal();
  dialog.querySelector('input[name=email]').focus();
}
