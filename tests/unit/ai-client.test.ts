import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAiClient } from '../../src/main/ai-client'
import type { MemoryEntry } from '../../src/shared/contracts'

const relatedMemory: MemoryEntry = {
  id: 'memory-1',
  userText: '昨天也被临时改稿',
  reply: '这确实很消耗人。',
  createdAt: '2026-08-19T09:00:00.000Z',
  mentionedAt: null,
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.useRealTimers()
})

describe('empathetic AI client', () => {
  it('returns a cleaned OpenAI-compatible response with limited context', async () => {
    const fetchImpl = vi.fn<typeof fetch>(async (_input, init) => {
      const body = JSON.parse(String(init?.body))
      expect(body.messages).toHaveLength(2)
      expect(body.messages[0].content).toContain('嘴硬心软的老友')
      expect(body.messages[1].content).toContain('方案又被改了')
      expect(body.messages[1].content).toContain('昨天也被临时改稿')

      return jsonResponse({
        choices: [
          {
            message: {
              content:
                '听着就够累的。先别急着怪自己。今晚先让脑子歇一会儿。明天再处理。',
            },
          },
        ],
      })
    })
    const client = createAiClient({
      apiKey: 'test-key',
      fetchImpl,
    })

    const result = await client.respond({
      statement: '方案又被改了',
      memory: relatedMemory,
    })

    expect(result).toEqual({
      text: '听着就够累的。先别急着怪自己。今晚先让脑子歇一会儿。',
      source: 'remote',
      memoryId: 'memory-1',
    })
  })

  it.each([
    ['HTTP 429', () => jsonResponse({ error: 'rate limited' }, 429)],
    [
      'empty content',
      () => jsonResponse({ choices: [{ message: { content: '   ' } }] }),
    ],
  ])('falls back for %s', async (_label, makeResponse) => {
    const client = createAiClient({
      apiKey: 'test-key',
      fetchImpl: vi.fn<typeof fetch>(async () => makeResponse()),
    })

    const result = await client.respond({ statement: '今天加班到很晚' })

    expect(result.source).toBe('fallback')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('aborts the remote call after eight seconds and falls back', async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn<typeof fetch>(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        }),
    )
    const client = createAiClient({ apiKey: 'test-key', fetchImpl })

    const response = client.respond({ statement: '今天真的很疲惫' })
    await vi.advanceTimersByTimeAsync(8000)
    const result = await response

    expect(result.source).toBe('fallback')
    expect(result.text.length).toBeGreaterThan(0)
  })

  it('uses local fallback without a network call when no key is set', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
    const client = createAiClient({ fetchImpl })

    const result = await client.respond({ statement: '今天有点生气' })

    expect(result.source).toBe('fallback')
    expect(result.text.length).toBeGreaterThan(0)
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
