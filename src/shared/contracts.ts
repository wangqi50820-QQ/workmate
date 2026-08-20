import type { AppConfig, AppState, MemoryEntry } from './domain/config'
import type { FocusEvent } from './domain/focus'
import type { ReminderEvent } from './domain/reminders'
import type { SalarySnapshot } from './domain/salary'
import type { MemoInput, MemoPatch } from './domain/tasks'

export type {
  AppConfig,
  AppState,
  CheckIn,
  FocusState,
  Memo,
  MemoryEntry,
  ReminderAcknowledgements,
} from './domain/config'

export type AppSnapshot = AppState & {
  generatedAt: string
  salary: SalarySnapshot
  nextPayday: string
  daysUntilPayday: number
  activeReminder: ReminderEvent | null
}

export interface AiSessionConfig {
  baseUrl: string
  model: string
  apiKey: string
}

export interface EmpathyRequest {
  statement: string
  memory?: MemoryEntry
}

export interface EmpathyResult {
  text: string
  source: 'remote' | 'fallback'
  memoryId?: string
}

export type DemoEventKind =
  | 'broadcast'
  | 'sedentary'
  | 'water'
  | 'off-work'
  | 'payday'

export const IPC_CHANNELS = {
  getSnapshot: 'gongyou:get-snapshot',
  updateConfig: 'gongyou:update-config',
  setAiSession: 'gongyou:set-ai-session',
  submitTreeHole: 'gongyou:submit-tree-hole',
  deleteMemory: 'gongyou:delete-memory',
  clearMemories: 'gongyou:clear-memories',
  dispatchFocus: 'gongyou:dispatch-focus',
  createCheckIn: 'gongyou:create-check-in',
  createMemo: 'gongyou:create-memo',
  updateMemo: 'gongyou:update-memo',
  deleteMemo: 'gongyou:delete-memo',
  acknowledge: 'gongyou:acknowledge',
  triggerDemo: 'gongyou:trigger-demo',
  hideAll: 'gongyou:hide-all',
  showWorkstation: 'gongyou:show-workstation',
  snapshot: 'gongyou:snapshot',
} as const

export const GONGYOU_INVOKE_CHANNELS = [
  IPC_CHANNELS.getSnapshot,
  IPC_CHANNELS.updateConfig,
  IPC_CHANNELS.setAiSession,
  IPC_CHANNELS.submitTreeHole,
  IPC_CHANNELS.deleteMemory,
  IPC_CHANNELS.clearMemories,
  IPC_CHANNELS.dispatchFocus,
  IPC_CHANNELS.createCheckIn,
  IPC_CHANNELS.createMemo,
  IPC_CHANNELS.updateMemo,
  IPC_CHANNELS.deleteMemo,
  IPC_CHANNELS.acknowledge,
  IPC_CHANNELS.triggerDemo,
  IPC_CHANNELS.hideAll,
  IPC_CHANNELS.showWorkstation,
] as const

export interface GongyouApi {
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
  subscribe(listener: (snapshot: AppSnapshot) => void): () => void
}

declare global {
  interface Window {
    gongyou: GongyouApi
  }
}
