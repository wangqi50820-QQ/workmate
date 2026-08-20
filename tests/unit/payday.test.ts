import { describe, expect, it } from 'vitest'
import {
  daysUntilPayday,
  resolveNextPayday,
} from '../../src/shared/domain/payday'

describe('next payday', () => {
  it('uses this month when the payday has not arrived', () => {
    expect(resolveNextPayday(10, new Date(2026, 7, 9, 16, 0))).toEqual(
      new Date(2026, 7, 10),
    )
    expect(daysUntilPayday(10, new Date(2026, 7, 9, 16, 0))).toBe(1)
  })

  it('uses next month when this payday has passed', () => {
    expect(resolveNextPayday(10, new Date(2026, 7, 11, 9, 0))).toEqual(
      new Date(2026, 8, 10),
    )
    expect(daysUntilPayday(10, new Date(2026, 7, 11, 9, 0))).toBe(30)
  })

  it('clamps day 31 to February 28 in a common year', () => {
    expect(resolveNextPayday(31, new Date(2027, 1, 2, 9, 0))).toEqual(
      new Date(2027, 1, 28),
    )
  })

  it('clamps day 31 to February 29 in a leap year', () => {
    expect(resolveNextPayday(31, new Date(2028, 1, 2, 9, 0))).toEqual(
      new Date(2028, 1, 29),
    )
  })

  it('keeps a Saturday payday on Saturday', () => {
    const payday = resolveNextPayday(1, new Date(2026, 6, 31, 9, 0))

    expect(payday).toEqual(new Date(2026, 7, 1))
    expect(payday.getDay()).toBe(6)
  })

  it('returns zero throughout payday itself', () => {
    expect(daysUntilPayday(10, new Date(2026, 7, 10, 23, 59))).toBe(0)
  })
})
