import { describe, expect, it } from 'vitest'
import type { AppConfig } from '../../src/shared/contracts'
import { calculateSalarySnapshot } from '../../src/shared/domain/salary'

const maySchedule: AppConfig = {
  onboardingComplete: true,
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
}

describe('live salary snapshot', () => {
  it('earns nothing before work starts', () => {
    const snapshot = calculateSalarySnapshot(
      maySchedule,
      new Date(2026, 4, 4, 8, 30),
    )

    expect(snapshot.phase).toBe('before-work')
    expect(snapshot.earnedToday).toBeCloseTo(0, 6)
    expect(snapshot.workingProgress).toBeCloseTo(0, 6)
  })

  it('earns exactly one effective hour by 10:00', () => {
    const snapshot = calculateSalarySnapshot(
      maySchedule,
      new Date(2026, 4, 4, 10, 0),
    )

    expect(snapshot.phase).toBe('working')
    expect(snapshot.expectedToday).toBeCloseTo(476.19, 6)
    expect(snapshot.earnedToday).toBeCloseTo(59.52, 6)
    expect(snapshot.workingProgress).toBeCloseTo(0.125, 6)
    expect(snapshot.secondsUntilWorkEnd).toBe(8.5 * 60 * 60)
  })

  it('does not add income during lunch', () => {
    const lunchStart = calculateSalarySnapshot(
      maySchedule,
      new Date(2026, 4, 4, 12, 30),
    )
    const lunchEnd = calculateSalarySnapshot(
      maySchedule,
      new Date(2026, 4, 4, 13, 15),
    )

    expect(lunchStart.phase).toBe('lunch')
    expect(lunchEnd.phase).toBe('lunch')
    expect(lunchStart.earnedToday).toBeCloseTo(178.57, 6)
    expect(lunchEnd.earnedToday).toBeCloseTo(178.57, 6)
  })

  it('caps the day at the expected salary after work', () => {
    const snapshot = calculateSalarySnapshot(
      maySchedule,
      new Date(2026, 4, 4, 20, 0),
    )

    expect(snapshot.phase).toBe('after-work')
    expect(snapshot.earnedToday).toBeCloseTo(476.19, 6)
    expect(snapshot.earnedToday).toBe(snapshot.expectedToday)
    expect(snapshot.workingProgress).toBeCloseTo(1, 6)
    expect(snapshot.secondsUntilWorkEnd).toBe(0)
  })

  it('earns nothing on an unselected Saturday', () => {
    const snapshot = calculateSalarySnapshot(
      maySchedule,
      new Date(2026, 4, 9, 10, 0),
    )

    expect(snapshot.phase).toBe('rest-day')
    expect(snapshot.earnedToday).toBeCloseTo(0, 6)
    expect(snapshot.expectedToday).toBeCloseTo(0, 6)
    expect(snapshot.secondsUntilWorkEnd).toBe(0)
  })
})
