import { contextBridge, ipcRenderer } from 'electron'
import type {
  AiSessionConfig,
  AppConfig,
  AppSnapshot,
  BroadcastPayload,
  DemoEventKind,
  EmpathyResult,
  GongyouApi,
} from '../shared/contracts'
import { IPC_CHANNELS } from '../shared/contracts'
import type { FocusEvent } from '../shared/domain/focus'
import type { MemoInput, MemoPatch } from '../shared/domain/tasks'

const api: GongyouApi = {
  getSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.getSnapshot),
  updateConfig: (patch: Partial<AppConfig>) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateConfig, patch),
  setAiSession: (config: AiSessionConfig | null) =>
    ipcRenderer.invoke(IPC_CHANNELS.setAiSession, config),
  submitTreeHole: (text: string): Promise<EmpathyResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.submitTreeHole, text),
  deleteMemory: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteMemory, id),
  clearMemories: () => ipcRenderer.invoke(IPC_CHANNELS.clearMemories),
  dispatchFocus: (event: FocusEvent) =>
    ipcRenderer.invoke(IPC_CHANNELS.dispatchFocus, event),
  createCheckIn: (text: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.createCheckIn, text),
  createMemo: (input: MemoInput) =>
    ipcRenderer.invoke(IPC_CHANNELS.createMemo, input),
  updateMemo: (id: string, patch: MemoPatch) =>
    ipcRenderer.invoke(IPC_CHANNELS.updateMemo, id, patch),
  deleteMemo: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.deleteMemo, id),
  acknowledge: (key: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.acknowledge, key),
  triggerDemo: (kind: DemoEventKind) =>
    ipcRenderer.invoke(IPC_CHANNELS.triggerDemo, kind),
  hideAll: () => ipcRenderer.invoke(IPC_CHANNELS.hideAll),
  showWorkstation: () => ipcRenderer.invoke(IPC_CHANNELS.showWorkstation),
  subscribe: (listener: (snapshot: AppSnapshot) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, snapshot: AppSnapshot) => {
      listener(snapshot)
    }

    ipcRenderer.on(IPC_CHANNELS.snapshot, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.snapshot, handler)
  },
  subscribeReminder: (listener: (payload: BroadcastPayload) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: BroadcastPayload,
    ) => {
      listener(payload)
    }

    ipcRenderer.on(IPC_CHANNELS.reminder, handler)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.reminder, handler)
  },
}

contextBridge.exposeInMainWorld('gongyou', api)
