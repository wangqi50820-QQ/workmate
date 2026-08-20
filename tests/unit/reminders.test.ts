import { describe, expect, it } from 'vitest'
import type { Memo, MemoryEntry } from '../../src/shared/contracts'
import {
  selectReminderEvent,
  type ReminderContext,
} from '../../src/shared/domain/reminders'

const overdueMemo: Memo = {
  id: 'memo-1',
  text: '给客户回电话',
  remindAt: '2026-08-20T09:30:00.000Z',
  completedAt: null,
  createdAt: '2026-08-20T08:00:00.000Z',
  updatedAt: '2026-08-20T08:00:00.000Z',
}

const unmentionedMemory: MemoryEntry = {
  id: 'memory-1',
  userText: '方案又被改了',
  reply: '这轮改动确实够磨人。',
  createdAt: '2026-08-19T09:00:00.000Z',
  mentionedAt: null,
}

const createContext = (acknowledgedKeys: string[]): ReminderContext => ({
  now: new Date('2026-08-20T10:00:00.000Z'),
  memos: [overdueMemo],
  memories: [unmentionedMemory],
  acknowledgedKeys,
  payday: null,
  offWork: null,
  sedentary: {
    due: true,
    startedAt: '2026-08-20T08:00:00.000Z',
  },
  water: null,
  salary: null,
})

describe('reminder collision selection', () => {
  it('selects an overdue memo before body care and memory', () => {
    const event = selectReminderEvent(createContext([]))

    expect(event?.kind).toBe('memo')
    expect(event?.key).toBe('memo:memo-1')
  })

  it('selects sedentary care after the memo has been emitted', () => {
    const event = selectReminderEvent(createContext(['memo:memo-1']))

    expect(event?.kind).toBe('sedentary')
    expect(event?.key).toBe(
      'sedentary:2026-08-20T08:00:00.000Z',
    )
  })

  it('does not emit acknowledged events again at the same timestamp', () => {
    const event = selectReminderEvent(
      createContext([
        'memo:memo-1',
        'sedentary:2026-08-20T08:00:00.000Z',
        'memory:memory-1',
      ]),
    )

    expect(event).toBeNull()
  })
})
