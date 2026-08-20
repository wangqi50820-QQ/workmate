import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppConfig,
  AppSnapshot,
  GongyouApi,
} from '../shared/contracts'

const api: GongyouApi = {
  getSnapshot: () => ipcRenderer.invoke('gongyou:get-snapshot'),
  updateConfig: (patch: Partial<AppConfig>) =>
    ipcRenderer.invoke('gongyou:update-config', patch),
  hideAll: () => ipcRenderer.invoke('gongyou:hide-all'),
  showWorkstation: () => ipcRenderer.invoke('gongyou:show-workstation'),
  subscribe: (listener: (snapshot: AppSnapshot) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: AppSnapshot) => {
      listener(snapshot)
    }

    ipcRenderer.on('gongyou:snapshot', handler)
    return () => ipcRenderer.removeListener('gongyou:snapshot', handler)
  },
}

contextBridge.exposeInMainWorld('gongyou', api)
