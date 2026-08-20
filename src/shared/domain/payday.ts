const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

const assertPayday = (payday: number): void => {
  if (!Number.isInteger(payday) || payday < 1 || payday > 31) {
    throw new RangeError('发薪日必须是 1 到 31 之间的整数')
  }
}

const paydayInMonth = (year: number, month: number, payday: number): Date => {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(payday, daysInMonth))
}

export function resolveNextPayday(payday: number, now: Date): Date {
  assertPayday(payday)

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const thisMonth = paydayInMonth(
    now.getFullYear(),
    now.getMonth(),
    payday,
  )

  if (today.getTime() <= thisMonth.getTime()) {
    return thisMonth
  }

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return paydayInMonth(
    nextMonth.getFullYear(),
    nextMonth.getMonth(),
    payday,
  )
}

export function daysUntilPayday(payday: number, now: Date): number {
  const target = resolveNextPayday(payday, now)
  const todayBoundary = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )
  const targetBoundary = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  )

  return Math.round(
    (targetBoundary - todayBoundary) / MILLISECONDS_PER_DAY,
  )
}
