import { BrowserWindow } from 'electron';
import path from 'path';

let once = false;

export default () => {
  console.log('start create snapshot window');

  if (once) {
    console.log('already one snapshot window, do NOT create');
    return null;
  }

  once = true;

  const w = new BrowserWindow({
    show: false,
    frame: false,
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

  w.loadURL(`file://${__dirname}/app.html#/snapshot`);
  w.on('closed', () => {
    once = false;
  });

  console.log('finish create snapshot window');

  return w;
};
