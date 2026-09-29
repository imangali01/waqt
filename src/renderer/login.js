const $ = (id) => document.getElementById(id);

async function submit() {
  $('err').textContent = '';
  $('go').disabled = true;
  const res = await window.waqt.login($('email').value.trim(), $('password').value);
  $('go').disabled = false;
  if (res.ok) window.close();
  else $('err').textContent = res.error ?? 'Не удалось войти';
}

$('go').addEventListener('click', submit);
$('password').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
