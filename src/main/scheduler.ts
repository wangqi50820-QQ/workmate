import type { AppSnapshot } from '../shared/contracts'
import { reduceFocus } from '../shared/domain/focus'
import { selectProactiveMemory } from '../shared/domain/memory'
import { daysUntilPayday, resolveNextPayday } from '../shared/domain/payday'
import {
  selectReminderEvent,
  type BodyReminder,
  type ReminderEvent,
  type SalaryReminder,
} from '../shared/domain/reminders'
import { calculateSalarySnapshot } from '../shared/domain/salary'
import type { JsonStore } from './storage'

export interface Scheduler {
  start(): void
  stop(): void
  tick(): Promise<void>
}

export interface SchedulerOptions {
  store: JsonStore
  now?: () => Date
  publish: (snapshot: AppSnapshot) => void
  routeReminder: (event: ReminderEvent) => void
}

const bodyReminder = (
  startedAt: string,
  intervalMinutes: number,
  now: Date,
): BodyReminder | null => {
  if (intervalMinutes === 0) {
    return null
  }

  return {
    startedAt,
    due:
      now.getTime() - Date.parse(startedAt) >= intervalMinutes * 60 * 1000,
  }
}

const localDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const salaryReminder = (
  now: Date,
  intervalMinutes: number,
  earnedToday: number,
): SalaryReminder | null => {
  if (
    intervalMinutes === 0 ||
    now.getSeconds() !== 0 ||
    Math.floor(now.getTime() / (60 * 1000)) % intervalMinutes !== 0
  ) {
    return null
  }

  const minuteKey = now.toISOString().slice(0, 16)
  return {
    key: `salary:${minuteKey}`,
    message: `今天已经稳稳挣到 ¥${earnedToday.toFixed(2)}。`,
  }
}

export function createScheduler(options: SchedulerOptions): Scheduler {
  const readNow = options.now ?? (() => new Date())
  let timer: ReturnType<typeof setInterval> | null = null
  let reconciling = false

  const tick = async (): Promise<void> => {
    if (reconciling) {
      return
    }

    reconciling = true
    try {
      const now = readNow()
      let state = await options.store.read()
      const reconciledFocus = reduceFocus(state.focus, { type: 'tick' }, now)

      if (reconciledFocus !== state.focus) {
        state = await options.store.update((draft) => {
          draft.focus = reconciledFocus
          return draft
        })
      }

      const salary = calculateSalarySnapshot(state.config, now)
      const nextPayday = resolveNextPayday(state.config.payday, now)
      const paydayDays = daysUntilPayday(state.config.payday, now)
      const proactiveMemory = selectProactiveMemory(state.memories, now)
      const activeReminder = selectReminderEvent({
        now,
        memos: state.memos,
        memories: proactiveMemory ? [proactiveMemory] : [],
        acknowledgedKeys: state.acknowledged.emittedKeys,
        payday: {
          due: paydayDays === 0,
          date: localDateKey(nextPayday),
        },
        offWork: {
          due: salary.phase === 'after-work',
          date: localDateKey(now),
        },
        sedentary: bodyReminder(
          state.acknowledged.sedentaryStartedAt,
          state.config.sedentaryMinutes,
          now,
        ),
        water: bodyReminder(
          state.acknowledged.waterStartedAt,
          state.config.waterMinutes,
          now,
        ),
        salary: salaryReminder(
          now,
          state.config.broadcastMinutes,
          salary.earnedToday,
        ),
      })

      if (activeReminder) {
        state = await options.store.update((draft) => {
          if (!draft.acknowledged.emittedKeys.includes(activeReminder.key)) {
            draft.acknowledged.emittedKeys.push(activeReminder.key)
          }
          return draft
        })
      }

      const snapshot: AppSnapshot = {
        ...state,
        generatedAt: now.toISOString(),
        salary,
        nextPayday: nextPayday.toISOString(),
        daysUntilPayday: paydayDays,
        activeReminder,
      }

      options.publish(snapshot)
      if (activeReminder) {
        options.routeReminder(activeReminder)
      }
    } finally {
      reconciling = false
    }
  }

  return {
    start: () => {
      if (timer !== null) {
        return
      }
      timer = setInterval(() => void tick(), 1000)
    },
    stop: () => {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
    },
    tick,
  }
}
