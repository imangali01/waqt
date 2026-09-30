// Подсвечиваем кнопку для системы посетителя.
const ua = navigator.userAgent;
const primary = /Mac/.test(ua) && !/iPhone|iPad/.test(ua) ? 'dl-mac' : /Windows/.test(ua) ? 'dl-win' : null;
if (primary) document.getElementById(primary).classList.add('recommended');
