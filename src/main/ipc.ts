import type {
  AiSessionConfig,
  AppConfig,
  AppSnapshot,
  DemoEventKind,
  EmpathyResult,
} from '../shared/contracts'
import {
  GONGYOU_INVOKE_CHANNELS,
  IPC_CHANNELS,
} from '../shared/contracts'
import type { FocusEvent } from '../shared/domain/focus'
import type { MemoInput, MemoPatch } from '../shared/domain/tasks'
import type { ReminderEvent } from '../shared/domain/reminders'

type IpcListener = (...args: unknown[]) => unknown

export interface IpcMainLike {
  handle(channel: string, listener: IpcListener): void
  removeHandler(channel: string): void
}

export interface IpcServices {
  getSnapshot(): Promise<AppSnapshot>
  updateConfig(patch: Partial<AppConfig>): Promise<AppSnapshot>
  setAiSession(config: AiSessionConfig | null): Promise<void>
  submitTreeHole(text: string): Promise<EmpathyResult>
  deleteMemory(id: string): Promise<AppSnapshot>
  clearMemories(): Promise<AppSnapshot>
  dispatchFocus(event: FocusEvent): Promise<AppSnapshot>
  createCheckIn(text: string): Promise<AppSnapshot>
  createMemo(input: MemoInput): Promise<AppSnapshot>
  updateMemo(id: string, patch: MemoPatch): Promise<AppSnapshot>
  deleteMemo(id: string): Promise<AppSnapshot>
  acknowledge(key: string): Promise<AppSnapshot>
  triggerDemo(kind: DemoEventKind): Promise<void>
  hideAll(): Promise<void>
  showWorkstation(): Promise<void>
}

export interface ReminderDeliveryTargets {
  showBroadcast(event: ReminderEvent): void
  showNotification(event: ReminderEvent): void
}

export function routeReminderDelivery(
  event: ReminderEvent,
  meetingMode: boolean,
  targets: ReminderDeliveryTargets,
): void {
  if (!meetingMode) {
    targets.showBroadcast(event)
  }
  targets.showNotification(event)
}

export function registerIpcHandlers(
  ipc: IpcMainLike,
  services: IpcServices,
): () => void {
  const handlers: Record<string, IpcListener> = {
    [IPC_CHANNELS.getSnapshot]: () => services.getSnapshot(),
    [IPC_CHANNELS.updateConfig]: (_event, patch) =>
      services.updateConfig(patch as Partial<AppConfig>),
    [IPC_CHANNELS.setAiSession]: (_event, config) =>
      services.setAiSession(config as AiSessionConfig | null),
    [IPC_CHANNELS.submitTreeHole]: (_event, text) =>
      services.submitTreeHole(text as string),
    [IPC_CHANNELS.deleteMemory]: (_event, id) =>
      services.deleteMemory(id as string),
    [IPC_CHANNELS.clearMemories]: () => services.clearMemories(),
    [IPC_CHANNELS.dispatchFocus]: (_event, focusEvent) =>
      services.dispatchFocus(focusEvent as FocusEvent),
    [IPC_CHANNELS.createCheckIn]: (_event, text) =>
      services.createCheckIn(text as string),
    [IPC_CHANNELS.createMemo]: (_event, input) =>
      services.createMemo(input as MemoInput),
    [IPC_CHANNELS.updateMemo]: (_event, id, patch) =>
      services.updateMemo(id as string, patch as MemoPatch),
    [IPC_CHANNELS.deleteMemo]: (_event, id) =>
      services.deleteMemo(id as string),
    [IPC_CHANNELS.acknowledge]: (_event, key) =>
      services.acknowledge(key as string),
    [IPC_CHANNELS.triggerDemo]: (_event, kind) =>
      services.triggerDemo(kind as DemoEventKind),
    [IPC_CHANNELS.hideAll]: () => services.hideAll(),
    [IPC_CHANNELS.showWorkstation]: () => services.showWorkstation(),
  }

  for (const channel of GONGYOU_INVOKE_CHANNELS) {
    ipc.handle(channel, handlers[channel])
  }

  return () => {
    for (const channel of GONGYOU_INVOKE_CHANNELS) {
      ipc.removeHandler(channel)
    }
  }
}
