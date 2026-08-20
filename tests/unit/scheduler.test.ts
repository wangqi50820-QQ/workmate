import { describe, expect, it } from 'vitest'
import type { JsonStore } from '../../src/main/storage'
import { createScheduler } from '../../src/main/scheduler'
import { defaultAppState, type AppState } from '../../src/shared/domain/config'
import { reduceFocus } from '../../src/shared/domain/focus'

const memoryStore = (initial: AppState) => {
  let state = structuredClone(initial)
  const store: JsonStore = {
    read: async () => structuredClone(state),
    update: async (mutator) => {
      state = mutator(structuredClone(state))
      return structuredClone(state)
    },
  }

  return { store, current: () => structuredClone(state) }
}

describe('absolute-time scheduler reconciliation', () => {
  it('recovers after sleep without salary drift or duplicate focus completion', async () => {
    let now = new Date(2026, 7, 20, 8, 30)
    const initial = defaultAppState(new Date(2026, 7, 20, 8, 0))
    initial.focus = reduceFocus(initial.focus, { type: 'start' }, now)
    initial.memos = [
      {
        id: 'memo-1',
        text: '给客户回电话',
        remindAt: new Date(2026, 7, 20, 9, 30).toISOString(),
        completedAt: null,
        createdAt: new Date(2026, 7, 20, 8, 0).toISOString(),
        updatedAt: new Date(2026, 7, 20, 8, 0).toISOString(),
      },
    ]
    const persistence = memoryStore(initial)
    const snapshots: Array<{ salary: { earnedToday: number } }> = []
    const reminders: Array<{ kind: string; key: string }> = []
    const scheduler = createScheduler({
      store: persistence.store,
      now: () => now,
      publish: (snapshot) => snapshots.push(snapshot),
      routeReminder: (event) => reminders.push(event),
    })

    await scheduler.tick()
    now = new Date(2026, 7, 20, 10, 30)
    await scheduler.tick()

    expect(snapshots[0].salary.earnedToday).toBe(0)
    expect(snapshots[1].salary.earnedToday).toBeGreaterThan(0)
    expect(persistence.current().focus.phase).toBe('complete')
    expect(persistence.current().focus.completedSessions).toBe(1)
    expect(reminders).toHaveLength(1)
    expect(reminders[0]).toMatchObject({
      kind: 'memo',
      key: 'memo:memo-1',
    })
    expect(persistence.current().acknowledged.emittedKeys).toContain(
      'memo:memo-1',
    )
    expect('salary' in persistence.current()).toBe(false)

    await scheduler.tick()
    expect(persistence.current().focus.completedSessions).toBe(1)
  })
})
