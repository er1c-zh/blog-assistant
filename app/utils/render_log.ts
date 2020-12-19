import { ipcRenderer } from 'electron';

export default {
  log(...args: any) {
    ipcRenderer.invoke('log', '[render]', ...args);
  },
};
