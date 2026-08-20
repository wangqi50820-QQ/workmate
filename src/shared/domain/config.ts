import { z } from 'zod'

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '时间必须使用 HH:mm 格式')

const minutesSinceMidnight = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export const AppConfigSchema = z
  .object({
    onboardingComplete: z.boolean(),
    monthlySalary: z.number().finite().positive(),
    payday: z.number().int().min(1).max(31),
    weekdays: z
      .array(z.number().int().min(0).max(6))
      .min(1)
      .refine((days) => new Set(days).size === days.length, {
        message: '工作日不能重复',
      }),
    workStart: timeSchema,
    lunchStart: timeSchema,
    lunchEnd: timeSchema,
    workEnd: timeSchema,
    sedentaryMinutes: z.number().int().min(0).max(24 * 60),
    waterMinutes: z.number().int().min(0).max(24 * 60),
    broadcastMinutes: z.number().int().min(0).max(24 * 60),
    alwaysOnTop: z.boolean(),
    meetingMode: z.boolean(),
    globalShortcut: z.string().trim().min(1),
  })
  .superRefine((config, context) => {
    const workStart = minutesSinceMidnight(config.workStart)
    const lunchStart = minutesSinceMidnight(config.lunchStart)
    const lunchEnd = minutesSinceMidnight(config.lunchEnd)
    const workEnd = minutesSinceMidnight(config.workEnd)

    if (!(
      workStart < lunchStart &&
      lunchStart < lunchEnd &&
      lunchEnd < workEnd
    )) {
      context.addIssue({
        code: 'custom',
        path: ['workEnd'],
        message: '工作和午休时间必须按先后顺序排列',
      })
    }
  })

export const MemoryEntrySchema = z.object({
  id: z.string().min(1),
  userText: z.string().min(1),
  reply: z.string().min(1),
  createdAt: z.string().datetime(),
  mentionedAt: z.string().datetime().nullable(),
})

export const CheckInSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(80),
  createdAt: z.string().datetime(),
})

export const MemoSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(200),
  remindAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const FocusStateSchema = z.object({
  phase: z.enum(['idle', 'focus', 'paused', 'break', 'complete']),
  sessionSeconds: z.number().int().positive(),
  breakSeconds: z.number().int().positive(),
  remainingSeconds: z.number().int().nonnegative(),
  endsAt: z.string().datetime().nullable(),
  completedSessions: z.number().int().nonnegative(),
})

export const ReminderAcknowledgementsSchema = z.object({
  sedentaryStartedAt: z.string().datetime(),
  waterStartedAt: z.string().datetime(),
  emittedKeys: z.array(z.string()),
})

export const AppStateSchema = z.object({
  schemaVersion: z.literal(1),
  config: AppConfigSchema,
  memories: z.array(MemoryEntrySchema),
  checkIns: z.array(CheckInSchema),
  memos: z.array(MemoSchema),
  focus: FocusStateSchema,
  acknowledged: ReminderAcknowledgementsSchema,
})

export type AppConfig = z.infer<typeof AppConfigSchema>
export type AppState = z.infer<typeof AppStateSchema>
export type MemoryEntry = z.infer<typeof MemoryEntrySchema>
export type CheckIn = z.infer<typeof CheckInSchema>
export type Memo = z.infer<typeof MemoSchema>
export type FocusState = z.infer<typeof FocusStateSchema>
export type ReminderAcknowledgements = z.infer<
  typeof ReminderAcknowledgementsSchema
>

export function validateConfig(input: unknown): AppConfig {
  return AppConfigSchema.parse(input)
}

export function defaultAppState(now: Date): AppState {
  const startedAt = now.toISOString()

  return {
    schemaVersion: 1,
    config: {
      onboardingComplete: false,
      monthlySalary: 10000,
      payday: 10,
      weekdays: [1, 2, 3, 4, 5],
      workStart: '09:00',
      lunchStart: '12:00',
      lunchEnd: '13:30',
      workEnd: '18:30',
      sedentaryMinutes: 60,
      waterMinutes: 45,
      broadcastMinutes: 60,
      alwaysOnTop: true,
      meetingMode: false,
      globalShortcut: 'CommandOrControl+Shift+H',
    },
    memories: [],
    checkIns: [],
    memos: [],
    focus: {
      phase: 'idle',
      sessionSeconds: 25 * 60,
      breakSeconds: 5 * 60,
      remainingSeconds: 25 * 60,
      endsAt: null,
      completedSessions: 0,
    },
    acknowledged: {
      sedentaryStartedAt: startedAt,
      waterStartedAt: startedAt,
      emittedKeys: [],
    },
  }
}
