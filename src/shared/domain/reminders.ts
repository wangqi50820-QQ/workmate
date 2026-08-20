import type { Memo, MemoryEntry } from './config'

export type ReminderKind =
  | 'memo'
  | 'payday'
  | 'off-work'
  | 'sedentary'
  | 'water'
  | 'memory'
  | 'salary'

export interface ReminderEvent {
  key: string
  kind: ReminderKind
  title: string
  message: string
}

export interface CalendarReminder {
  due: boolean
  date: string
}

export interface BodyReminder {
  due: boolean
  startedAt: string
}

export interface SalaryReminder {
  key: string
  message: string
}

export interface ReminderContext {
  now: Date
  memos: Memo[]
  memories: MemoryEntry[]
  acknowledgedKeys: string[]
  payday: CalendarReminder | null
  offWork: CalendarReminder | null
  sedentary: BodyReminder | null
  water: BodyReminder | null
  salary: SalaryReminder | null
}

const isUnacknowledged = (key: string, acknowledged: Set<string>): boolean =>
  !acknowledged.has(key)

export function selectReminderEvent(
  context: ReminderContext,
): ReminderEvent | null {
  const acknowledged = new Set(context.acknowledgedKeys)
  const nowTime = context.now.getTime()
  const dueMemo = context.memos
    .filter(
      (memo) =>
        memo.completedAt === null &&
        memo.remindAt !== null &&
        Date.parse(memo.remindAt) <= nowTime &&
        isUnacknowledged(`memo:${memo.id}`, acknowledged),
    )
    .sort((left, right) =>
      (left.remindAt ?? '').localeCompare(right.remindAt ?? ''),
    )[0]

  if (dueMemo) {
    return {
      key: `memo:${dueMemo.id}`,
      kind: 'memo',
      title: '便签到点了',
      message: dueMemo.text,
    }
  }

  if (context.payday?.due) {
    const key = `payday:${context.payday.date}`
    if (isUnacknowledged(key, acknowledged)) {
      return {
        key,
        kind: 'payday',
        title: '工资到账日',
        message: '今天是发薪日，辛苦挣来的钱来报到了。',
      }
    }
  }

  if (context.offWork?.due) {
    const key = `off-work:${context.offWork.date}`
    if (isUnacknowledged(key, acknowledged)) {
      return {
        key,
        kind: 'off-work',
        title: '到站，下班',
        message: '今天的工先打到这里，剩下的明天再说。',
      }
    }
  }

  if (context.sedentary?.due) {
    const key = `sedentary:${context.sedentary.startedAt}`
    if (isUnacknowledged(key, acknowledged)) {
      return {
        key,
        kind: 'sedentary',
        title: '起来走两步',
        message: '工位不会跑，腰得自己照顾。',
      }
    }
  }

  if (context.water?.due) {
    const key = `water:${context.water.startedAt}`
    if (isUnacknowledged(key, acknowledged)) {
      return {
        key,
        kind: 'water',
        title: '喝口水',
        message: '先补一口水，再接着忙。',
      }
    }
  }

  const memory = context.memories
    .filter(
      (entry) =>
        entry.mentionedAt === null &&
        isUnacknowledged(`memory:${entry.id}`, acknowledged),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0]

  if (memory) {
    return {
      key: `memory:${memory.id}`,
      kind: 'memory',
      title: '工友还记得',
      message: `昨天那件“${memory.userText}”，后来怎么样了？`,
    }
  }

  if (
    context.salary &&
    isUnacknowledged(context.salary.key, acknowledged)
  ) {
    return {
      key: context.salary.key,
      kind: 'salary',
      title: '今日工钱进度',
      message: context.salary.message,
    }
  }

  return null
}
