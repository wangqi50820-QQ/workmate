import type { AppConfig, AppState } from './domain/config'

export type {
  AppConfig,
  AppState,
  CheckIn,
  FocusState,
  Memo,
  MemoryEntry,
  ReminderAcknowledgements,
} from './domain/config'

export type AppSnapshot = AppState

export interface GongyouApi {
  getSnapshot(): Promise<AppSnapshot>
  updateConfig(patch: Partial<AppConfig>): Promise<AppSnapshot>
  hideAll(): Promise<void>
  showWorkstation(): Promise<void>
  subscribe(listener: (snapshot: AppSnapshot) => void): () => void
}

declare global {
  interface Window {
    gongyou: GongyouApi
  }
}
