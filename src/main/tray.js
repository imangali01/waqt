import { Tray, Menu, nativeImage } from 'electron';
import { t } from '../core/i18n.js';

// Иконка в трее: клик показывает/прячет виджет, меню перестраивается при смене языка или размера.
export function createTray({ iconPath, getLang, onToggle, onSettings, onHistory, onLogin, onQuit }) {
  let image = nativeImage.createFromPath(iconPath);
  if (process.platform === 'darwin') image = image.resize({ height: 18 });
  const tray = new Tray(image);
  tray.setToolTip('Waqt');
  tray.on('click', onToggle);

  function rebuildMenu() {
    const lang = getLang();
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: t(lang, 'tray.toggle'), click: onToggle },
      { label: t(lang, 'tray.settings'), click: onSettings },
      { label: t(lang, 'tray.history'), click: onHistory },
      { label: t(lang, 'tray.login'), click: onLogin },
      { label: t(lang, 'tray.quit'), click: onQuit },
    ]));
  }
  rebuildMenu();
  return { rebuildMenu };
}
