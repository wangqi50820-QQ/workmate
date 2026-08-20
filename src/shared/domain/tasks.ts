import { z } from 'zod'
import {
  CheckInSchema,
  MemoSchema,
  type CheckIn,
  type Memo,
} from './config'

const checkInTextSchema = z.string().trim().min(1).max(80)
const memoTextSchema = z.string().trim().min(1).max(200)
const reminderSchema = z.string().datetime()

const memoInputSchema = z.object({
  text: memoTextSchema,
  remindAt: reminderSchema.nullable().optional(),
})

export interface MemoInput {
  text: string
  remindAt?: string | null
}

export interface MemoPatch {
  text?: string
  remindAt?: string | null
  completed?: boolean
}

export function createCheckIn(text: string, now: Date): CheckIn {
  return CheckInSchema.parse({
    id: crypto.randomUUID(),
    text: checkInTextSchema.parse(text),
    createdAt: now.toISOString(),
  })
}

export function createMemo(input: MemoInput, now: Date): Memo {
  const validated = memoInputSchema.parse(input)
  const createdAt = now.toISOString()

  return MemoSchema.parse({
    id: crypto.randomUUID(),
    text: validated.text,
    remindAt: validated.remindAt ?? null,
    completedAt: null,
    createdAt,
    updatedAt: createdAt,
  })
}

export function updateMemo(
  memo: Memo,
  patch: MemoPatch,
  now: Date,
): Memo {
  const text =
    patch.text === undefined ? memo.text : memoTextSchema.parse(patch.text)
  const remindAt =
    patch.remindAt === undefined
      ? memo.remindAt
      : patch.remindAt === null
        ? null
        : reminderSchema.parse(patch.remindAt)
  const updatedAt = now.toISOString()
  let completedAt = memo.completedAt

  if (patch.completed === true && completedAt === null) {
    completedAt = updatedAt
  } else if (patch.completed === false) {
    completedAt = null
  }

  return MemoSchema.parse({
    ...memo,
    text,
    remindAt,
    completedAt,
    updatedAt,
  })
}
