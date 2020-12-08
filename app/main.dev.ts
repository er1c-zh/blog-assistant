/* eslint global-require: off, no-console: off */

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
  globalShortcut,
  ipcMain,
  Menu,
  Tray,
  screen,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import snapshot from './snapshot';

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
    .catch(console.log);
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
  console.log(`load tray icon from:${iconPath}`);
  tray = new Tray(iconPath);
  const menu = Menu.buildFromTemplate([
    { label: 'Settings', type: 'normal' },
    { label: 'split0', type: 'separator' },
    { label: 'About', type: 'normal' },
  ]);
  tray.setToolTip('Blog Assistant');
  tray.setContextMenu(menu);
});

const windowsMap = new Map();
let once = false;
/**
 * register shortcut
 */
// eslint-disable-next-line promise/catch-or-return,promise/always-return
app.whenReady().then(() => {
  // eslint-disable-next-line no-loop-func
  ipcMain.on('close-snapshot-all', () => {
    console.log('close-snapshot-all');
    // eslint-disable-next-line no-shadow
    windowsMap.forEach((_w: any) => {
      _w.close();
    });
    windowsMap.clear();
    once = false;
  });

  ipcMain.on('show-snapshot', () => {
    console.log('show-snapshot');
    windowsMap.forEach((_w: any) => {
      _w.show();
      _w.setFullScreen(true);
    });
  });

  globalShortcut.register('CommandOrControl+Alt+D', () => {
    console.log('Create screen snapshot window');
    if (once) {
      console.log('Already exist, return;');
      return;
    }
    once = true;
    // eslint-disable-next-line no-restricted-globals
    const displays = screen.getAllDisplays();
    console.log(displays);
    // eslint-disable-next-line no-restricted-syntax
    for (const display of displays) {
      console.log(`create on display${display.id}`);
      console.log(display);
      const f = () => {
        const w = snapshot(display);
        if (w == null) {
          console.log('snapshot window already run');
          return;
        }
        console.log(`snapshot result=${w}`);
        console.log(w);
        windowsMap.set(display.id, w);
        console.log('snapshot window create finish');
      };
      f();
    }
  });
});
