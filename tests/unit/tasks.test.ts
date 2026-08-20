import { describe, expect, it } from 'vitest'
import {
  createCheckIn,
  createMemo,
  updateMemo,
} from '../../src/shared/domain/tasks'

const now = new Date('2026-08-20T09:30:00.000Z')

describe('small-win check-ins', () => {
  it('trims and records text between 1 and 80 characters', () => {
    const checkIn = createCheckIn('  把日报写完了  ', now)

    expect(checkIn.text).toBe('把日报写完了')
    expect(checkIn.createdAt).toBe('2026-08-20T09:30:00.000Z')
    expect(checkIn.id.length).toBeGreaterThan(0)
  })

  it.each(['   ', '完'.repeat(81)])('rejects invalid check-in text', (text) => {
    expect(() => createCheckIn(text, now)).toThrow()
  })
})

describe('memos', () => {
  it('creates a trimmed memo with an optional ISO reminder', () => {
    const memo = createMemo(
      {
        text: '  下午给客户回电话  ',
        remindAt: '2026-08-20T10:30:00.000Z',
      },
      now,
    )

    expect(memo.text).toBe('下午给客户回电话')
    expect(memo.remindAt).toBe('2026-08-20T10:30:00.000Z')
    expect(memo.completedAt).toBeNull()
  })

  it.each([
    { text: '   ' },
    { text: '事'.repeat(201) },
    { text: '开会', remindAt: 'tomorrow morning' },
  ])('rejects malformed memo input', (input) => {
    expect(() => createMemo(input, now)).toThrow()
  })

  it('updates content and completion using the supplied clock', () => {
    const memo = createMemo({ text: '写方案' }, now)
    const updated = updateMemo(
      memo,
      { text: '  写完方案  ', completed: true },
      new Date('2026-08-20T10:00:00.000Z'),
    )

    expect(updated.text).toBe('写完方案')
    expect(updated.completedAt).toBe('2026-08-20T10:00:00.000Z')
    expect(updated.updatedAt).toBe('2026-08-20T10:00:00.000Z')
  })
})
