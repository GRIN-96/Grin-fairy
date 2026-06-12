import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getSettings: (): Promise<import('../main/store').AppSettings> =>
    ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: import('../main/store').AppSettings): Promise<void> =>
    ipcRenderer.invoke('save-settings', settings),

  setIgnoreMouseEvents: (ignore: boolean): void =>
    ipcRenderer.send('set-ignore-mouse-events', ignore),

  startDrag: (startX: number, startY: number): void =>
    ipcRenderer.send('drag-start', startX, startY),

  moveDrag: (x: number, y: number): void =>
    ipcRenderer.send('drag-move', x, y),

  stopDrag: (): void =>
    ipcRenderer.send('drag-stop'),

  onOpenSettings: (cb: () => void): (() => void) => {
    ipcRenderer.on('open-settings', cb)
    return () => ipcRenderer.removeListener('open-settings', cb)
  },

  showContextMenu: (settings: import('../main/store').AppSettings): void =>
    ipcRenderer.send('show-context-menu', settings),

  onSettingsUpdate: (cb: (s: import('../main/store').AppSettings) => void): (() => void) => {
    const listener = (_: Electron.IpcRendererEvent, s: import('../main/store').AppSettings) => cb(s)
    ipcRenderer.on('settings-updated', listener)
    return () => ipcRenderer.removeListener('settings-updated', listener)
  },

}

contextBridge.exposeInMainWorld('electronAPI', api)
