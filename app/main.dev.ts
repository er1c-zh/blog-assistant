/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 */
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import path from 'path';
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  Notification,
  Tray,
  screen,
  nativeImage,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import global from './constants/global.json';
import MenuBuilder from './menu';
import snapshot from './snapshot';
import utils from './utils/utils';

const os = require('os');
const fs = require('fs');

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'resources')
  : path.join(__dirname, '../resources');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (
  process.env.NODE_ENV === 'development' ||
  process.env.DEBUG_PROD === 'true'
) {
  require('electron-debug')();
}

const installExtensions = async () => {
  /*
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(log.log);
   */
};

const createWindow = async () => {
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.DEBUG_PROD === 'true'
  ) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences:
      (process.env.NODE_ENV === 'development' ||
        process.env.E2E_BUILD === 'true') &&
      process.env.ERB_SECURE !== 'true'
        ? {
            nodeIntegration: true,
          }
        : {
            preload: path.join(__dirname, 'dist/renderer.prod.js'),
          },
  });

  // mainWindow.loadURL(`file://${__dirname}/app.html`);

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (process.env.E2E_BUILD === 'true') {
  // eslint-disable-next-line promise/catch-or-return
  app.whenReady().then(createWindow);
} else {
  app.on('ready', createWindow);
}

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

/**
 * add tray
 */
let tray = null;
// eslint-disable-next-line promise/catch-or-return,promise/always-return
app.whenReady().then(() => {
  const iconPath = path.join(getAssetPath('icon.png'));
  log.log(`load tray icon from:${iconPath}`);
  tray = new Tray(iconPath);
  const menu = Menu.buildFromTemplate([
    { label: 'Settings', type: 'normal' },
    { label: 'split0', type: 'separator' },
    { label: 'About', type: 'normal' },
  ]);
  tray.setToolTip('Blog Assistant');
  tray.setContextMenu(menu);
});

const windowsMap = new Map<number, BrowserWindow>();
let once = false;
/**
 * register shortcut
 */
// eslint-disable-next-line promise/catch-or-return,promise/always-return
app.whenReady().then(() => {
  // eslint-disable-next-line no-loop-func
  ipcMain.on('close-snapshot-all', () => {
    log.log('close-snapshot-all');
    // eslint-disable-next-line no-shadow
    windowsMap.forEach((_w: BrowserWindow) => {
      if (!_w.isDestroyed()) {
        _w.close();
      }
    });
    windowsMap.clear();
    once = false;
  });

  ipcMain.on('show-snapshot', () => {
    log.log('show-snapshot');
    windowsMap.forEach((_w: BrowserWindow) => {
      _w.show();
      _w.setFullScreen(true);
    });
  });

  ipcMain.on('show-notification', (_e, ...args) => {
    const n = new Notification(args[0]);
    n.on('show', () => {
      setTimeout(() => {
        n.close();
      }, 3000);
    });
    n.on('click', () => {
      n.close();
    });
    n.show();
    log.log(args);
  });

  ipcMain.handle('show-choose-path', (_e, ...args) => {
    const idx = args[0];
    log.log(idx);
    const parentWin = windowsMap.get(Number(idx));
    log.log(windowsMap);
    log.log(parentWin);
    if (parentWin === undefined) {
      return '';
    }
    const selected = dialog.showSaveDialogSync(parentWin, {
      title: 'Location to save',
      defaultPath: utils.genImgFileName(),
      properties: ['createDirectory', 'showOverwriteConfirmation'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'bmp'],
        },
      ],
    });
    log.log(`select ${selected}`);
    return selected;
  });

  ipcMain.handle('get-tmp-dir', () => {
    return `${os.tmpdir()}/${global.app_name}`;
  });

  ipcMain.handle('save-img', (_e, ...args) => {
    let filePath = args[0] as string;
    const imgDataURL = args[1] as string;
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true,
    });
    const img = nativeImage.createFromDataURL(imgDataURL);
    log.log(path.extname(filePath).toLowerCase());
    switch (path.extname(filePath).toLowerCase()) {
      case '.png':
        fs.writeFileSync(filePath, img.toPNG());
        break;
      case '.jpg':
        fs.writeFileSync(filePath, img.toJPEG(100));
        break;
      case '.bmp':
        fs.writeFileSync(filePath, img.toBitmap());
        break;
      default:
        filePath = `${filePath}.png`;
        fs.writeFileSync(filePath, img.toPNG());
        break;
    }
    return {
      ok: true,
      msg: 'success',
      path: filePath,
    };
  });

  ipcMain.handle('log', (_e, ...args: any) => {
    log.log(...args);
  });

  ipcMain.handle('upload-img', (_e, tmpPath: string) => {
    log.log(`todo upload-img:${tmpPath}`);
  });

  globalShortcut.register('CommandOrControl+Alt+D', () => {
    log.log('Create screen snapshot window');
    if (once) {
      log.log('Already exist, return;');
      return;
    }
    once = true;
    // eslint-disable-next-line no-restricted-globals
    const displays = screen.getAllDisplays();
    log.log(displays);
    // eslint-disable-next-line no-restricted-syntax,guard-for-in
    for (const idx in displays) {
      const display = displays[idx];
      log.log(`create on display${display.id}, idx=${idx}`);
      log.log(display);
      const f = () => {
        const w = snapshot(display);
        if (w == null) {
          log.log('snapshot window already run');
          return;
        }
        w.setAlwaysOnTop(true, 'screen-saver');
        log.log(`snapshot result=${w}`);
        log.log(w);
        // eslint-disable-next-line @typescript-eslint/naming-convention,no-underscore-dangle
        const _idx = Number(idx) + 1;
        w.loadURL(`file://${__dirname}/app.html#/snapshot/${_idx}`);
        windowsMap.set(_idx, w);
        log.log('snapshot window create finish');
      };
      f();
    }
  });
});
