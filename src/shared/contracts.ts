export interface AppConfig {
  userName: string
  companionName: string
  payday: number
  monthlySalary: number
}

export interface AppSnapshot {
  config: AppConfig
}

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
