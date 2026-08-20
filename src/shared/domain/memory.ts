import { z } from 'zod'
import { MemoryEntrySchema, type MemoryEntry } from './config'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

const normalizeWhitespace = (value: string): string =>
  value.trim().replace(/\s+/g, ' ')

const normalizedText = (value: string, maximum: number): string =>
  z.string().min(1).max(maximum).parse(normalizeWhitespace(value))

export function createMemory(
  userText: string,
  reply: string,
  now: Date,
): MemoryEntry {
  return MemoryEntrySchema.parse({
    id: crypto.randomUUID(),
    userText: normalizedText(userText, 1000),
    reply: normalizedText(reply, 500),
    createdAt: now.toISOString(),
    mentionedAt: null,
  })
}

export function selectProactiveMemory(
  memories: MemoryEntry[],
  now: Date,
): MemoryEntry | null {
  const nowTime = now.getTime()

  return (
    memories
      .filter((memory) => {
        if (memory.mentionedAt !== null) {
          return false
        }

        const age = nowTime - Date.parse(memory.createdAt)
        return age >= 0 && age <= SEVEN_DAYS_MS
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ??
    null
  )
}

export function markMemoryMentioned(
  memory: MemoryEntry,
  now: Date,
): MemoryEntry {
  return MemoryEntrySchema.parse({
    ...memory,
    mentionedAt: now.toISOString(),
  })
}
