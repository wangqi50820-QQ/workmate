import { describe, expect, it } from 'vitest'
import type { MemoryEntry } from '../../src/shared/contracts'
import {
  createMemory,
  markMemoryMentioned,
  selectProactiveMemory,
} from '../../src/shared/domain/memory'

const memory = (
  id: string,
  createdAt: string,
  mentionedAt: string | null = null,
): MemoryEntry => ({
  id,
  userText: `${id} 的烦心事`,
  reply: '工友听见了。',
  createdAt,
  mentionedAt,
})

describe('local memory bottle', () => {
  it('normalizes and validates a new memory', () => {
    const entry = createMemory(
      '  方案\n又被改了   五版  ',
      '  这确实够磨人。  ',
      new Date('2026-08-20T09:00:00.000Z'),
    )

    expect(entry.userText).toBe('方案 又被改了 五版')
    expect(entry.reply).toBe('这确实够磨人。')
    expect(entry.createdAt).toBe('2026-08-20T09:00:00.000Z')
    expect(entry.mentionedAt).toBeNull()
  })

  it.each([
    ['', '收到。'],
    ['事'.repeat(1001), '收到。'],
    ['今天好累', '话'.repeat(501)],
  ])('rejects invalid memory content', (userText, reply) => {
    expect(() =>
      createMemory(userText, reply, new Date('2026-08-20T09:00:00.000Z')),
    ).toThrow()
  })

  it('chooses the newest unmentioned memory from the last seven days', () => {
    const now = new Date('2026-08-20T12:00:00.000Z')
    const selected = selectProactiveMemory(
      [
        memory('old', '2026-08-10T09:00:00.000Z'),
        memory(
          'mentioned',
          '2026-08-20T10:00:00.000Z',
          '2026-08-20T11:00:00.000Z',
        ),
        memory('recent', '2026-08-18T09:00:00.000Z'),
        memory('newest', '2026-08-19T09:00:00.000Z'),
      ],
      now,
    )

    expect(selected?.id).toBe('newest')
  })

  it('returns null when every memory is old or already mentioned', () => {
    const selected = selectProactiveMemory(
      [
        memory('old', '2026-08-10T09:00:00.000Z'),
        memory(
          'mentioned',
          '2026-08-20T10:00:00.000Z',
          '2026-08-20T11:00:00.000Z',
        ),
      ],
      new Date('2026-08-20T12:00:00.000Z'),
    )

    expect(selected).toBeNull()
  })

  it('marks a selected memory with a persistent mention timestamp', () => {
    const entry = memory('recent', '2026-08-19T09:00:00.000Z')
    const marked = markMemoryMentioned(
      entry,
      new Date('2026-08-20T12:00:00.000Z'),
    )

    expect(marked.mentionedAt).toBe('2026-08-20T12:00:00.000Z')
    expect(entry.mentionedAt).toBeNull()
  })
})
