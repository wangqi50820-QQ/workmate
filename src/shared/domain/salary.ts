import type { AppConfig } from './config'

export type SalaryPhase =
  | 'before-work'
  | 'working'
  | 'lunch'
  | 'after-work'
  | 'rest-day'

export interface SalarySnapshot {
  earnedToday: number
  expectedToday: number
  workingProgress: number
  secondsUntilWorkEnd: number
  phase: SalaryPhase
}

const secondsAt = (value: string): number => {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 * 60 + minutes * 60
}

const secondsBetween = (start: string, end: string): number =>
  secondsAt(end) - secondsAt(start)

const roundMoney = (value: number): number => Math.round(value * 100) / 100

export function countScheduledWorkdays(
  year: number,
  month: number,
  weekdays: number[],
): number {
  const selected = new Set(weekdays)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let total = 0

  for (let day = 1; day <= daysInMonth; day += 1) {
    if (selected.has(new Date(year, month, day).getDay())) {
      total += 1
    }
  }

  return total
}

export function calculateSalarySnapshot(
  config: AppConfig,
  now: Date,
): SalarySnapshot {
  if (!config.weekdays.includes(now.getDay())) {
    return {
      earnedToday: 0,
      expectedToday: 0,
      workingProgress: 0,
      secondsUntilWorkEnd: 0,
      phase: 'rest-day',
    }
  }

  const scheduledWorkdays = countScheduledWorkdays(
    now.getFullYear(),
    now.getMonth(),
    config.weekdays,
  )
  const dailyPay = config.monthlySalary / scheduledWorkdays
  const morningSeconds = secondsBetween(config.workStart, config.lunchStart)
  const afternoonSeconds = secondsBetween(config.lunchEnd, config.workEnd)
  const expectedSeconds = morningSeconds + afternoonSeconds
  const currentSeconds =
    now.getHours() * 60 * 60 +
    now.getMinutes() * 60 +
    now.getSeconds() +
    now.getMilliseconds() / 1000
  const workStart = secondsAt(config.workStart)
  const lunchStart = secondsAt(config.lunchStart)
  const lunchEnd = secondsAt(config.lunchEnd)
  const workEnd = secondsAt(config.workEnd)

  let phase: SalaryPhase
  let elapsedEffectiveSeconds: number

  if (currentSeconds < workStart) {
    phase = 'before-work'
    elapsedEffectiveSeconds = 0
  } else if (currentSeconds < lunchStart) {
    phase = 'working'
    elapsedEffectiveSeconds = currentSeconds - workStart
  } else if (currentSeconds < lunchEnd) {
    phase = 'lunch'
    elapsedEffectiveSeconds = morningSeconds
  } else if (currentSeconds < workEnd) {
    phase = 'working'
    elapsedEffectiveSeconds =
      morningSeconds + currentSeconds - lunchEnd
  } else {
    phase = 'after-work'
    elapsedEffectiveSeconds = expectedSeconds
  }

  const clampedElapsed = Math.min(
    expectedSeconds,
    Math.max(0, elapsedEffectiveSeconds),
  )
  const progress = clampedElapsed / expectedSeconds

  return {
    earnedToday: roundMoney(dailyPay * progress),
    expectedToday: roundMoney(dailyPay),
    workingProgress: progress,
    secondsUntilWorkEnd: Math.max(0, Math.ceil(workEnd - currentSeconds)),
    phase,
  }
}
