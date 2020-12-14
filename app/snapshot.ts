import { BrowserWindow, Display } from 'electron';
import path from 'path';

export default (display: Display) => {
  console.log('start create snapshot window');
  const w = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
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
  console.log('finish create snapshot window');
  return w;
};
