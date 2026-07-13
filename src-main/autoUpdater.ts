import { BrowserWindow, dialog } from 'electron';
import log from 'electron-log';

let win: BrowserWindow | null = null;

export function initAutoUpdater(window: BrowserWindow): void {
  win = window;

  // Dynamically import electron-updater only when running inside Electron
  // This prevents the crash when tsx loads this file outside electron context
  let autoUpdater: any;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch {
    log.warn('[Updater] electron-updater not available');
    return;
  }

  autoUpdater.logger = log;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  setTimeout(() => autoUpdater.checkForUpdates().catch((e: any) => log.warn('[Updater]', e)), 5000);
  setInterval(() => autoUpdater.checkForUpdates().catch((e: any) => log.warn('[Updater]', e)), 4 * 60 * 60 * 1000);

  autoUpdater.on('update-available', (info: any) => {
    if (!win) return;
    dialog.showMessageBox(win, {
      type: 'info', title: 'Update available',
      message: `Version ${info.version} is available.`,
      buttons: ['Download', 'Later'], defaultId: 0, cancelId: 1,
    }).then(({ response }) => { if (response === 0) autoUpdater.downloadUpdate(); });
  });

  autoUpdater.on('download-progress', (p: any) => {
    win?.setProgressBar(p.percent / 100);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    win?.setProgressBar(-1);
    dialog.showMessageBox(win!, {
      type: 'info', title: 'Update ready',
      message: `Version ${info.version} downloaded.`,
      buttons: ['Restart now', 'Later'], defaultId: 0, cancelId: 1,
    }).then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall(false, true); });
  });

  autoUpdater.on('error', (err: any) => {
    log.error('[Updater]', err);
    win?.setProgressBar(-1);
  });
}
