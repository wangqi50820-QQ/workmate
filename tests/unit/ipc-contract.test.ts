import { describe, expect, it } from 'vitest'
import { registerIpcHandlers } from '../../src/main/ipc'
import {
  GONGYOU_INVOKE_CHANNELS,
  IPC_CHANNELS,
} from '../../src/shared/contracts'

const notInvoked = async (): Promise<never> => {
  throw new Error('Contract test handlers must not be invoked')
}

describe('preload to main IPC contract', () => {
  it('registers a main handler for every allowlisted invocation', () => {
    const registered = new Map<string, (...args: unknown[]) => unknown>()
    const ipc = {
      handle: (channel: string, listener: (...args: unknown[]) => unknown) => {
        registered.set(channel, listener)
      },
      removeHandler: (channel: string) => {
        registered.delete(channel)
      },
    }

    registerIpcHandlers(ipc, {
      getSnapshot: notInvoked,
      updateConfig: notInvoked,
      setAiSession: notInvoked,
      submitTreeHole: notInvoked,
      deleteMemory: notInvoked,
      clearMemories: notInvoked,
      dispatchFocus: notInvoked,
      createCheckIn: notInvoked,
      createMemo: notInvoked,
      updateMemo: notInvoked,
      deleteMemo: notInvoked,
      acknowledge: notInvoked,
      triggerDemo: notInvoked,
      hideAll: notInvoked,
      showWorkstation: notInvoked,
    })

    expect([...registered.keys()].sort()).toEqual(
      [...GONGYOU_INVOKE_CHANNELS].sort(),
    )
    expect(IPC_CHANNELS.snapshot).toBe('gongyou:snapshot')
    expect(GONGYOU_INVOKE_CHANNELS).not.toContain(IPC_CHANNELS.snapshot)
  })
})
