import { describe, expect, it } from 'vitest'
import {
  defaultAppState,
  validateConfig,
} from '../../src/shared/domain/config'

const validConfig = {
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

describe('app configuration', () => {
  it('rejects a payday outside 1 through 31', () => {
    expect(() => validateConfig({ ...validConfig, payday: 32 })).toThrow()
  })

  it('rejects a schedule whose lunch consumes the workday', () => {
    expect(() =>
      validateConfig({
        ...validConfig,
        workStart: '09:00',
        lunchStart: '09:30',
        lunchEnd: '18:00',
        workEnd: '18:00',
      }),
    ).toThrow()
  })

  it('creates stable first-run defaults', () => {
    const state = defaultAppState(new Date('2026-08-20T08:00:00.000Z'))

    expect(state.config).toEqual({
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
    })
    expect(state.acknowledged).toEqual({
      sedentaryStartedAt: '2026-08-20T08:00:00.000Z',
      waterStartedAt: '2026-08-20T08:00:00.000Z',
      emittedKeys: [],
    })
  })
})
