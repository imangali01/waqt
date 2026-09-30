import { initLang, tr } from './i18n-dom.js';

initLang((l) => { document.title = tr('login.title'); });
const $ = (id) => document.getElementById(id);

async function submit() {
  $('err').textContent = '';
  $('go').disabled = true;
  const res = await window.waqt.login($('email').value.trim(), $('password').value);
  $('go').disabled = false;
  if (res.ok) window.close();
  else $('err').textContent = res.error ?? tr('login.fail');
}

$('go').addEventListener('click', submit);
$('password').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
