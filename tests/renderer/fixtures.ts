import { vi } from 'vitest'
import type {
  AppConfig,
  AppSnapshot,
  GongyouApi,
} from '../../src/shared/contracts'
import { defaultAppState } from '../../src/shared/domain/config'

export const createSnapshot = (
  configPatch: Partial<AppConfig> = {},
): AppSnapshot => {
  const state = defaultAppState(new Date('2026-08-20T08:00:00.000Z'))

  return {
    ...state,
    config: { ...state.config, ...configPatch },
    generatedAt: '2026-08-20T10:00:00.000Z',
    salary: {
      earnedToday: 126.38,
      expectedToday: 476.19,
      workingProgress: 0.2654,
      secondsUntilWorkEnd: 8.5 * 60 * 60,
      phase: 'working',
    },
    nextPayday: '2026-09-01T16:00:00.000Z',
    daysUntilPayday: 12,
    activeReminder: null,
  }
}

export function createTestApi(initial: AppSnapshot) {
  let current = structuredClone(initial)
  const getSnapshot = vi.fn(async () => structuredClone(current))
  const updateConfig = vi.fn(async (patch: Partial<AppConfig>) => {
    current = {
      ...current,
      config: { ...current.config, ...patch },
    }
    return structuredClone(current)
  })
  const setAiSession = vi.fn(async () => undefined)
  const submitTreeHole = vi.fn(async () => ({
    text: '工友听见了。',
    source: 'fallback' as const,
  }))
  const deleteMemory = vi.fn(async () => structuredClone(current))
  const clearMemories = vi.fn(async () => structuredClone(current))
  const dispatchFocus = vi.fn(async () => structuredClone(current))
  const createCheckIn = vi.fn(async () => structuredClone(current))
  const createMemo = vi.fn(async () => structuredClone(current))
  const updateMemo = vi.fn(async () => structuredClone(current))
  const deleteMemo = vi.fn(async () => structuredClone(current))
  const acknowledge = vi.fn(async () => structuredClone(current))
  const triggerDemo = vi.fn(async () => undefined)
  const hideAll = vi.fn(async () => undefined)
  const showWorkstation = vi.fn(async () => undefined)
  const api: GongyouApi = {
    getSnapshot,
    updateConfig,
    setAiSession,
    submitTreeHole,
    deleteMemory,
    clearMemories,
    dispatchFocus,
    createCheckIn,
    createMemo,
    updateMemo,
    deleteMemo,
    acknowledge,
    triggerDemo,
    hideAll,
    showWorkstation,
    subscribe: () => () => undefined,
  }

  return {
    api,
    spies: {
      getSnapshot,
      updateConfig,
      setAiSession,
      submitTreeHole,
      deleteMemory,
      clearMemories,
      dispatchFocus,
      createCheckIn,
      createMemo,
      updateMemo,
      deleteMemo,
      acknowledge,
      triggerDemo,
    },
  }
}
